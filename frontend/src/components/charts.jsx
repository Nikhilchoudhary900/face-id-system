import React, { useState } from 'react'

export function BarChart({ data, height = 240, color = '#4f7cff' }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="bar-chart" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="bar-col">
          <div
            className="bar"
            data-count={d.value}
            style={{ height: `${(d.value / max) * 100}%`, background: d.color || color }}
          />
          <div className="bar-label">{d.label}</div>
        </div>
      ))}
    </div>
  )
}

export function StackedBarChart({ data, height = 260 }) {
  const max = Math.max(1, ...data.map((d) => d.total || 0))
  return (
    <div className="bar-chart" style={{ height }}>
      {data.map((d, i) => {
        const knownPct = max ? (d.known / max) * 100 : 0
        const unknownPct = max ? (d.unknown / max) * 100 : 0
        return (
          <div key={i} className="bar-col">
            <div className="flex" style={{ gap: 2, width: '100%', maxWidth: 44, justifyContent: 'flex-end', height: '100%', flexDirection: 'column-reverse' }}>
              <div className="bar" style={{ height: `${unknownPct}%`, background: '#ff5d73', minHeight: knownPct || unknownPct ? 2 : 0 }} data-count={d.unknown} />
              <div className="bar" style={{ height: `${knownPct}%`, background: '#2dd4a7' }} data-count={d.known} />
            </div>
            <div className="bar-label">{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

export function LineChart({ data, height = 260, color = '#4f7cff' }) {
  const width = 720
  const pad = 30
  const max = Math.max(1, ...data.map((d) => d.value))
  const stepX = data.length > 1 ? (width - pad * 2) / (data.length - 1) : 0
  const pts = data.map((d, i) => {
    const x = pad + i * stepX
    const y = pad + (1 - d.value / max) * (height - pad * 2)
    return [x, y]
  })
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${path} L${pts.length ? pts[pts.length - 1][0] : pad},${height - pad} L${pad},${height - pad} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="lc-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={pad}
          x2={width - pad}
          y1={pad + (1 - f) * (height - pad * 2)}
          y2={pad + (1 - f) * (height - pad * 2)}
          stroke="#243257"
          strokeDasharray="4 4"
        />
      ))}
      <path d={area} fill="url(#lc-area)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill={color} stroke="#0b1220" strokeWidth="1.5">
          <title>{`${data[i].label}: ${data[i].value}`}</title>
        </circle>
      ))}
      {data.length <= 14 &&
        pts.map((p, i) => (
          <text key={i} x={p[0]} y={height - 6} textAnchor="middle" fontSize="10" fill="#94a3c8">
            {data[i].label}
          </text>
        ))}
    </svg>
  )
}

export function Donut({ segments, size = 180, thickness = 26 }) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0))
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="donut-wrap">
      <svg width={size} height={size}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1b2745" strokeWidth={thickness} />
          {segments.map((s, i) => {
            const len = (s.value / total) * c
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              />
            )
            offset += len
            return el
          })}
        </g>
        <text x="50%" y="50%" dy="0.35em" textAnchor="middle" fontSize="26" fontWeight="700" fill="#e8eefc">
          {total}
        </text>
      </svg>
      <div className="legend">
        {segments.map((s, i) => (
          <div key={i} className="item">
            <span className="dot" style={{ background: s.color }} />
            {s.label}: {s.value}
          </div>
        ))}
      </div>
    </div>
  )
}
