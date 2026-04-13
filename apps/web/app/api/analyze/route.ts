import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a production readiness checker for vibe-coded apps. Analyze this codebase and return JSON with:
{
  "issues": [
    {
      "severity": "critical" | "warning",
      "type": string,
      "file": string,
      "line": number,
      "description": string,
      "fix": string
    }
  ]
}

Focus only on:
1. API keys or secrets hardcoded in non-.env files
2. Supabase RLS disabled
3. API endpoints with no auth check
4. Database queries with user input not sanitized

Return max 10 issues. Return ONLY valid JSON, no markdown, no explanation.`

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 10 analysis requests per minute per user
  const { success: withinLimit } = rateLimit(`analyze:${session.user.id}`, 10, 60 * 1000)
  if (!withinLimit) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { code, repoName } = body
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  // Truncate large codebases to avoid token limits
  const truncated = code.length > 80000 ? code.slice(0, 80000) + '\n\n[... truncated ...]' : code

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analyze this codebase (repo: ${typeof repoName === 'string' ? repoName.slice(0, 100) : 'unknown'}):\n\n${truncated}`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'

  let parsed: { issues: any[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Try to extract JSON if model added extra text
    const match = raw.match(/\{[\s\S]*\}/)
    parsed = match ? JSON.parse(match[0]) : { issues: [] }
  }

  return NextResponse.json(parsed)
}
