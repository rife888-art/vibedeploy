'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Search, Lock, Globe, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Repo {
  id: number
  name: string
  url: string
  private: boolean
  language: string | null
  updatedAt: string
  defaultBranch: string
}

export default function NewAuditPage() {
  const router = useRouter()
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [starting, setStarting] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/github/repos')
      .then((res) => res.json())
      .then((data) => {
        setRepos(data.repos || [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load repos. Please re-sign in to grant access.')
        setLoading(false)
      })
  }, [])

  const filtered = repos.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  async function startAudit(repo: Repo) {
    setStarting(repo.name)
    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: repo.name,
          repoUrl: repo.url,
          defaultBranch: repo.defaultBranch,
        }),
      })

      const data = await res.json()
      if (data.auditId) {
        router.push(`/dashboard/audits/${data.auditId}`)
      } else {
        setError(data.error || 'Failed to start audit')
        setStarting(null)
      }
    } catch {
      setError('Failed to start audit')
      setStarting(null)
    }
  }

  const langColors: Record<string, string> = {
    TypeScript: 'bg-blue-400',
    JavaScript: 'bg-yellow-400',
    Python: 'bg-green-400',
    Go: 'bg-cyan-400',
    Rust: 'bg-orange-400',
    Java: 'bg-red-400',
    Ruby: 'bg-red-500',
    PHP: 'bg-purple-400',
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">New Security Audit</h1>
        <p className="text-sm text-foreground-muted mt-0.5">
          Select a GitHub repository to audit
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
        <input
          type="text"
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
        />
      </div>

      {/* Repo list */}
      {loading ? (
        <div className="border border-border rounded-xl bg-surface p-16 text-center">
          <Loader2 className="w-6 h-6 text-accent animate-spin mx-auto mb-3" />
          <p className="text-sm text-foreground-muted">Loading your repositories...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-border rounded-xl bg-surface p-16 text-center">
          <Shield className="w-8 h-8 text-foreground-subtle mx-auto mb-3" />
          <p className="text-sm text-foreground-muted">
            {search ? 'No repos match your search' : 'No repositories found'}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
          {filtered.map((repo) => (
            <div
              key={repo.id}
              className="flex items-center justify-between px-4 py-3.5 bg-surface hover:bg-surface-2/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {repo.private ? (
                  <Lock className="w-4 h-4 text-foreground-subtle flex-shrink-0" />
                ) : (
                  <Globe className="w-4 h-4 text-foreground-subtle flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{repo.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {repo.language && (
                      <span className="flex items-center gap-1 text-xs text-foreground-subtle">
                        <span className={cn('w-2 h-2 rounded-full', langColors[repo.language] || 'bg-gray-400')} />
                        {repo.language}
                      </span>
                    )}
                    <span className="text-xs text-foreground-subtle">
                      Updated {new Date(repo.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => startAudit(repo)}
                disabled={starting !== null}
                className={cn(
                  'flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors',
                  starting === repo.name
                    ? 'bg-accent/50 text-white cursor-wait'
                    : 'bg-accent hover:bg-accent-hover text-white'
                )}
              >
                {starting === repo.name ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5" />
                    Audit
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
