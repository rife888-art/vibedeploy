import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { success } = rateLimit(`github-repos:${session.user.id}`, 10, 60 * 1000)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50&affiliation=owner,collaborator,organization_member', {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch repos' }, { status: 502 })
  }

  const repos = await res.json()

  const simplified = repos.map((r: any) => ({
    id: r.id,
    name: r.full_name,
    url: r.html_url,
    private: r.private,
    language: r.language,
    updatedAt: r.updated_at,
    defaultBranch: r.default_branch,
  }))

  return NextResponse.json({ repos: simplified })
}
