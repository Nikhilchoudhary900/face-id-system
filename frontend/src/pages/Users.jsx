import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usersApi } from '../api'

function ConfirmModal({ title, message, onConfirm, onCancel, busy }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
    >
      <div className="card" style={{ maxWidth: 420, width: '100%' }}>
        <h3>{title}</h3>
        <p style={{ color: 'var(--text-dim)' }}>{message}</p>
        <div className="flex" style={{ justifyContent: 'flex-end' }}>
          <button className="btn secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="btn danger" onClick={onConfirm} disabled={busy}>
            {busy ? <span className="spinner" /> : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => {
    setLoading(true)
    usersApi
      .list({ q, status_filter: status, page, per_page: 12 })
      .then((d) => {
        setUsers(d.items)
        setTotal(d.total)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [q, status, page])

  const toggleStatus = async (u) => {
    try {
      await usersApi.update(u.id, { status: u.status === 'active' ? 'inactive' : 'active' })
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await usersApi.remove(confirm.id)
      setConfirm(null)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const pages = Math.max(1, Math.ceil(total / 12))

  return (
    <div>
      <div className="flex-between mb-0">
        <div className="flex">
          <input
            className="input"
            placeholder="Search name, email, ID, department..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            style={{ width: 300 }}
          />
          <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} style={{ width: 150 }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <Link to="/users/new" className="btn">
          + Register User
        </Link>
      </div>

      {error && <div className="alert error mt-1">{error}</div>}

      <div className="card mt-2">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Department</th>
                <th>Employee ID</th>
                <th>Samples</th>
                <th>Embedding</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="7"><div className="empty">Loading...</div></td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan="7"><div className="empty">No users found. Register your first user.</div></td></tr>
              )}
              {!loading &&
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="cell-user">
                        {u.photo_url ? (
                          <img src={u.photo_url} alt={u.name} />
                        ) : (
                          <div className="ph">{u.name.charAt(0)}</div>
                        )}
                        <div>
                          <strong>{u.name}</strong>
                          <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>{u.email || '—'}</div>
                          <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>{u.designation}</div>
                        </div>
                      </div>
                    </td>
                    <td>{u.department}</td>
                    <td>{u.employee_id || '—'}</td>
                    <td>{u.sample_count || 0}</td>
                    <td>{u.has_embedding ? <span className="pill green">Registered</span> : <span className="pill amber">Not registered</span>}</td>
                    <td>
                      {u.status === 'active' ? <span className="pill green">Active</span> : <span className="pill red">Inactive</span>}
                    </td>
                    <td>
                      <div className="flex" style={{ gap: 6 }}>
                        <Link to={`/users/${u.id}/edit`} className="btn secondary sm">Edit</Link>
                        <button className="btn ghost sm" onClick={() => toggleStatus(u)}>
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="btn danger sm" onClick={() => setConfirm({ id: u.id, name: u.name })}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="flex-between mt-1">
          <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>
            {total} user{total === 1 ? '' : 's'} · page {page} of {pages}
          </span>
          <div className="flex">
            <button className="btn secondary sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
            <button className="btn secondary sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          title="Delete user"
          message={`Are you sure you want to permanently delete "${confirm.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
          busy={busy}
        />
      )}
    </div>
  )
}
