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

  const { vercelToken, projectId, teamId } = await req.json()
  if (!vercelToken || !projectId) {
    return NextResponse.json({ error: 'vercelToken and projectId required' }, { status: 400 })
  }

  const url = teamId
    ? `https://api.vercel.com/v13/deployments?teamId=${encodeURIComponent(teamId)}`
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
    const err = await res.json().catch(() => ({ error: 'Vercel API error' }))
    return NextResponse.json({ success: false, error: err }, { status: res.status })
  }

  const data = await res.json()
  const deployUrl = data.url ? `https://${data.url}` : null

  return NextResponse.json({ success: true, deployUrl, deploymentId: data.id })
}
