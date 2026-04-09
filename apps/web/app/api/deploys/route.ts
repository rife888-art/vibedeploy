import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('deploys')
    .select('*, issues(*)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { repo_name, issues_found, issues_fixed, deploy_url, issues } = body

  // Insert deploy record
  const { data: deploy, error: deployError } = await supabaseAdmin
    .from('deploys')
    .insert({
      user_id: session.user.id,
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

  // Insert individual issues
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

  return NextResponse.json({ id: deploy.id })
}
