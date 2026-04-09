import { AlertTriangle } from 'lucide-react'

const incidents = [
  {
    emoji: '💸',
    title: 'API keys hardcoded in frontend.',
    detail: "User's OpenAI bill: $4,200 overnight.",
    description:
      'A Next.js app shipped with OPENAI_API_KEY inside a client component. Scraped by a bot within hours.',
  },
  {
    emoji: '🔓',
    title: 'Supabase RLS off by default.',
    detail: "18,000 users' data exposed for 3 weeks.",
    description:
      'Row Level Security was never enabled on the users table. Any authenticated user could read every row.',
  },
  {
    emoji: '💳',
    title: 'Stripe key leaked.',
    detail: 'Every customer got a full refund. Product shut down.',
    description:
      'STRIPE_SECRET_KEY was committed to a public GitHub repo. Attacker issued full refunds to all 340 customers.',
  },
]

export default function IncidentCards() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 text-xs font-medium text-foreground-subtle uppercase tracking-widest mb-10 justify-center">
          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
          Real incidents from vibe-coded apps
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {incidents.map((inc, i) => (
            <div
              key={i}
              className="relative bg-surface border border-border rounded-xl p-5 group hover:border-error/30 transition-all duration-200"
            >
              {/* Red glow on hover */}
              <div className="absolute inset-0 rounded-xl bg-error/0 group-hover:bg-error/[0.02] transition-all duration-200 pointer-events-none" />

              <div className="text-2xl mb-4">{inc.emoji}</div>
              <p className="font-medium text-sm text-foreground mb-1">
                {inc.title}{' '}
                <span className="text-error font-semibold">{inc.detail}</span>
              </p>
              <p className="text-xs text-foreground-subtle leading-relaxed mt-3">
                {inc.description}
              </p>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-foreground-subtle mt-8">
          These are real incidents from vibe-coded apps in 2025–2026.{' '}
          <span className="text-foreground-muted">
            VibeDeploy catches all three automatically.
          </span>
        </p>
      </div>
    </section>
  )
}
