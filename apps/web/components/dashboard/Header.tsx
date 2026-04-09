'use client'

import { signOut } from 'next-auth/react'
import Image from 'next/image'
import { LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export default function DashboardHeader({ user }: HeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-surface flex-shrink-0">
      <div className="text-sm text-foreground-subtle">
        {/* Breadcrumb can go here */}
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {user?.image ? (
            <Image
              src={user.image}
              alt={user.name || 'User'}
              width={28}
              height={28}
              className="rounded-full"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-accent-muted border border-accent/20 flex items-center justify-center text-xs font-medium text-accent">
              {user?.name?.charAt(0) || 'U'}
            </div>
          )}
          <span className="text-sm text-foreground-muted hidden sm:block">{user?.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-foreground-subtle" />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-lg shadow-xl py-1 z-50">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-foreground-subtle truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
