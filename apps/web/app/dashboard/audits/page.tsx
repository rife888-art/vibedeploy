import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, ShieldCheck, ShieldAlert, Plus, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

async function getAudits(userId: string) {
  const { data } = await supabaseAdmin
    .from('audits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data || []
}

function GradeBadge({ grade, score }: { grade: string | null; score: number }) {
  const colors: Record<string, string> = {
    A: 'text-green-400 bg-green-400/10 border-green-400/20',
    B: 'text-accent bg-accent-muted border-accent/20',
    C: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    D: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    F: 'text-red-400 bg-red-400/10 border-red-400/20',
  }

  if (!grade) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground-subtle bg-surface-2 border border-border rounded-full px-2.5 py-0.5">
        <Clock className="w-3 h-3" /> Analyzing...
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold border rounded-full px-2.5 py-0.5', colors[grade] || colors.C)}>
      {grade === 'A' || grade === 'B' ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
      {grade} ({score}/100)
    </span>
  )
}

export default async function AuditsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/api/auth/signin')

  const audits = await getAudits(session.user.id)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Security Audits</h1>
          <p className="text-sm text-foreground-muted mt-0.5">
            {audits.length} audit{audits.length !== 1 ? 's' : ''} completed
          </p>
        </div>
        <Link
          href="/dashboard/audits/new"
          className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Audit
        </Link>
      </div>

      {/* List */}
      {audits.length === 0 ? (
        <div className="border border-border rounded-xl bg-surface p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-accent-muted border border-accent/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-accent" />
          </div>
          <h3 className="font-semibold mb-2">No audits yet</h3>
          <p className="text-sm text-foreground-muted mb-6">
            Run your first security audit on a GitHub repo.
          </p>
          <Link
            href="/dashboard/audits/new"
            className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Start Audit
          </Link>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left text-xs font-medium text-foreground-subtle px-4 py-3">Repository</th>
                <th className="text-left text-xs font-medium text-foreground-subtle px-4 py-3">Grade</th>
                <th className="text-left text-xs font-medium text-foreground-subtle px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-foreground-subtle px-4 py-3 hidden sm:table-cell">Date</th>
                <th className="w-8 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {audits.map((audit: any, i: number) => (
                <tr
                  key={audit.id}
                  className={cn(
                    'border-b border-border last:border-0 hover:bg-surface-2/50 transition-colors',
                    i % 2 === 0 ? 'bg-surface' : 'bg-background'
                  )}
                >
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-medium">{audit.repo_name}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <GradeBadge grade={audit.grade} score={audit.score || 0} />
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn(
                      'text-xs capitalize',
                      audit.status === 'done' ? 'text-green-400' :
                      audit.status === 'analyzing' ? 'text-yellow-400' :
                      audit.status === 'error' ? 'text-red-400' :
                      'text-foreground-subtle'
                    )}>
                      {audit.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-foreground-muted hidden sm:table-cell">
                    {new Date(audit.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/dashboard/audits/${audit.id}`}
                      className="text-xs text-foreground-subtle hover:text-accent transition-colors"
                    >
                      View →
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
