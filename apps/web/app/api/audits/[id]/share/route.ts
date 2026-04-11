import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: audit } = await supabaseAdmin
    .from('audits')
    .select('id, shared, user_id')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .single()

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  // Toggle shared state
  const newShared = !audit.shared
  await supabaseAdmin
    .from('audits')
    .update({ shared: newShared })
    .eq('id', params.id)

  return NextResponse.json({ shared: newShared })
}
