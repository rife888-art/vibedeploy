import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get or create CLI token
  const { data: existing } = await supabaseAdmin
    .from('user_settings')
    .select('value')
    .eq('user_id', session.user.id)
    .eq('key', 'CLI_TOKEN')
    .single()

  if (existing) {
    return NextResponse.json({ token: existing.value })
  }

  // Generate new token
  const token = 'vd_' + crypto.randomBytes(24).toString('hex')

  await supabaseAdmin.from('user_settings').insert({
    user_id: session.user.id,
    key: 'CLI_TOKEN',
    value: token,
    updated_at: new Date().toISOString(),
  })

  return NextResponse.json({ token })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { key, value } = await req.json()
  if (!key || !value) {
    return NextResponse.json({ error: 'key and value required' }, { status: 400 })
  }

  const allowedKeys = ['ANTHROPIC_API_KEY', 'VERCEL_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'CLI_TOKEN']
  if (!allowedKeys.includes(key)) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  }

  // Store encrypted (in production, use a KMS or Vault — this is simplified)
  const { error } = await supabaseAdmin.from('user_settings').upsert(
    {
      user_id: session.user.id,
      key,
      value, // encrypt this in production
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,key' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
