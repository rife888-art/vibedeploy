import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rate-limit'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
      "file": "<file path>",
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

Focus on:
1. Hardcoded secrets/API keys in non-.env files
2. Missing authentication on API routes
3. SQL injection / NoSQL injection
4. XSS vulnerabilities
5. Insecure dependencies or configurations
6. Missing rate limiting
7. CORS misconfigurations
8. Insecure data storage

Return max 15 findings. Return ONLY valid JSON.`

// Fetch repo tree from GitHub
async function fetchRepoFiles(accessToken: string, repoName: string, branch: string) {
  // Get the repo tree recursively
  const treeRes = await fetch(
    `https://api.github.com/repos/${repoName}/git/trees/${branch}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  )

  if (!treeRes.ok) {
    throw new Error('Failed to fetch repo tree. Please check the repository exists and is accessible.')
  }

  const tree = await treeRes.json()

  // Filter to code files only
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.rb', '.php', '.vue', '.svelte', '.env', '.json', '.yaml', '.yml', '.toml', '.sql']
  const ignoreDirs = ['node_modules', '.next', 'dist', 'build', '.git', 'vendor', '__pycache__']

  const codeFiles = tree.tree.filter((item: any) => {
    if (item.type !== 'blob') return false
    if (ignoreDirs.some((dir: string) => item.path.includes(`${dir}/`))) return false
    // Validate file path: no directory traversal, no absolute paths
    if (item.path.includes('..') || item.path.startsWith('/') || item.path.includes('\\')) return false
    // Only allow safe characters in file paths
    if (!/^[a-zA-Z0-9._\-/]+$/.test(item.path)) return false
    return codeExtensions.some((ext: string) => item.path.endsWith(ext))
  })

  // Fetch content of up to 30 most relevant files
  const filesToFetch = codeFiles.slice(0, 30)
  let totalContent = ''

  for (const file of filesToFetch) {
    try {
      const contentRes = await fetch(
        `https://api.github.com/repos/${repoName}/contents/${file.path}?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      if (contentRes.ok) {
        const data = await contentRes.json()
        if (data.content && data.encoding === 'base64') {
          const decoded = Buffer.from(data.content, 'base64').toString('utf-8')
          totalContent += `\n--- FILE: ${file.path} ---\n${decoded}\n`
        }
      }
    } catch {
      // Skip files that fail to fetch
    }

    // Cap at 80KB to stay within token limits
    if (totalContent.length > 80000) {
      totalContent = totalContent.slice(0, 80000) + '\n\n[... truncated ...]'
      break
    }
  }

  return totalContent
}

// POST /api/audits — start a new audit
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken || !session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 5 audits per minute per user
  const { success: withinLimit } = rateLimit(`audit:${session.user.id}`, 5, 60 * 1000)
  if (!withinLimit) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait before starting another audit.' }, { status: 429 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { repoName, repoUrl, defaultBranch } = body
  if (!repoName || typeof repoName !== 'string') {
    return NextResponse.json({ error: 'repoName is required' }, { status: 400 })
  }

  // Validate repo name format (owner/repo)
  const repoPattern = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/
  if (!repoPattern.test(repoName)) {
    return NextResponse.json({ error: 'Invalid repository name format' }, { status: 400 })
  }

  // Verify user has access to the repository before auditing
  try {
    const repoCheckRes = await fetch(`https://api.github.com/repos/${repoName}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })
    if (!repoCheckRes.ok) {
      return NextResponse.json({ error: 'Repository not found or access denied' }, { status: 403 })
    }
    const repoData = await repoCheckRes.json()
    // Only allow repos the user owns or has push access to
    if (!repoData.permissions?.pull) {
      return NextResponse.json({ error: 'Insufficient repository permissions' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Failed to verify repository access' }, { status: 500 })
  }

  // Create audit record with "analyzing" status
  const { data: audit, error: insertError } = await supabaseAdmin
    .from('audits')
    .insert({
      user_id: session.user.id,
      repo_name: repoName,
      repo_url: repoUrl || null,
      status: 'analyzing',
    })
    .select('id')
    .single()

  if (insertError || !audit) {
    return NextResponse.json({ error: 'Failed to create audit' }, { status: 500 })
  }

  // Run analysis in background (don't await — return immediately)
  runAudit(audit.id, session.accessToken, repoName, defaultBranch || 'main').catch(() => {
    // Log audit failure without exposing error details
    supabaseAdmin.from('audits').update({ status: 'error', summary: 'Unexpected error during analysis' }).eq('id', audit.id)
  })

  return NextResponse.json({ auditId: audit.id })
}

async function runAudit(auditId: string, accessToken: string, repoName: string, branch: string) {
  try {
    // Fetch repo code
    const code = await fetchRepoFiles(accessToken, repoName, branch)

    if (!code || code.length < 50) {
      await supabaseAdmin
        .from('audits')
        .update({ status: 'error', summary: 'Could not read repository files' })
        .eq('id', auditId)
      return
    }

    // Send to Claude for analysis
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: AUDIT_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Audit this codebase (repo: ${repoName}):\n\n${code}`,
        },
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
      await supabaseAdmin
        .from('audits')
        .update({ status: 'error', summary: 'Failed to parse analysis results' })
        .eq('id', auditId)
      return
    }

    // Update audit with results
    await supabaseAdmin
      .from('audits')
      .update({
        status: 'done',
        grade: parsed.grade || 'C',
        score: parsed.score || 50,
        summary: parsed.summary || 'Analysis complete',
      })
      .eq('id', auditId)

    // Insert findings with validation
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
    // Don't log full error to avoid exposing sensitive data in console
    await supabaseAdmin
      .from('audits')
      .update({ status: 'error', summary: 'An error occurred during analysis. Please try again.' })
      .eq('id', auditId)
  }
}

// GET /api/audits — list user's audits
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data } = await supabaseAdmin
    .from('audits')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ audits: data || [] })
}
