'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Menu, X, Waves } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session } = useSession()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
              <Waves className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight">VibeDeploy</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-foreground-muted">
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">
              Docs
            </Link>
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-3.5 py-1.5 rounded-md transition-colors"
              >
                Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-3.5 py-1.5 rounded-md transition-colors"
                >
                  Start deploying →
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-1.5 text-foreground-muted hover:text-foreground transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          'md:hidden border-t border-border overflow-hidden transition-all duration-200',
          mobileOpen ? 'max-h-64' : 'max-h-0'
        )}
      >
        <div className="px-4 py-4 flex flex-col gap-4 text-sm">
          <Link href="#how-it-works" onClick={() => setMobileOpen(false)} className="text-foreground-muted hover:text-foreground">
            How it works
          </Link>
          <Link href="#pricing" onClick={() => setMobileOpen(false)} className="text-foreground-muted hover:text-foreground">
            Pricing
          </Link>
          <Link href="/docs" onClick={() => setMobileOpen(false)} className="text-foreground-muted hover:text-foreground">
            Docs
          </Link>
          <Link
            href={session ? '/dashboard' : '/auth/signin'}
            className="inline-flex items-center justify-center bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2 rounded-md"
          >
            {session ? 'Dashboard →' : 'Start deploying →'}
          </Link>
        </div>
      </div>
    </nav>
  )
}
