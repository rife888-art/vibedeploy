'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Shield, Settings, Waves } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Deploys' },
  { href: '/dashboard/audits', icon: Shield, label: 'Audits' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

export default function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 border-r border-border flex flex-col bg-surface">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
        <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
          <Waves className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-semibold text-sm">VibeDeploy</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const active =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors',
                  active
                    ? 'bg-accent-muted text-accent'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-2'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-border">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-foreground-subtle hover:text-foreground-muted transition-colors px-2.5 py-2"
        >
          ← Back to site
        </Link>
      </div>
    </aside>
  )
}
