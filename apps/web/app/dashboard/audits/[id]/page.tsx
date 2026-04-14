'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Shield, ShieldCheck, ShieldAlert, AlertTriangle, Info,
  ArrowLeft, Loader2, FileCode, ExternalLink, Share2, Check, Copy,
  TrendingUp, TrendingDown, ArrowRight
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
  shared: boolean
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

interface PreviousAudit {
  id: string
  grade: string
  score: number
  created_at: string
  criticalCount: number
  warningCount: number
  infoCount: number
}

export default function AuditDetailPage() {
  const params = useParams()
  const [audit, setAudit] = useState<Audit | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [previousAudit, setPreviousAudit] = useState<PreviousAudit | null>(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reportCopied, setReportCopied] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout

    async function fetchAudit() {
      const res = await fetch(`/api/audits/${params.id}`)
      const data = await res.json()
      if (data.audit) {
        setAudit(data.audit)
        setFindings(data.findings || [])
        setPreviousAudit(data.previousAudit || null)
        setLoading(false)
        if (data.audit.status === 'done' || data.audit.status === 'error') {
          clearInterval(interval)
        }
      }
    }

    fetchAudit()
    interval = setInterval(fetchAudit, 3000)
    return () => clearInterval(interval)
  }, [params.id])

  async function toggleShare() {
    if (!audit) return
    setSharing(true)
    const res = await fetch(`/api/audits/${audit.id}/share`, { method: 'POST' })
    const data = await res.json()
    setAudit({ ...audit, shared: data.shared })
    setSharing(false)
  }

  function copyShareLink() {
    if (!audit) return
    navigator.clipboard.writeText(`${window.location.origin}/report/${audit.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyReport() {
    if (!audit || findings.length === 0) return

    const lines: string[] = [
      `# Security Audit Report: ${audit.repo_name}`,
      `Grade: ${audit.grade} | Score: ${audit.score}/100`,
      `Date: ${new Date(audit.created_at).toISOString().split('T')[0]}`,
      `Critical: ${criticalCount} | Warnings: ${warningCount} | Info: ${infoCount}`,
      '',
      audit.summary || '',
      '',
      '## Findings',
      '',
    ]

    findings.forEach((f, i) => {
      lines.push(`### ${i + 1}. [${f.severity.toUpperCase()}] ${f.description}`)
      if (f.file) lines.push(`File: ${f.file}${f.line ? `:${f.line}` : ''}`)
      lines.push(`Type: ${f.type}`)
      if (f.fix) lines.push(`Fix: ${f.fix}`)
      lines.push('')
    })

    navigator.clipboard.writeText(lines.join('\n'))
    setReportCopied(true)
    setTimeout(() => setReportCopied(false), 3000)
  }

  const gradeColors: Record<string, string> = {
    A: 'from-green-500 to-emerald-600',
    B: 'from-teal-500 to-cyan-600',
    C: 'from-yellow-500 to-amber-600',
    D: 'from-orange-500 to-red-500',
    F: 'from-red-500 to-rose-700',
  }

  const gradeTextColors: Record<string, string> = {
    A: 'text-green-400', B: 'text-teal-400', C: 'text-yellow-400',
    D: 'text-orange-400', F: 'text-red-400',
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

  const criticalCount = findings.filter(f => f.severity === 'critical').length
  const warningCount = findings.filter(f => f.severity === 'warning').length
  const infoCount = findings.filter(f => f.severity === 'info').length
  const isDone = audit.status === 'done'
  const isClean = isDone && (audit.grade === 'A' || audit.grade === 'B') && criticalCount === 0

  // Top 3 priority actions (critical first, then warnings)
  const priorityActions = findings
    .filter(f => f.severity === 'critical' || f.severity === 'warning')
    .slice(0, 3)

  // Comparison with previous
  const scoreDiff = previousAudit ? audit.score - previousAudit.score : null
  const criticalDiff = previousAudit ? criticalCount - previousAudit.criticalCount : null

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

        {/* Analyzing state */}
        {audit.status === 'analyzing' && (
          <div className="mt-4 p-3 rounded-lg bg-accent-muted border border-accent/20">
            <p className="text-sm text-accent flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing your code... This usually takes 15-30 seconds.
            </p>
          </div>
        )}

        {/* Error state */}
        {audit.status === 'error' && (
          <div className="mt-4 p-3 rounded-lg bg-red-400/10 border border-red-400/20">
            <p className="text-sm text-red-400">{audit.summary || 'An error occurred during analysis'}</p>
          </div>
        )}

        {/* ── Feature 2: "All OK" mode ── */}
        {isClean && (
          <div className="mt-4 p-6 rounded-xl bg-green-400/10 border border-green-400/20 text-center">
            <ShieldCheck className="w-10 h-10 text-green-400 mx-auto mb-2" />
            <p className="text-lg font-semibold text-green-400">Safe to ship!</p>
            <p className="text-sm text-green-400/70 mt-1">No critical security issues found in your code</p>
          </div>
        )}

        {/* Summary for non-clean audits */}
        {isDone && !isClean && audit.summary && (
          <p className="text-sm text-foreground-muted mt-4">{audit.summary}</p>
        )}

        {/* Stats row */}
        {isDone && (
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className={cn('text-2xl font-bold', gradeTextColors[audit.grade || 'C'])}>
                {audit.score}
              </span>
              <span className="text-xs text-foreground-subtle">/100<br />score</span>
              {scoreDiff !== null && scoreDiff !== 0 && (
                <span className={cn(
                  'text-xs font-medium px-1.5 py-0.5 rounded-full ml-1',
                  scoreDiff > 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
                )}>
                  {scoreDiff > 0 ? '+' : ''}{scoreDiff}
                </span>
              )}
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
        )}

        {/* ── Feature 3: Share & Copy report ── */}
        {isDone && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
            <button
              onClick={toggleShare}
              disabled={sharing}
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
                audit.shared
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'bg-surface-2 text-foreground-muted border border-border hover:border-accent/30'
              )}
            >
              <Share2 className="w-3.5 h-3.5" />
              {audit.shared ? 'Shared' : 'Share report'}
            </button>
            {audit.shared && (
              <button
                onClick={copyShareLink}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-surface-2 text-foreground-muted border border-border hover:border-accent/30 transition-colors"
              >
                {copied ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy link</>}
              </button>
            )}
            {findings.length > 0 && (
              <button
                onClick={copyReport}
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ml-auto',
                  reportCopied
                    ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                    : 'bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20'
                )}
              >
                {reportCopied ? (
                  <><Check className="w-3.5 h-3.5" /> Report copied!</>
                ) : (
                  <><FileCode className="w-3.5 h-3.5" /> Copy for developer</>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Feature 4: Comparison with previous audit ── */}
      {isDone && previousAudit && (
        <div className="border border-border rounded-xl bg-surface p-5 mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            {scoreDiff !== null && scoreDiff > 0 ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : scoreDiff !== null && scoreDiff < 0 ? (
              <TrendingDown className="w-4 h-4 text-red-400" />
            ) : null}
            Compared to previous audit
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-foreground-subtle mb-1">Score</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-foreground-muted">{previousAudit.score}</span>
                <ArrowRight className="w-3 h-3 text-foreground-subtle" />
                <span className={cn('font-bold', gradeTextColors[audit.grade || 'C'])}>{audit.score}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-foreground-subtle mb-1">Grade</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-foreground-muted">{previousAudit.grade}</span>
                <ArrowRight className="w-3 h-3 text-foreground-subtle" />
                <span className={cn('font-bold', gradeTextColors[audit.grade || 'C'])}>{audit.grade}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-foreground-subtle mb-1">Critical</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-foreground-muted">{previousAudit.criticalCount}</span>
                <ArrowRight className="w-3 h-3 text-foreground-subtle" />
                <span className={cn('font-bold', criticalCount === 0 ? 'text-green-400' : 'text-red-400')}>{criticalCount}</span>
              </div>
            </div>
          </div>
          {scoreDiff !== null && scoreDiff > 0 && (
            <p className="text-xs text-green-400 text-center mt-3">
              Score improved by {scoreDiff} points since last audit
            </p>
          )}
          {scoreDiff !== null && scoreDiff < 0 && (
            <p className="text-xs text-red-400 text-center mt-3">
              Score decreased by {Math.abs(scoreDiff)} points since last audit
            </p>
          )}
        </div>
      )}

      {/* ── Feature 1: "Fix right now" — Top priority actions ── */}
      {isDone && priorityActions.length > 0 && !isClean && (
        <div className="border border-accent/20 rounded-xl bg-accent/5 p-5 mb-6">
          <h3 className="text-sm font-semibold mb-3">Fix right now</h3>
          <div className="space-y-3">
            {priorityActions.map((action, i) => (
              <div key={action.id} className="flex gap-3">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                  action.severity === 'critical' ? 'bg-red-400/20 text-red-400' : 'bg-yellow-400/20 text-yellow-400'
                )}>
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm">{action.fix || action.description}</p>
                  {action.file && (
                    <p className="text-xs text-foreground-subtle mt-0.5">
                      {action.file}{action.line ? `:${action.line}` : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All findings */}
      {isDone && findings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
            All findings ({findings.length})
          </h2>
          {findings.map((finding) => {
            const config = severityConfig[finding.severity] || severityConfig.info
            const Icon = config.icon
            return (
              <div key={finding.id} className={cn('border rounded-xl p-4', config.bg)}>
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
