import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rate-limit'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-0-20250514'

const AUDIT_PROMPT = `You are a security auditor for web applications. Analyze this codebase and return a JSON security audit report.

Return ONLY valid JSON in this exact format:
{
  "score": <number 0-100>,
  "grade": "<A|B|C|D|F>",
  "summary": "<2-3 sentence summary of security posture>",
  "findings": [
    {
      "severity": "critical" | "warning" | "info",
      "type": "<e.g. hardcoded-secret, no-auth, sql-injection, xss, insecure-config>",
      "file": "<file path or 'pasted code'>",
      "line": <line number or 0>,
      "description": "<what the issue is>",
      "fix": "<how to fix it>"
    }
  ]
}

Grading scale:
- A (90-100): No critical issues, minimal warnings
- B (70-89): No critical issues, some warnings
- C (50-69): 1-2 critical issues
- D (30-49): Multiple critical issues
- F (0-29): Severe security problems

Focus on: hardcoded secrets, missing auth, injection, XSS, insecure config, missing rate limiting, CORS, insecure data storage.
Return max 15 findings. Return ONLY valid JSON.`

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { success } = rateLimit(`audit-paste:${session.user.id}`, 5, 60 * 1000)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait before starting another audit.' }, { status: 429 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { code, projectName } = body

  if (!code || typeof code !== 'string' || code.trim().length < 20) {
    return NextResponse.json({ error: 'Please paste at least 20 characters of code' }, { status: 400 })
  }

  // Cap code size
  const trimmedCode = code.slice(0, 100000)
  const safeName = typeof projectName === 'string' ? projectName.trim().slice(0, 100) : 'Pasted code'

  // Create audit record
  const { data: audit, error: insertError } = await supabaseAdmin
    .from('audits')
    .insert({
      user_id: session.user.id,
      repo_name: safeName,
      status: 'analyzing',
    })
    .select('id')
    .single()

  if (insertError || !audit) {
    return NextResponse.json({ error: 'Failed to create audit' }, { status: 500 })
  }

  // Run audit in background
  runPasteAudit(audit.id, trimmedCode, safeName).catch(() => {
    supabaseAdmin.from('audits').update({ status: 'error', summary: 'Unexpected error during analysis' }).eq('id', audit.id)
  })

  return NextResponse.json({ auditId: audit.id })
}

async function runPasteAudit(auditId: string, code: string, name: string) {
  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: AUDIT_PROMPT,
      messages: [
        { role: 'user', content: `Audit this codebase (project: ${name}):\n\n${code}` },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'

    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : null
    }

    if (!parsed) {
      await supabaseAdmin.from('audits').update({ status: 'error', summary: 'Failed to parse results' }).eq('id', auditId)
      return
    }

    await supabaseAdmin.from('audits').update({
      status: 'done',
      grade: parsed.grade || 'C',
      score: parsed.score || 50,
      summary: parsed.summary || 'Analysis complete',
    }).eq('id', auditId)

    if (Array.isArray(parsed.findings) && parsed.findings.length > 0) {
      const validSeverities = ['critical', 'warning', 'info']
      const findings = parsed.findings.slice(0, 15).map((f: any) => ({
        audit_id: auditId,
        severity: validSeverities.includes(f.severity) ? f.severity : 'info',
        type: typeof f.type === 'string' ? f.type.slice(0, 100) : 'unknown',
        file: typeof f.file === 'string' ? f.file.slice(0, 500) : null,
        line: typeof f.line === 'number' && f.line >= 0 ? Math.min(f.line, 999999) : null,
        description: typeof f.description === 'string' ? f.description.slice(0, 2000) : '',
        fix: typeof f.fix === 'string' ? f.fix.slice(0, 2000) : null,
      }))
      await supabaseAdmin.from('audit_findings').insert(findings)
    }
  } catch {
    await supabaseAdmin.from('audits').update({
      status: 'error',
      summary: 'An error occurred during analysis. Please try again.',
    }).eq('id', auditId)
  }
}
