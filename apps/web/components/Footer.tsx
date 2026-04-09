import Link from 'next/link'
import { Waves } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-border py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-accent flex items-center justify-center">
            <Waves className="w-3 h-3 text-white" />
          </div>
          <span className="font-semibold text-sm">VibeDeploy</span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 text-sm text-foreground-subtle">
          <Link href="https://twitter.com/vibedeploy" className="hover:text-foreground-muted transition-colors">
            Twitter / X
          </Link>
          <Link href="https://github.com/vibedeploy" className="hover:text-foreground-muted transition-colors">
            GitHub
          </Link>
          <Link href="/docs" className="hover:text-foreground-muted transition-colors">
            Docs
          </Link>
        </div>

        <p className="text-xs text-foreground-subtle">
          © 2026 VibeDeploy. MIT License.
        </p>
      </div>
    </footer>
  )
}
