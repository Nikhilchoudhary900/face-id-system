import React, { useEffect, useState } from 'react'
import { statsApi } from '../api'
import { BarChart, LineChart, Donut, StackedBarChart } from '../components/charts'

function StatCard({ icon, color, bg, value, label, sub }) {
  return (
    <div className="stat-card">
      <div className="icon" style={{ background: bg, color }}>
        {icon}
      </div>
      <div>
        <div className="value">{value}</div>
        <div className="label">{label}</div>
        {sub && <div className="label" style={{ fontSize: 11 }}>{sub}</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([statsApi.overview(), statsApi.reports(7)])
      .then(([o, r]) => {
        setStats(o)
        setReport(r)
      })
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="alert error">{error}</div>
  if (!stats) return <div className="empty">Loading dashboard...</div>

  const activity = stats.activity_24h.map((a) => ({
    label: new Date(a.hour).getHours() + 'h',
    value: a.count,
  }))

  const deptColors = ['#4f7cff', '#a78bfa', '#2dd4a7', '#ffb454', '#ff5d73', '#38bdf8', '#f472b6']
  const dept = stats.users_by_department.map((d, i) => ({
    label: d.department,
    value: d.count,
    color: deptColors[i % deptColors.length],
  }))

  const donut = [
    { label: 'Known today', value: stats.known_today, color: '#2dd4a7' },
    { label: 'Unknown today', value: stats.unknown_today, color: '#ff5d73' },
  ]

  const daily = (report?.daily || []).map((d) => ({
    label: d.date.slice(5),
    known: d.known,
    unknown: d.unknown,
    total: d.total,
  }))

  return (
    <div>
      <div className="grid stats">
        <StatCard
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>}
          color="#4f7cff" bg="rgba(79,124,255,0.12)" value={stats.total_users} label="Registered Users" sub={`${stats.active_users} active · ${stats.inactive_users} inactive`}
        />
        <StatCard
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>}
          color="#a78bfa" bg="rgba(167,139,250,0.12)" value={stats.total_recognitions} label="Total Recognitions" sub="all time"
        />
        <StatCard
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
          color="#2dd4a7" bg="var(--green-bg)" value={stats.recognitions_today} label="Recognitions Today" sub={`${stats.known_today} known · ${stats.unknown_today} unknown`}
        />
        <StatCard
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
          color="#ffb454" bg="var(--amber-bg)" value={`${stats.accuracy_today}%`} label="Recognition Accuracy" sub="today"
        />
      </div>

      <div className="grid two mt-2">
        <div className="card">
          <h3>Activity — Last 24 Hours</h3>
          <LineChart data={activity} height={250} color="#4f7cff" />
        </div>
        <div className="card">
          <h3>Recognition Summary Today</h3>
          <Donut segments={donut} />
          <div className="mt-2">
            <h3 style={{ fontSize: 13 }}>Users by Department</h3>
            <BarChart data={dept} height={140} />
          </div>
        </div>
      </div>

      <div className="card mt-2">
        <h3>Daily Recognitions (7 days)</h3>
        <StackedBarChart data={daily} height={250} />
        <div className="legend mt-1">
          <div className="item"><span className="dot" style={{ background: '#2dd4a7' }} /> Known</div>
          <div className="item"><span className="dot" style={{ background: '#ff5d73' }} /> Unknown</div>
        </div>
      </div>
    </div>
  )
}
