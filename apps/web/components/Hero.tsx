'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Hero() {
  const [copied, setCopied] = useState(false)
  const command = 'npx vibedeploy'

  const handleCopy = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="relative pt-32 pb-24 px-4 sm:px-6 overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid opacity-100 pointer-events-none" />

      {/* Radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 text-xs font-medium text-accent bg-accent-muted border border-accent/20 rounded-full px-3 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
          For Cursor &amp; Claude Code users
        </div>

        {/* H1 */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.08] mb-6 text-balance">
          Ship vibe code without
          <br />
          <span className="text-accent">getting burned</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-foreground-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          One command checks your repo, fixes critical issues, and deploys to Vercel.
          <br className="hidden sm:block" />
          Under 5 minutes. Every time.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          {/* Copyable code block */}
          <button
            onClick={handleCopy}
            className={cn(
              'group flex items-center gap-3 bg-surface border border-border rounded-lg px-4 py-2.5 font-mono text-sm transition-all duration-150',
              'hover:border-accent/40 hover:bg-surface-2'
            )}
          >
            <span className="text-foreground-muted select-none">$</span>
            <span className="text-foreground">{command}</span>
            <span className="ml-2 text-foreground-subtle group-hover:text-accent transition-colors">
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            </span>
          </button>

          <a
            href="#how-it-works"
            className="text-sm text-foreground-muted hover:text-foreground transition-colors flex items-center gap-1"
          >
            See how it works ↓
          </a>
        </div>

        {/* Subtext */}
        <p className="text-sm text-foreground-subtle">
          Free for 3 deploys/month · No credit card required
        </p>
      </div>
    </section>
  )
}
