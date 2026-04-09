import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rate-limit'

const MAX_BODY_SIZE = 1024 * 100 // 100KB max
const MAX_ISSUES = 50

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
  }

  const apiKey = authHeader.slice(7)

  // Validate token format
  if (!apiKey.startsWith('vd_') || apiKey.length < 10) {
    return NextResponse.json({ error: 'Invalid API key format' }, { status: 401 })
  }

  // Rate limit by token: 10 requests per minute
  const { success: withinLimit } = rateLimit(`cli:${apiKey}`, 10, 60 * 1000)
  if (!withinLimit) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Look up user by CLI token stored in user_settings
  const { data: setting } = await supabaseAdmin
    .from('user_settings')
    .select('user_id')
    .eq('key', 'CLI_TOKEN')
    .eq('value', apiKey)
    .single()

  if (!setting) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const userId = setting.user_id

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

  const { repo_name, issues_found, issues_fixed, deploy_url, issues } = body

  // Validate inputs
  if (repo_name && typeof repo_name !== 'string') {
    return NextResponse.json({ error: 'Invalid repo_name' }, { status: 400 })
  }
  if (deploy_url && typeof deploy_url !== 'string') {
    return NextResponse.json({ error: 'Invalid deploy_url' }, { status: 400 })
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
