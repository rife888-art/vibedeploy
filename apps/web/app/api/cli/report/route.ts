import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
  }

  const apiKey = authHeader.slice(7)

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
  const body = await req.json()
  const { repo_name, issues_found, issues_fixed, deploy_url, issues } = body

  const { data: deploy, error: deployError } = await supabaseAdmin
    .from('deploys')
    .insert({
      user_id: userId,
      repo_name,
      issues_found: issues_found || 0,
      issues_fixed: issues_fixed || 0,
      deploy_url,
    })
    .select()
    .single()

  if (deployError) {
    return NextResponse.json({ error: deployError.message }, { status: 500 })
  }

  if (issues && issues.length > 0) {
    const issueRows = issues.map((issue: any) => ({
      deploy_id: deploy.id,
      severity: issue.severity,
      type: issue.type,
      file: issue.file,
      line: issue.line,
      description: issue.description,
      fixed: issue.fixed || false,
    }))

    await supabaseAdmin.from('issues').insert(issueRows)
  }

  return NextResponse.json({ id: deploy.id, ok: true })
}
