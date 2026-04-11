import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate audit ID format (UUID)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidPattern.test(params.id)) {
    return NextResponse.json({ error: 'Invalid audit ID format' }, { status: 400 })
  }

  const { data: audit } = await supabaseAdmin
    .from('audits')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .single()

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  // Only return findings for completed audits
  let findings: any[] = []
  if (audit.status === 'done') {
    const { data } = await supabaseAdmin
      .from('audit_findings')
      .select('*')
      .eq('audit_id', params.id)
      .order('severity', { ascending: true })
    findings = data || []
  }

  // Fetch previous audit for the same repo (for comparison)
  let previousAudit: any = null
  if (audit.status === 'done') {
    const { data: prev } = await supabaseAdmin
      .from('audits')
      .select('id, grade, score, status, created_at')
      .eq('user_id', session.user.id)
      .eq('repo_name', audit.repo_name)
      .eq('status', 'done')
      .lt('created_at', audit.created_at)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (prev) {
      // Get previous findings count by severity
      const { data: prevFindings } = await supabaseAdmin
        .from('audit_findings')
        .select('severity')
        .eq('audit_id', prev.id)

      previousAudit = {
        ...prev,
        criticalCount: prevFindings?.filter(f => f.severity === 'critical').length || 0,
        warningCount: prevFindings?.filter(f => f.severity === 'warning').length || 0,
        infoCount: prevFindings?.filter(f => f.severity === 'info').length || 0,
      }
    }
  }

  // Strip internal fields before returning
  const { user_id, ...safeAudit } = audit

  return NextResponse.json({ audit: safeAudit, findings, previousAudit })
}
