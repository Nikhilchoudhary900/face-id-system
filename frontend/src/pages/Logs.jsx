import React, { useEffect, useState } from 'react'
import { logsApi, getToken } from '../api'

function fmtDate(d) {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date)) return d
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function Logs() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [known, setKnown] = useState('')
  const [source, setSource] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    logsApi
      .list({ q, known, source, date_from: dateFrom, date_to: dateTo, page, per_page: 25 })
      .then((d) => {
        setItems(d.items)
        setTotal(d.total)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [q, known, source, dateFrom, dateTo, page])

  const exportCsv = async () => {
    const qs = new URLSearchParams()
    if (q) qs.set('q', q)
    if (known) qs.set('known', known)
    if (source) qs.set('source', source)
    const res = await fetch(`/api/logs/export?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (!res.ok) throw new Error('Export failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recognition_logs_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const pages = Math.max(1, Math.ceil(total / 25))

  return (
    <div>
      <div className="flex-between">
        <div className="flex" style={{ flexWrap: 'wrap' }}>
          <input className="input" placeholder="Search by name..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} style={{ width: 200 }} />
          <select className="select" value={known} onChange={(e) => { setKnown(e.target.value); setPage(1) }} style={{ width: 130 }}>
            <option value="">All statuses</option>
            <option value="true">Known</option>
            <option value="false">Unknown</option>
          </select>
          <select className="select" value={source} onChange={(e) => { setSource(e.target.value); setPage(1) }} style={{ width: 130 }}>
            <option value="">All sources</option>
            <option value="webcam">Webcam</option>
            <option value="upload">Upload</option>
          </select>
          <input className="input" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} style={{ width: 160 }} />
          <span style={{ color: 'var(--text-dim)' }}>→</span>
          <input className="input" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} style={{ width: 160 }} />
        </div>
        <button className="btn secondary" onClick={exportCsv}>Export CSV</button>
      </div>

      {error && <div className="alert error mt-1">{error}</div>}

      <div className="card mt-2">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Timestamp</th>
                <th>Person</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Source</th>
                <th>Frame</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="7"><div className="empty">Loading...</div></td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan="7"><div className="empty">No recognition logs found.</div></td></tr>
              )}
              {!loading &&
                items.map((l) => (
                  <tr key={l.id}>
                    <td style={{ color: 'var(--text-dim)' }}>{l.id}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(l.recognized_at)}</td>
                    <td>
                      <strong>{l.name}</strong>
                      {l.user_id && <span style={{ color: 'var(--text-dim)', fontSize: 12 }}> · #{l.user_id}</span>}
                    </td>
                    <td>{l.is_known ? <span className="pill green">Known</span> : <span className="pill red">Unknown</span>}</td>
                    <td>{l.is_known ? `${(l.confidence * 100).toFixed(1)}%` : '—'}</td>
                    <td>
                      <span className={`pill ${l.source === 'webcam' ? 'blue' : 'amber'}`}>{l.source}</span>
                    </td>
                    <td>
                      {l.frame_url ? (
                        <a href={l.frame_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: 13 }}>
                          View frame
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="flex-between mt-1">
          <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>
            {total} log{total === 1 ? '' : 's'} · page {page} of {pages}
          </span>
          <div className="flex">
            <button className="btn secondary sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
            <button className="btn secondary sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
