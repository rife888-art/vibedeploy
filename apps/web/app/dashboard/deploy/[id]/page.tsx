import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

async function getDeploy(id: string, userId: string) {
  const { data: deploy } = await supabaseAdmin
    .from('deploys')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!deploy) return null

  const { data: issues } = await supabaseAdmin
    .from('issues')
    .select('*')
    .eq('deploy_id', id)
    .order('severity', { ascending: true })

  return { deploy, issues: issues || [] }
}

export default async function DeployDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')
  const result = await getDeploy(params.id, session.user.id)

  if (!result) notFound()

  const { deploy, issues } = result
  const critical = issues.filter((i: any) => i.severity === 'critical')
  const warnings = issues.filter((i: any) => i.severity === 'warning')

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-foreground-subtle hover:text-foreground-muted transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All deploys
      </Link>

      {/* Deploy header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold">{deploy.repo_name}</h1>
          <p className="text-sm text-foreground-muted mt-1">
            {new Date(deploy.created_at).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        {deploy.deploy_url && (
          <a
            href={deploy.deploy_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm bg-success/10 border border-success/20 text-success rounded-lg px-3.5 py-2 hover:bg-success/20 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View live deploy
          </a>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Issues found', value: deploy.issues_found || 0 },
          { label: 'Issues fixed', value: deploy.issues_fixed || 0, highlight: true },
          {
            label: 'Status',
            value:
              deploy.issues_found === 0
                ? 'Clean'
                : deploy.issues_fixed === deploy.issues_found
                ? 'All fixed'
                : 'Partial',
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface border border-border rounded-xl p-4">
            <div
              className={cn(
                'text-2xl font-bold mb-1',
                stat.highlight ? 'text-success' : 'text-foreground'
              )}
            >
              {stat.value}
            </div>
            <div className="text-xs text-foreground-subtle">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Issues list */}
      {issues.length === 0 ? (
        <div className="border border-border rounded-xl bg-surface p-12 text-center">
          <CheckCircle className="w-8 h-8 text-success mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Clean deploy</h3>
          <p className="text-sm text-foreground-muted">No issues found in this repo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-foreground-muted mb-4">Issues ({issues.length})</h2>

          {[...critical, ...warnings].map((issue: any) => (
            <div
              key={issue.id}
              className={cn(
                'border rounded-xl p-4',
                issue.severity === 'critical'
                  ? 'border-error/30 bg-error/[0.03]'
                  : 'border-warning/30 bg-warning/[0.03]'
              )}
            >
              <div className="flex items-start gap-3">
                {issue.severity === 'critical' ? (
                  <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        'text-xs font-medium uppercase tracking-wide',
                        issue.severity === 'critical' ? 'text-error' : 'text-warning'
                      )}
                    >
                      {issue.severity}
                    </span>
                    <span className="text-xs text-foreground-subtle font-mono">
                      {issue.file}
                      {issue.line ? `:${issue.line}` : ''}
                    </span>
                    {issue.fixed && (
                      <span className="text-xs text-success bg-success/10 border border-success/20 rounded-full px-2 py-0.5">
                        Fixed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-1.5">{issue.description}</p>
                  {issue.fix && (
                    <div className="mt-3 bg-surface border border-border rounded-lg p-3">
                      <p className="text-xs text-foreground-subtle mb-1.5">Applied fix</p>
                      <p className="text-xs font-mono text-foreground-muted">{issue.fix}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
