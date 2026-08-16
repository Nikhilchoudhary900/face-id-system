import React, { useEffect, useState } from 'react'
import { statsApi } from '../api'
import { StackedBarChart, BarChart } from '../components/charts'

export default function Reports() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    statsApi
      .reports(days)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [days])

  if (error) return <div className="alert error">{error}</div>
  if (!data) return <div className="empty">Loading reports...</div>

  const daily = data.daily.map((d) => ({ label: d.date.slice(5), known: d.known, unknown: d.unknown, total: d.total }))
  const hourly = data.hourly.map((h) => ({ label: `${h.hour}:00`, value: h.count }))
  const top = data.top_users.map((u) => ({ label: u.name, value: u.count }))

  return (
    <div>
      <div className="flex-between mb-0">
        <h3 style={{ margin: 0 }}>Report Period</h3>
        <div className="flex">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              className={`btn ${days === d ? '' : 'ghost'} sm`}
              onClick={() => setDays(d)}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      <div className="grid two mt-2">
        <div className="card">
          <h3>Daily Recognitions (Known vs Unknown)</h3>
          <StackedBarChart data={daily} height={260} />
        </div>
        <div className="card">
          <h3>Activity by Hour of Day</h3>
          <BarChart data={hourly} height={260} color="#a78bfa" />
        </div>
      </div>

      <div className="card mt-2">
        <h3>Most Frequently Identified People</h3>
        {top.length ? (
          <BarChart data={top} height={220} color="#2dd4a7" />
        ) : (
          <div className="empty">No known identifications in this period.</div>
        )}
      </div>
    </div>
  )
}
