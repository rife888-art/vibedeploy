import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'

// Encryption for stored settings — NEXTAUTH_SECRET is required
function getEncryptionKey(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET environment variable is required for encryption')
  }
  return secret
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(getEncryptionKey(), salt, 32)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted
}

function decrypt(text: string): string {
  try {
    const parts = text.split(':')
    if (parts.length === 3) {
      // New format: salt:iv:encrypted
      const [saltHex, ivHex, encrypted] = parts
      const salt = Buffer.from(saltHex, 'hex')
      const iv = Buffer.from(ivHex, 'hex')
      const key = crypto.scryptSync(getEncryptionKey(), salt, 32)
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    }
    // Legacy 2-part format no longer supported — treat as plaintext
    return text
  } catch {
    return text // Return as-is if decryption fails (legacy data)
  }
}

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

  // Encrypt sensitive values before storing
  const encryptedValue = key === 'CLI_TOKEN' ? value : encrypt(value)

  const { error } = await supabaseAdmin.from('user_settings').upsert(
    {
      user_id: session.user.id,
      key,
      value: encryptedValue,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,key' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
