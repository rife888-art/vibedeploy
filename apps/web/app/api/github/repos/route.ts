import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
