'use client'

import { useEffect, useState } from 'react'

const lines = [
  { text: '$ npx vibedeploy', type: 'command', delay: 0 },
  { text: '', type: 'blank', delay: 400 },
  { text: '→ Reading repo...', type: 'info', delay: 700 },
  { text: '→ Checking Supabase config...', type: 'info', delay: 1400 },
  { text: '  ✗ RLS disabled on users table', type: 'error', delay: 2100 },
  { text: '  ✗ OPENAI_API_KEY found in /src/lib/ai.ts line 12', type: 'error', delay: 2500 },
  { text: '→ Fixing issues...', type: 'info', delay: 3300 },
  { text: '  ✓ RLS enabled', type: 'success', delay: 4000 },
  { text: '  ✓ Key moved to .env', type: 'success', delay: 4500 },
  { text: '→ Deploying to Vercel...', type: 'info', delay: 5300 },
  { text: '  ✓ Live at yourapp.vercel.app', type: 'success', delay: 6200 },
  { text: '', type: 'blank', delay: 6800 },
  { text: 'Clean deploy. 2 issues fixed. 47 seconds.', type: 'final', delay: 7100 },
]

const typeColors: Record<string, string> = {
  command: 'text-white font-medium',
  blank: '',
  info: 'text-[#888]',
  error: 'text-[#ef4444]',
  success: 'text-[#22c55e]',
  final: 'text-[#eab308] font-medium',
}

export default function TerminalDemo() {
  const [visibleCount, setVisibleCount] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true)
        }
      },
      { threshold: 0.3 }
    )

    const el = document.getElementById('terminal-demo')
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return

    let timeouts: ReturnType<typeof setTimeout>[] = []

    lines.forEach((line, i) => {
      const t = setTimeout(() => {
        setVisibleCount(i + 1)
      }, line.delay)
      timeouts.push(t)
    })

    return () => timeouts.forEach(clearTimeout)
  }, [started])

  return (
    <section id="terminal-demo" className="py-20 px-4 sm:px-6 border-t border-border">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-medium text-foreground-subtle uppercase tracking-widest mb-3">
            Live demo
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Watch it run
          </h2>
        </div>

        {/* Terminal window */}
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl">
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e1e1e]">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-xs text-[#555] font-mono">vibedeploy — your-project</span>
          </div>

          {/* Content */}
          <div className="p-6 font-mono text-sm min-h-[320px]">
            {lines.slice(0, visibleCount).map((line, i) => (
              <div
                key={i}
                className={`leading-6 ${typeColors[line.type]} ${i === visibleCount - 1 ? 'animate-fade-in' : ''}`}
              >
                {line.text || '\u00A0'}
              </div>
            ))}
            {/* Blinking cursor */}
            {visibleCount > 0 && visibleCount < lines.length && (
              <span className="inline-block w-2 h-4 bg-[#eab308] animate-blink ml-0.5" />
            )}
          </div>
        </div>

        {/* Replay button */}
        {visibleCount >= lines.length && (
          <div className="text-center mt-6">
            <button
              onClick={() => {
                setVisibleCount(0)
                setStarted(false)
                setTimeout(() => setStarted(true), 100)
              }}
              className="text-sm text-foreground-subtle hover:text-foreground-muted transition-colors"
            >
              ↺ Replay
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
