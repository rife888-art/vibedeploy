import { Check } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'For trying things out',
    cta: 'Get started free',
    ctaHref: '/dashboard',
    featured: false,
    features: [
      '3 deploys per month',
      'Top 5 issues per deploy',
      'Supabase RLS check',
      'Exposed secrets check',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For indie developers who ship',
    cta: 'Start Pro →',
    ctaHref: '/dashboard',
    featured: true,
    badge: 'Most popular',
    features: [
      'Unlimited deploys',
      'All checks, every time',
      'Auto-fix for critical issues',
      'Deploy history & diffs',
      'Priority support',
    ],
  },
  {
    name: 'Team',
    price: '$49',
    period: '/month',
    description: 'For teams that move fast',
    cta: 'Contact us',
    ctaHref: 'mailto:hey@vibedeploy.sh',
    featured: false,
    features: [
      'Everything in Pro',
      'Custom rules & checks',
      'Team dashboard',
      'Slack alerts on issues',
      'SSO & audit log',
    ],
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-medium text-foreground-subtle uppercase tracking-widest mb-3">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="text-foreground-muted mt-3 text-base">
            Start free. Upgrade when you ship more.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative rounded-xl border p-6 flex flex-col',
                plan.featured
                  ? 'bg-accent-muted border-accent/40 shadow-lg shadow-accent/10'
                  : 'bg-surface border-border'
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <div className="font-semibold text-sm text-foreground-muted mb-1">{plan.name}</div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                  <span className="text-foreground-subtle text-sm mb-1">{plan.period}</span>
                </div>
                <p className="text-xs text-foreground-subtle">{plan.description}</p>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={cn(
                        'w-4 h-4 mt-0.5 flex-shrink-0',
                        plan.featured ? 'text-accent' : 'text-success'
                      )}
                    />
                    <span className="text-foreground-muted">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={cn(
                  'block text-center text-sm font-medium px-4 py-2.5 rounded-lg transition-colors',
                  plan.featured
                    ? 'bg-accent hover:bg-accent-hover text-white'
                    : 'bg-surface-2 hover:bg-[#222] text-foreground border border-border'
                )}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
