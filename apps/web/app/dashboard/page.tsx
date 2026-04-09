import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle, XCircle, Clock, ExternalLink, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'

async function getDeploys(userId: string) {
  const { data } = await supabaseAdmin
    .from('deploys')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  return data || []
}

function StatusBadge({ issuesFound, issuesFixed }: { issuesFound: number; issuesFixed: number }) {
  const unfixed = issuesFound - issuesFixed
  if (issuesFound === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 border border-success/20 rounded-full px-2.5 py-0.5">
        <CheckCircle className="w-3 h-3" /> Clean
      </span>
    )
  }
  if (unfixed > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning bg-warning/10 border border-warning/20 rounded-full px-2.5 py-0.5">
        <Clock className="w-3 h-3" /> {unfixed} open
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 border border-success/20 rounded-full px-2.5 py-0.5">
      <CheckCircle className="w-3 h-3" /> Fixed
    </span>
  )
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')
  const deploys = await getDeploys(session.user.id)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Deploys</h1>
          <p className="text-sm text-foreground-muted mt-0.5">
            {deploys.length} total deploy{deploys.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-surface border border-border rounded-lg px-3 py-2 text-foreground-muted">
          <span>$</span>
          <span>npx vibedeploy</span>
        </div>
      </div>

      {/* Table */}
      {deploys.length === 0 ? (
        <div className="border border-border rounded-xl bg-surface p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-accent-muted border border-accent/20 flex items-center justify-center mx-auto mb-4">
            <Rocket className="w-6 h-6 text-accent" />
          </div>
          <h3 className="font-semibold mb-2">No deploys yet</h3>
          <p className="text-sm text-foreground-muted mb-6">
            Run <code className="font-mono text-accent">npx vibedeploy</code> in your project to get started.
          </p>
          <a
            href="/docs"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            View setup docs →
          </a>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left text-xs font-medium text-foreground-subtle px-4 py-3">Repo</th>
                <th className="text-left text-xs font-medium text-foreground-subtle px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-foreground-subtle px-4 py-3">Issues</th>
                <th className="text-left text-xs font-medium text-foreground-subtle px-4 py-3 hidden sm:table-cell">Date</th>
                <th className="text-left text-xs font-medium text-foreground-subtle px-4 py-3 hidden md:table-cell">URL</th>
                <th className="w-8 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {deploys.map((deploy: any, i: number) => (
                <tr
                  key={deploy.id}
                  className={cn(
                    'border-b border-border last:border-0 hover:bg-surface-2/50 transition-colors',
                    i % 2 === 0 ? 'bg-surface' : 'bg-background'
                  )}
                >
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-medium">{deploy.repo_name || 'Unknown repo'}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge
                      issuesFound={deploy.issues_found || 0}
                      issuesFixed={deploy.issues_fixed || 0}
                    />
                  </td>
                  <td className="px-4 py-3.5 text-sm text-foreground-muted">
                    {deploy.issues_found ? (
                      <span>
                        <span className="text-foreground">{deploy.issues_fixed}</span>
                        <span className="text-foreground-subtle">/{deploy.issues_found} fixed</span>
                      </span>
                    ) : (
                      <span className="text-foreground-subtle">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-foreground-muted hidden sm:table-cell">
                    {new Date(deploy.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    {deploy.deploy_url ? (
                      <a
                        href={deploy.deploy_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-foreground-subtle hover:text-accent transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {deploy.deploy_url.replace('https://', '')}
                      </a>
                    ) : (
                      <span className="text-foreground-subtle text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/dashboard/deploy/${deploy.id}`}
                      className="text-xs text-foreground-subtle hover:text-accent transition-colors"
                    >
                      →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
