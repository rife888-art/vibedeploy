'use client'

import { useMemo } from 'react'

interface AuditPoint {
  id: string
  score: number
  grade: string | null
  created_at: string
  repo_name: string
}

const GRADE_COLORS: Record<string, string> = {
  A: '#4ade80',
  B: '#2dd4bf',
  C: '#facc15',
  D: '#fb923c',
  F: '#f87171',
}

export default function AuditChart({ audits }: { audits: AuditPoint[] }) {
  const points = useMemo(() => {
    // Take up to 20 most recent completed audits, reverse for chronological order
    return audits
      .filter(a => a.grade && a.score != null)
      .slice(0, 20)
      .reverse()
  }, [audits])

  if (points.length < 2) {
    return null
  }

  const width = 700
  const height = 200
  const padLeft = 40
  const padRight = 20
  const padTop = 20
  const padBottom = 40

  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom

  // Y axis: 0-100 (score)
  const yMin = 0
  const yMax = 100

  // Calculate positions
  const coords = points.map((p, i) => ({
    x: padLeft + (i / (points.length - 1)) * chartW,
    y: padTop + chartH - ((p.score - yMin) / (yMax - yMin)) * chartH,
    ...p,
  }))

  // Create SVG path
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')

  // Area path (filled below line)
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${padTop + chartH} L ${coords[0].x} ${padTop + chartH} Z`

  // Grade zone backgrounds
  const zones = [
    { min: 90, max: 100, color: '#4ade80', label: 'A' },
    { min: 70, max: 89, color: '#2dd4bf', label: 'B' },
    { min: 50, max: 69, color: '#facc15', label: 'C' },
    { min: 30, max: 49, color: '#fb923c', label: 'D' },
    { min: 0, max: 29, color: '#f87171', label: 'F' },
  ]

  // Y gridlines
  const yLines = [0, 25, 50, 75, 100]

  // Latest score trend
  const latestScore = points[points.length - 1].score
  const prevScore = points.length >= 2 ? points[points.length - 2].score : latestScore
  const trend = latestScore - prevScore

  return (
    <div className="border border-border rounded-xl bg-surface p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Score History</h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            Last {points.length} audits
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-2xl font-bold">{latestScore}</span>
            <span className="text-xs text-foreground-muted">/100</span>
          </div>
          {trend !== 0 && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              trend > 0
                ? 'text-green-400 bg-green-400/10'
                : 'text-red-400 bg-red-400/10'
            }`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ minWidth: '400px', maxHeight: '220px' }}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              {coords.map((c, i) => (
                <stop
                  key={i}
                  offset={`${(i / (coords.length - 1)) * 100}%`}
                  stopColor={GRADE_COLORS[c.grade || 'C']}
                />
              ))}
            </linearGradient>
          </defs>

          {/* Y gridlines */}
          {yLines.map(v => {
            const y = padTop + chartH - ((v - yMin) / (yMax - yMin)) * chartH
            return (
              <g key={v}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  strokeWidth="0.5"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="var(--color-foreground-subtle)"
                  fontSize="9"
                  fontFamily="system-ui"
                >
                  {v}
                </text>
              </g>
            )
          })}

          {/* Grade zone labels on right */}
          {zones.map(z => {
            const midY = padTop + chartH - (((z.min + z.max) / 2 - yMin) / (yMax - yMin)) * chartH
            return (
              <text
                key={z.label}
                x={width - padRight + 14}
                y={midY + 3}
                textAnchor="start"
                fill={z.color}
                fontSize="9"
                fontWeight="bold"
                fontFamily="system-ui"
                opacity="0.5"
              >
                {z.label}
              </text>
            )
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#areaGradient)" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {coords.map((c, i) => (
            <g key={i}>
              <circle
                cx={c.x}
                cy={c.y}
                r="4"
                fill={GRADE_COLORS[c.grade || 'C']}
                stroke="var(--color-surface)"
                strokeWidth="2"
              />
              {/* X labels (show first, last, and every 3rd) */}
              {(i === 0 || i === coords.length - 1 || i % 3 === 0) && (
                <text
                  x={c.x}
                  y={height - 8}
                  textAnchor="middle"
                  fill="var(--color-foreground-subtle)"
                  fontSize="8"
                  fontFamily="system-ui"
                >
                  {new Date(c.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
