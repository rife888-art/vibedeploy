import { Terminal, Search, Rocket } from 'lucide-react'

const steps = [
  {
    icon: Terminal,
    step: '01',
    title: 'Run in your project',
    command: 'npx vibedeploy',
    description: 'One command. Works with any Next.js, Vite, or Node.js project. No config required to get started.',
  },
  {
    icon: Search,
    step: '02',
    title: 'We check your repo. 30 seconds.',
    description: 'VibeDeploy reads your codebase and flags anything that could bite you in production:',
    checks: [
      'Exposed secrets in non-.env files',
      'Supabase RLS disabled on tables',
      'API endpoints with no auth check',
      'Hardcoded keys in frontend code',
    ],
  },
  {
    icon: Rocket,
    step: '03',
    title: 'Fix applied. Deploy confirmed. Done.',
    description:
      'Critical issues are fixed automatically. You review the diff, confirm, and VibeDeploy pushes to Vercel. Clean deploy every time.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 border-t border-border">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-14 text-center">
          <p className="text-xs font-medium text-foreground-subtle uppercase tracking-widest mb-3">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            From repo to production in under 5 minutes
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="relative">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-5 left-full w-full h-px bg-gradient-to-r from-border to-transparent z-0" />
                )}

                <div className="relative z-10">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-accent-muted border border-accent/20 flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>

                  {/* Step number */}
                  <div className="text-xs font-mono text-foreground-subtle mb-2">{step.step}</div>

                  <h3 className="font-semibold text-base mb-3">{step.title}</h3>

                  {step.command && (
                    <code className="inline-block text-xs font-mono bg-surface border border-border rounded px-2.5 py-1 text-accent mb-3">
                      {step.command}
                    </code>
                  )}

                  <p className="text-sm text-foreground-muted leading-relaxed">
                    {step.description}
                  </p>

                  {step.checks && (
                    <ul className="mt-3 space-y-1.5">
                      {step.checks.map((check, j) => (
                        <li key={j} className="flex items-center gap-2 text-xs text-foreground-subtle">
                          <span className="w-1 h-1 bg-accent rounded-full flex-shrink-0" />
                          {check}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
