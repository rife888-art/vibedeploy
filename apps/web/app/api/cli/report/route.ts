import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'

const MAX_BODY_SIZE = 1024 * 100 // 100KB max
const MAX_ISSUES = 50

// Constant-time token comparison to prevent timing attacks
function secureTokenCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
  }

  const apiKey = authHeader.slice(7)

  // Validate token format strictly: must be vd_ + exactly 48 hex chars
  if (!/^vd_[a-f0-9]{48}$/.test(apiKey)) {
    return NextResponse.json({ error: 'Invalid API key format' }, { status: 401 })
  }

  // Rate limit by token hash to avoid leaking token in rate-limit keys
  const tokenHash = crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 16)
  const { success: withinLimit } = rateLimit(`cli:${tokenHash}`, 10, 60 * 1000)
  if (!withinLimit) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Look up all CLI tokens and compare securely
  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('user_id, value')
    .eq('key', 'CLI_TOKEN')

  let userId: string | null = null
  if (settings) {
    for (const setting of settings) {
      if (setting.value && setting.value.length === apiKey.length && secureTokenCompare(setting.value, apiKey)) {
        userId = setting.user_id
        break
      }
    }
  }

  if (!userId) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  // Parse and validate body
  let body: any
  try {
    const text = await req.text()
    if (text.length > MAX_BODY_SIZE) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
    }
    body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // JSON schema validation
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
  }

  const { repo_name, issues_found, issues_fixed, deploy_url, issues } = body

  // Validate required and optional field types
  if (repo_name !== undefined && typeof repo_name !== 'string') {
    return NextResponse.json({ error: 'Invalid repo_name: must be a string' }, { status: 400 })
  }
  if (deploy_url !== undefined && typeof deploy_url !== 'string') {
    return NextResponse.json({ error: 'Invalid deploy_url: must be a string' }, { status: 400 })
  }
  if (issues_found !== undefined && typeof issues_found !== 'number') {
    return NextResponse.json({ error: 'Invalid issues_found: must be a number' }, { status: 400 })
  }
  if (issues_fixed !== undefined && typeof issues_fixed !== 'number') {
    return NextResponse.json({ error: 'Invalid issues_fixed: must be a number' }, { status: 400 })
  }
  if (issues !== undefined && !Array.isArray(issues)) {
    return NextResponse.json({ error: 'Invalid issues: must be an array' }, { status: 400 })
  }
  // Validate deploy_url format if provided
  if (deploy_url && !/^https?:\/\/.+/.test(deploy_url)) {
    return NextResponse.json({ error: 'Invalid deploy_url: must be a valid URL' }, { status: 400 })
  }

  const sanitizedRepoName = repo_name ? String(repo_name).slice(0, 200) : null
  const sanitizedDeployUrl = deploy_url ? String(deploy_url).slice(0, 500) : null

  const { data: deploy, error: deployError } = await supabaseAdmin
    .from('deploys')
    .insert({
      user_id: userId,
      repo_name: sanitizedRepoName,
      issues_found: Math.max(0, Math.min(Number(issues_found) || 0, 1000)),
      issues_fixed: Math.max(0, Math.min(Number(issues_fixed) || 0, 1000)),
      deploy_url: sanitizedDeployUrl,
    })
    .select()
    .single()

  if (deployError) {
    return NextResponse.json({ error: 'Failed to save deploy' }, { status: 500 })
  }

  if (issues && Array.isArray(issues) && issues.length > 0) {
    const issueRows = issues.slice(0, MAX_ISSUES).map((issue: any) => ({
      deploy_id: deploy.id,
      severity: ['critical', 'warning'].includes(issue.severity) ? issue.severity : 'warning',
      type: String(issue.type || 'unknown').slice(0, 100),
      file: issue.file ? String(issue.file).slice(0, 500) : null,
      line: Math.max(0, Math.min(Number(issue.line) || 0, 100000)),
      description: String(issue.description || '').slice(0, 2000),
      fixed: Boolean(issue.fixed),
    }))

    await supabaseAdmin.from('issues').insert(issueRows)
  }

  return NextResponse.json({ id: deploy.id, ok: true })
}
