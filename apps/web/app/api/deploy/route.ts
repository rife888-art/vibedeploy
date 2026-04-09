import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Trigger a Vercel redeployment via the Vercel REST API.
// This endpoint is called by the CLI after applying fixes.
// Requires a connected Vercel project (projectId) and a valid token.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  // Validate projectId format (alphanumeric, hyphens, underscores)
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    return NextResponse.json({ error: 'Invalid projectId format' }, { status: 400 })
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
