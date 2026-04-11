import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Public API — no auth required, but only returns audits marked as shared
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidPattern.test(params.id)) {
    return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 })
  }

  const { data: audit } = await supabaseAdmin
    .from('audits')
    .select('id, repo_name, grade, score, status, summary, created_at, shared')
    .eq('id', params.id)
    .eq('shared', true)
    .single()

  if (!audit) {
    return NextResponse.json({ error: 'Report not found or not shared' }, { status: 404 })
  }

  let findings: any[] = []
  if (audit.status === 'done') {
    const { data } = await supabaseAdmin
      .from('audit_findings')
      .select('severity, type, file, line, description, fix')
      .eq('audit_id', params.id)
      .order('severity', { ascending: true })
    findings = data || []
  }

  return NextResponse.json({ audit, findings })
}
