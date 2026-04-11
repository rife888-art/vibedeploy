'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Shield, ShieldCheck, ShieldAlert, AlertTriangle, Info,
  FileCode, Waves
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PublicReportPage() {
  const params = useParams()
  const [audit, setAudit] = useState<any>(null)
  const [findings, setFindings] = useState<any[]>([])
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/report/${params.id}`)
      .then(res => {
        if (!res.ok) { setError(true); setLoading(false); return null }
        return res.json()
      })
      .then(data => {
        if (data) {
          setAudit(data.audit)
          setFindings(data.findings || [])
          setLoading(false)
        }
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [params.id])

  const gradeColors: Record<string, string> = {
    A: 'from-green-500 to-emerald-600',
    B: 'from-teal-500 to-cyan-600',
    C: 'from-yellow-500 to-amber-600',
    D: 'from-orange-500 to-red-500',
    F: 'from-red-500 to-rose-700',
  }

  const severityConfig: Record<string, { icon: any; color: string; bg: string }> = {
    critical: { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
    warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground-muted">Loading report...</p>
      </div>
    )
  }

  if (error || !audit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-foreground-subtle mx-auto mb-4" />
          <h1 className="text-lg font-semibold mb-2">Report not found</h1>
          <p className="text-sm text-foreground-muted mb-6">This report doesn&apos;t exist or isn&apos;t shared.</p>
          <Link href="/" className="text-accent hover:underline text-sm">Go to VibeDeploy</Link>
        </div>
      </div>
    )
  }

  const criticalCount = findings.filter(f => f.severity === 'critical').length
  const warningCount = findings.filter(f => f.severity === 'warning').length
  const infoCount = findings.filter(f => f.severity === 'info').length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Waves className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold">VibeDeploy Security Report</span>
          </div>
          <Link href="/auth/signup" className="text-xs text-accent hover:underline">
            Try VibeDeploy free
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Report header */}
        <div className="border border-border rounded-xl bg-surface p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold">{audit.repo_name}</h1>
              <p className="text-sm text-foreground-muted mt-0.5">
                Audited {new Date(audit.created_at).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </p>
            </div>
            {audit.grade && (
              <div className={cn(
                'w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center',
                gradeColors[audit.grade] || gradeColors.C
              )}>
                <span className="text-3xl font-bold text-white">{audit.grade}</span>
              </div>
            )}
          </div>

          {/* All OK mode */}
          {(audit.grade === 'A' || audit.grade === 'B') && criticalCount === 0 && (
            <div className="mt-4 p-4 rounded-lg bg-green-400/10 border border-green-400/20 text-center">
              <ShieldCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-green-400 font-semibold">Safe to ship</p>
              <p className="text-xs text-green-400/70 mt-1">No critical security issues found</p>
            </div>
          )}

          {audit.summary && !(audit.grade === 'A' || audit.grade === 'B') && (
            <p className="text-sm text-foreground-muted mt-4">{audit.summary}</p>
          )}

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-sm">
            <span className="text-2xl font-bold">{audit.score}<span className="text-xs text-foreground-subtle font-normal">/100</span></span>
            <div className="h-6 w-px bg-border" />
            {criticalCount > 0 && <span className="text-red-400">{criticalCount} critical</span>}
            {warningCount > 0 && <span className="text-yellow-400">{warningCount} warnings</span>}
            {infoCount > 0 && <span className="text-blue-400">{infoCount} info</span>}
            {findings.length === 0 && <span className="text-green-400">No issues</span>}
          </div>
        </div>

        {/* Findings */}
        {findings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
              Findings ({findings.length})
            </h2>
            {findings.map((finding, i) => {
              const config = severityConfig[finding.severity] || severityConfig.info
              const Icon = config.icon
              return (
                <div key={i} className={cn('border rounded-xl p-4', config.bg)}>
                  <div className="flex items-start gap-3">
                    <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.color)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('text-sm font-semibold capitalize', config.color)}>{finding.severity}</span>
                        <span className="text-xs text-foreground-subtle bg-surface/50 px-1.5 py-0.5 rounded">{finding.type}</span>
                      </div>
                      <p className="text-sm">{finding.description}</p>
                      {finding.file && (
                        <p className="flex items-center gap-1 text-xs text-foreground-subtle mt-1.5">
                          <FileCode className="w-3 h-3" />
                          {finding.file}{finding.line ? `:${finding.line}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 p-6 border border-accent/20 rounded-xl bg-accent/5 text-center">
          <h3 className="font-semibold mb-1">Want to audit your own code?</h3>
          <p className="text-sm text-foreground-muted mb-4">VibeDeploy finds security issues before hackers do.</p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            Try free
          </Link>
        </div>
      </div>
    </div>
  )
}
