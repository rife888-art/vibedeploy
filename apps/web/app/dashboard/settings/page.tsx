'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Save, Check, Copy, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApiKeyFieldProps {
  label: string
  keyName: string
  placeholder: string
  description: string
}

function ApiKeyField({ label, keyName, placeholder, description }: ApiKeyFieldProps) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!value.trim()) return
    setSaving(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: keyName, value }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setValue('')
  }

  return (
    <div className="border border-border rounded-xl p-5 bg-surface">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium">{label}</h3>
          <p className="text-xs text-foreground-subtle mt-0.5">{description}</p>
        </div>
        <span className="text-xs font-mono text-foreground-subtle bg-surface-2 border border-border rounded px-2 py-0.5">
          {keyName}
        </span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent/50 transition-colors pr-10"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground-muted transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={!value.trim() || saving}
          className={cn(
            'flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg transition-all',
            saved
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-accent hover:bg-accent-hover text-white disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          {saved ? (
            <>
              <Check className="w-3.5 h-3.5" /> Saved
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

const apiKeys = [
  {
    label: 'Anthropic API Key',
    keyName: 'ANTHROPIC_API_KEY',
    placeholder: 'sk-ant-...',
    description: 'Used to analyze your codebase before each deploy.',
  },
  {
    label: 'Vercel Token',
    keyName: 'VERCEL_TOKEN',
    placeholder: 'xxxxxx',
    description: 'Used to trigger production deployments.',
  },
  {
    label: 'Supabase URL',
    keyName: 'SUPABASE_URL',
    placeholder: 'https://xxxx.supabase.co',
    description: 'Your Supabase project URL for RLS checks.',
  },
  {
    label: 'Supabase Service Key',
    keyName: 'SUPABASE_SERVICE_KEY',
    placeholder: 'eyJ...',
    description: 'Service role key for checking RLS policies.',
  },
]

function CliTokenSection() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { setToken(d.token || ''); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const copyToken = () => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border border-accent/30 rounded-xl p-5 bg-accent/[0.03]">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
          <Terminal className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-medium">CLI Token</h3>
          <p className="text-xs text-foreground-subtle mt-0.5">
            Add this to your <code className="font-mono bg-surface px-1 rounded">vibedeploy.config.json</code> to send deploy reports to this dashboard.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-10 bg-surface border border-border rounded-lg animate-pulse" />
      ) : (
        <div className="flex gap-2">
          <div className="flex-1 bg-background border border-border rounded-lg px-3 py-2 font-mono text-sm text-foreground-muted overflow-hidden text-ellipsis whitespace-nowrap">
            {token}
          </div>
          <button
            onClick={copyToken}
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg transition-all',
              copied
                ? 'bg-success/10 text-success border border-success/20'
                : 'bg-accent hover:bg-accent-hover text-white'
            )}
          >
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </button>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-foreground-muted mt-0.5">
          Manage your API keys and integrations.
        </p>
      </div>

      {/* CLI Token — top priority */}
      <div className="mb-8">
        <h2 className="text-xs font-medium text-foreground-subtle uppercase tracking-widest mb-4">
          CLI Setup
        </h2>
        <CliTokenSection />
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-medium text-foreground-subtle uppercase tracking-widest mb-4">
          API Keys
        </h2>
        {apiKeys.map((key) => (
          <ApiKeyField key={key.keyName} {...key} />
        ))}
      </div>

      <div className="mt-8 bg-accent-muted border border-accent/20 rounded-xl p-4">
        <p className="text-sm text-foreground-muted">
          <span className="text-accent font-medium">Tip:</span> You can also set these in your{' '}
          <code className="font-mono text-xs bg-surface px-1.5 py-0.5 rounded border border-border">
            vibedeploy.config.json
          </code>{' '}
          file. Keys stored here override the dashboard.
        </p>
      </div>
    </div>
  )
}
