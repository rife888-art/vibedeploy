'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Shield, ShieldCheck, ShieldAlert, AlertTriangle, Info,
  ArrowLeft, Loader2, FileCode, ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Audit {
  id: string
  repo_name: string
  repo_url: string | null
  grade: string | null
  score: number
  status: string
  summary: string | null
  created_at: string
}

interface Finding {
  id: string
  severity: string
  type: string
  file: string | null
  line: number | null
  description: string
  fix: string | null
}

export default function AuditDetailPage() {
  const params = useParams()
  const [audit, setAudit] = useState<Audit | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let interval: NodeJS.Timeout

    async function fetchAudit() {
      const res = await fetch(`/api/audits/${params.id}`)
      const data = await res.json()
      if (data.audit) {
        setAudit(data.audit)
        setFindings(data.findings || [])
        setLoading(false)

        // Stop polling if done or error
        if (data.audit.status === 'done' || data.audit.status === 'error') {
          clearInterval(interval)
        }
      }
    }

    fetchAudit()
    // Poll while analyzing
    interval = setInterval(fetchAudit, 3000)

    return () => clearInterval(interval)
  }, [params.id])

  const gradeColors: Record<string, string> = {
    A: 'from-green-500 to-emerald-600',
    B: 'from-teal-500 to-cyan-600',
    C: 'from-yellow-500 to-amber-600',
    D: 'from-orange-500 to-red-500',
    F: 'from-red-500 to-rose-700',
  }

  const gradeTextColors: Record<string, string> = {
    A: 'text-green-400',
    B: 'text-teal-400',
    C: 'text-yellow-400',
    D: 'text-orange-400',
    F: 'text-red-400',
  }

  const severityConfig: Record<string, { icon: any; color: string; bg: string }> = {
    critical: { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
    warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-3" />
          <p className="text-sm text-foreground-muted">Loading audit...</p>
        </div>
      </div>
    )
  }

  if (!audit) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-foreground-muted">Audit not found</p>
      </div>
    )
  }

  const criticalCount = findings.filter((f) => f.severity === 'critical').length
  const warningCount = findings.filter((f) => f.severity === 'warning').length
  const infoCount = findings.filter((f) => f.severity === 'info').length

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/dashboard/audits"
        className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to audits
      </Link>

      {/* Header card */}
      <div className="border border-border rounded-xl bg-surface p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold">{audit.repo_name}</h1>
            <p className="text-sm text-foreground-muted mt-0.5">
              Audited {new Date(audit.created_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
            {audit.repo_url && (
              <a
                href={audit.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                View on GitHub
              </a>
            )}
          </div>

          {/* Grade circle */}
          {audit.status === 'analyzing' ? (
            <div className="w-20 h-20 rounded-full border-2 border-border flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : audit.grade ? (
            <div className={cn(
              'w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center',
              gradeColors[audit.grade] || gradeColors.C
            )}>
              <span className="text-3xl font-bold text-white">{audit.grade}</span>
            </div>
          ) : null}
        </div>

        {/* Status / Summary */}
        {audit.status === 'analyzing' && (
          <div className="mt-4 p-3 rounded-lg bg-accent-muted border border-accent/20">
            <p className="text-sm text-accent flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing your code... This usually takes 15-30 seconds.
            </p>
          </div>
        )}

        {audit.status === 'error' && (
          <div className="mt-4 p-3 rounded-lg bg-red-400/10 border border-red-400/20">
            <p className="text-sm text-red-400">{audit.summary || 'An error occurred during analysis'}</p>
          </div>
        )}

        {audit.status === 'done' && (
          <>
            <p className="text-sm text-foreground-muted mt-4">{audit.summary}</p>

            {/* Stats */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <span className={cn('text-2xl font-bold', gradeTextColors[audit.grade || 'C'])}>
                  {audit.score}
                </span>
                <span className="text-xs text-foreground-subtle">/100<br />score</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-4 text-sm">
                {criticalCount > 0 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <ShieldAlert className="w-4 h-4" />
                    {criticalCount} critical
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="flex items-center gap-1 text-yellow-400">
                    <AlertTriangle className="w-4 h-4" />
                    {warningCount} warnings
                  </span>
                )}
                {infoCount > 0 && (
                  <span className="flex items-center gap-1 text-blue-400">
                    <Info className="w-4 h-4" />
                    {infoCount} info
                  </span>
                )}
                {findings.length === 0 && (
                  <span className="flex items-center gap-1 text-green-400">
                    <ShieldCheck className="w-4 h-4" />
                    No issues found
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Findings */}
      {audit.status === 'done' && findings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
            Findings ({findings.length})
          </h2>
          {findings.map((finding) => {
            const config = severityConfig[finding.severity] || severityConfig.info
            const Icon = config.icon
            return (
              <div
                key={finding.id}
                className={cn('border rounded-xl p-4', config.bg)}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.color)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-sm font-semibold capitalize', config.color)}>
                        {finding.severity}
                      </span>
                      <span className="text-xs text-foreground-subtle bg-surface/50 px-1.5 py-0.5 rounded">
                        {finding.type}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{finding.description}</p>
                    {finding.file && (
                      <p className="flex items-center gap-1 text-xs text-foreground-subtle mt-1.5">
                        <FileCode className="w-3 h-3" />
                        {finding.file}{finding.line ? `:${finding.line}` : ''}
                      </p>
                    )}
                    {finding.fix && (
                      <div className="mt-2 p-2 rounded bg-surface/50 border border-border/50">
                        <p className="text-xs text-foreground-muted">
                          <span className="font-semibold text-accent">Fix:</span> {finding.fix}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
