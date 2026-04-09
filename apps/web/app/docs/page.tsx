import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Terminal, Key, Rocket, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'Docs — VibeDeploy',
  description: 'Get started with VibeDeploy in under 5 minutes.',
}

const steps = [
  {
    icon: Key,
    step: '01',
    title: 'Sign in and grab your CLI token',
    content: (
      <>
        Go to{' '}
        <a href="/dashboard/settings" className="text-accent hover:underline">
          Settings
        </a>{' '}
        and copy your CLI token. This authenticates the CLI with your dashboard.
      </>
    ),
    code: null,
  },
  {
    icon: Terminal,
    step: '02',
    title: 'Install and configure',
    content: 'Create a config file in your project root with your CLI token and API keys.',
    code: `# vibedeploy.config.json
{
  "token": "vd_your_cli_token_here",
  "anthropicKey": "sk-ant-...",
  "vercelToken": "your_vercel_token"
}`,
  },
  {
    icon: ShieldCheck,
    step: '03',
    title: 'Run the check',
    content:
      'Run the command from your project root. VibeDeploy will analyze your code, fix critical issues, and report results to your dashboard.',
    code: 'npx vibedeploy',
  },
  {
    icon: Rocket,
    step: '04',
    title: 'Review and deploy',
    content:
      'Open your dashboard to review found issues, applied fixes, and the live deploy URL.',
    code: null,
  },
]

const checks = [
  { label: 'Hardcoded secrets', description: 'API keys, tokens, passwords in non-.env files' },
  { label: 'Disabled RLS', description: 'Supabase tables without row-level security enabled' },
  { label: 'Unprotected endpoints', description: 'API routes with no authentication check' },
  { label: 'Unsanitized queries', description: 'Database queries using raw user input' },
]

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-background">
      <Nav />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 pb-24">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-accent bg-accent-muted border border-accent/20 rounded-full px-3 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 bg-accent rounded-full" />
            Documentation
          </div>
          <h1 className="text-4xl font-semibold tracking-tight mb-4">
            Get started with VibeDeploy
          </h1>
          <p className="text-lg text-foreground-muted leading-relaxed">
            One command that checks your repo for security issues, auto-fixes the critical ones,
            and deploys to Vercel. Setup takes under 5 minutes.
          </p>
        </div>

        {/* Quick start */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-8">Quick start</h2>
          <div className="space-y-8">
            {steps.map(({ icon: Icon, step, title, content, code }) => (
              <div key={step} className="flex gap-5">
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-accent" />
                  </div>
                  <div className="w-px flex-1 bg-border mt-3" />
                </div>
                <div className="flex-1 pb-8">
                  <div className="text-xs font-mono text-foreground-subtle mb-1">Step {step}</div>
                  <h3 className="font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-foreground-muted mb-3">{content}</p>
                  {code && (
                    <div className="bg-surface border border-border rounded-xl p-4 font-mono text-sm text-foreground-muted overflow-x-auto">
                      <pre>{code}</pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What gets checked */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-2">What gets checked</h2>
          <p className="text-sm text-foreground-muted mb-6">
            VibeDeploy uses Claude to analyze your codebase for the most common production issues in
            vibe-coded apps.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {checks.map(({ label, description }) => (
              <div key={label} className="border border-border rounded-xl p-4 bg-surface">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <p className="text-xs text-foreground-subtle pl-3.5">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* API reference */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-2">CLI report endpoint</h2>
          <p className="text-sm text-foreground-muted mb-4">
            If you&apos;re building custom tooling, you can report deploy results directly via the
            API.
          </p>
          <div className="bg-surface border border-border rounded-xl p-4 font-mono text-sm overflow-x-auto">
            <pre className="text-foreground-muted">{`POST /api/cli/report
Authorization: Bearer vd_your_cli_token

{
  "repo_name": "my-app",
  "issues_found": 3,
  "issues_fixed": 2,
  "deploy_url": "https://my-app.vercel.app",
  "issues": [
    {
      "severity": "critical",
      "type": "hardcoded_secret",
      "file": "src/lib/db.ts",
      "line": 12,
      "description": "Hardcoded Supabase service key",
      "fixed": true
    }
  ]
}`}</pre>
          </div>
        </section>

        {/* CTA */}
        <div className="border border-accent/20 rounded-2xl bg-accent/[0.03] p-8 text-center">
          <h3 className="font-semibold mb-2">Ready to start?</h3>
          <p className="text-sm text-foreground-muted mb-6">
            Sign in with GitHub to get your CLI token and start deploying safely.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Get started →
          </a>
        </div>
      </div>

      <Footer />
    </main>
  )
}
