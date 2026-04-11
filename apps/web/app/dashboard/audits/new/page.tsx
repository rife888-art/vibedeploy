'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Search, Lock, Globe, Loader2, Code, Github } from 'lucide-react'
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

type Tab = 'paste' | 'github'

export default function NewAuditPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('paste')

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">New Security Audit</h1>
        <p className="text-sm text-foreground-muted mt-0.5">
          Paste your code or select a GitHub repository
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg mb-6 w-fit">
        <button
          onClick={() => setTab('paste')}
          className={cn(
            'flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md transition-colors',
            tab === 'paste'
              ? 'bg-accent text-white'
              : 'text-foreground-muted hover:text-foreground'
          )}
        >
          <Code className="w-4 h-4" />
          Paste code
        </button>
        <button
          onClick={() => setTab('github')}
          className={cn(
            'flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md transition-colors',
            tab === 'github'
              ? 'bg-accent text-white'
              : 'text-foreground-muted hover:text-foreground'
          )}
        >
          <Github className="w-4 h-4" />
          GitHub repo
        </button>
      </div>

      {tab === 'paste' ? <PasteTab router={router} /> : <GitHubTab router={router} />}
    </div>
  )
}

// ── Paste code tab ──────────────────────────────────────────────────

function PasteTab({ router }: { router: ReturnType<typeof useRouter> }) {
  const [code, setCode] = useState('')
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAudit() {
    if (code.trim().length < 20) {
      setError('Please paste at least 20 characters of code')
      return
    }
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/audits/paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, projectName: projectName || 'Pasted code' }),
      })
      const data = await res.json()
      if (data.auditId) {
        router.push(`/dashboard/audits/${data.auditId}`)
      } else {
        setError(data.error || 'Failed to start audit')
        setLoading(false)
      }
    } catch {
      setError('Failed to start audit')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <input
        type="text"
        placeholder="Project name (optional)"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm placeholder:text-foreground-subtle focus:outline-none focus:border-accent/50 transition-colors"
      />

      <textarea
        placeholder="Paste your code here... You can paste multiple files separated by comments like // FILE: path/to/file.ts"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={16}
        className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm font-mono placeholder:text-foreground-subtle focus:outline-none focus:border-accent/50 transition-colors resize-y"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground-subtle">
          {code.length > 0 ? `${code.length.toLocaleString()} characters` : 'No code pasted yet'}
        </span>
        <button
          onClick={handleAudit}
          disabled={loading || code.trim().length < 20}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              Run Audit
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ── GitHub repo tab ─────────────────────────────────────────────────

function GitHubTab({ router }: { router: ReturnType<typeof useRouter> }) {
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [starting, setStarting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [noGithub, setNoGithub] = useState(false)

  useEffect(() => {
    fetch('/api/github/repos')
      .then((res) => {
        if (res.status === 401) {
          setNoGithub(true)
          setLoading(false)
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (data) {
          setRepos(data.repos || [])
          setLoading(false)
        }
      })
      .catch(() => {
        setNoGithub(true)
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
    TypeScript: 'bg-blue-400', JavaScript: 'bg-yellow-400', Python: 'bg-green-400',
    Go: 'bg-cyan-400', Rust: 'bg-orange-400', Java: 'bg-red-400',
    Ruby: 'bg-red-500', PHP: 'bg-purple-400',
  }

  if (noGithub) {
    return (
      <div className="border border-border rounded-xl bg-surface p-12 text-center">
        <Github className="w-10 h-10 text-foreground-subtle mx-auto mb-4" />
        <h3 className="font-semibold mb-2">Connect GitHub</h3>
        <p className="text-sm text-foreground-muted mb-4 max-w-md mx-auto">
          To audit GitHub repos directly, sign in with your GitHub account. You can also use the &quot;Paste code&quot; tab without connecting GitHub.
        </p>
        <a
          href="/api/auth/signin"
          className="inline-flex items-center gap-2 bg-white text-black font-medium text-sm rounded-lg px-4 py-2.5 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Connect GitHub
        </a>
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-sm">
          {error}
        </div>
      )}

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
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting...</>
                ) : (
                  <><Shield className="w-3.5 h-3.5" /> Audit</>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
