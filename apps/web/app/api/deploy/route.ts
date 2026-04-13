import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

// Trigger a Vercel redeployment via the Vercel REST API.
// This endpoint is called by the CLI after applying fixes.
// Requires a connected Vercel project (projectId) and a valid token.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { success } = rateLimit(`deploy:${session.user.id}`, 5, 60 * 1000)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { vercelToken, projectId, teamId } = body
  if (!vercelToken || typeof vercelToken !== 'string' || !projectId || typeof projectId !== 'string') {
    return NextResponse.json({ error: 'vercelToken and projectId required' }, { status: 400 })
  }

  // Validate projectId format (alphanumeric, hyphens, underscores, max 100 chars)
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId) || projectId.length > 100) {
    return NextResponse.json({ error: 'Invalid projectId format' }, { status: 400 })
  }

  // Validate Vercel token format (alphanumeric, must be reasonable length)
  if (vercelToken.length < 10 || vercelToken.length > 200 || !/^[a-zA-Z0-9_\-]+$/.test(vercelToken)) {
    return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
  }

  // Verify token has access to the project before deploying
  const verifyUrl = teamId && typeof teamId === 'string'
    ? `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}?teamId=${encodeURIComponent(teamId)}`
    : `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}`

  try {
    const verifyRes = await fetch(verifyUrl, {
      headers: { Authorization: `Bearer ${vercelToken}` },
    })
    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Token does not have access to this project' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Failed to verify project access' }, { status: 500 })
  }

  const sanitizedTeamId = teamId && typeof teamId === 'string' ? encodeURIComponent(teamId) : null
  const url = sanitizedTeamId
    ? `https://api.vercel.com/v13/deployments?teamId=${sanitizedTeamId}`
    : 'https://api.vercel.com/v13/deployments'

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: projectId,
      target: 'production',
      source: 'api',
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ success: false, error: 'Deployment failed' }, { status: res.status })
  }

  const data = await res.json()
  const deployUrl = data.url ? `https://${data.url}` : null

  return NextResponse.json({ success: true, deployUrl, deploymentId: data.id })
}
