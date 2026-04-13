import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rate-limit'

const VALID_SEVERITIES = ['critical', 'warning', 'info']

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('deploys')
    .select('*, issues(*)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch deploys' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { success } = rateLimit(`deploys:${session.user.id}`, 10, 60 * 1000)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { repo_name, issues_found, issues_fixed, deploy_url, issues } = body

  // Validate inputs
  if (!repo_name || typeof repo_name !== 'string' || repo_name.length > 200) {
    return NextResponse.json({ error: 'Invalid repo_name' }, { status: 400 })
  }
  if (deploy_url && (typeof deploy_url !== 'string' || deploy_url.length > 500)) {
    return NextResponse.json({ error: 'Invalid deploy_url' }, { status: 400 })
  }

  const safeIssuesFound = typeof issues_found === 'number' && issues_found >= 0 ? Math.min(issues_found, 10000) : 0
  const safeIssuesFixed = typeof issues_fixed === 'number' && issues_fixed >= 0 ? Math.min(issues_fixed, 10000) : 0

  // Insert deploy record
  const { data: deploy, error: deployError } = await supabaseAdmin
    .from('deploys')
    .insert({
      user_id: session.user.id,
      repo_name: repo_name.slice(0, 200),
      issues_found: safeIssuesFound,
      issues_fixed: safeIssuesFixed,
      deploy_url: deploy_url ? deploy_url.slice(0, 500) : null,
    })
    .select()
    .single()

  if (deployError) {
    return NextResponse.json({ error: 'Failed to create deploy record' }, { status: 500 })
  }

  // Insert individual issues with validation
  if (Array.isArray(issues) && issues.length > 0) {
    const issueRows = issues.slice(0, 50).map((issue: any) => ({
      deploy_id: deploy.id,
      severity: VALID_SEVERITIES.includes(issue.severity) ? issue.severity : 'info',
      type: typeof issue.type === 'string' ? issue.type.slice(0, 100) : 'unknown',
      file: typeof issue.file === 'string' ? issue.file.slice(0, 500) : null,
      line: typeof issue.line === 'number' && issue.line >= 0 ? Math.min(issue.line, 999999) : null,
      description: typeof issue.description === 'string' ? issue.description.slice(0, 2000) : '',
      fixed: issue.fixed === true,
    }))

    await supabaseAdmin.from('issues').insert(issueRows)
  }

  return NextResponse.json({ id: deploy.id })
}
