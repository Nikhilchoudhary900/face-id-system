import React, { useEffect, useState } from 'react'
import { settingsApi, authApi } from '../api'
import { useAuth } from '../auth'

export default function Settings() {
  const { logout } = useAuth()
  const [settings, setSettings] = useState(null)
  const [threshold, setThreshold] = useState(0.5)
  const [autoLog, setAutoLog] = useState(true)
  const [cameraFlip, setCameraFlip] = useState(false)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [demo, setDemo] = useState('')
  const [account, setAccount] = useState({ new_username: '', current_password: '', new_password: '', confirm: '' })
  const [accountMsg, setAccountMsg] = useState('')
  const [accountBusy, setAccountBusy] = useState(false)

  useEffect(() => {
    settingsApi
      .get()
      .then((s) => {
        setSettings(s)
        setThreshold(s.similarity_threshold)
        setAutoLog(s.auto_log_unknown)
        setCameraFlip(s.camera_flip)
      })
      .catch((e) => setError(e.message))
  }, [])

  const save = async () => {
    setBusy(true)
    setSaved('')
    try {
      const res = await settingsApi.update({
        similarity_threshold: threshold,
        auto_log_unknown: autoLog,
        camera_flip: cameraFlip,
      })
      setSettings(res)
      setSaved('Settings saved successfully.')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const runDemo = async (action) => {
    setDemo('')
    setError('')
    try {
      const res =
        action === 'users' ? await settingsApi.seedUsers() : action === 'logs' ? await settingsApi.seedLogs() : await settingsApi.clearLogs()
      setDemo(`Done: ${JSON.stringify(res)}`)
    } catch (e) {
      setError(e.message)
    }
  }

  const changeUsername = async () => {
    setAccountMsg('')
    if (!account.new_username.trim()) {
      setAccountMsg({ type: 'error', text: 'Enter a new username.' })
      return
    }
    setAccountBusy(true)
    try {
      await authApi.changeUsername(account.new_username.trim())
      setAccountMsg({ type: 'success', text: `Username updated. You will be logged out — please sign in again with "${account.new_username.trim()}".` })
      setAccount((a) => ({ ...a, new_username: '' }))
      setTimeout(() => logout(), 1600)
    } catch (e) {
      setAccountMsg({ type: 'error', text: e.message })
    } finally {
      setAccountBusy(false)
    }
  }

  const changePassword = async () => {
    setAccountMsg('')
    if (account.new_password.length < 6) {
      setAccountMsg({ type: 'error', text: 'New password must be at least 6 characters.' })
      return
    }
    if (account.new_password !== account.confirm) {
      setAccountMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    setAccountBusy(true)
    try {
      await authApi.changePassword(account.current_password, account.new_password)
      setAccountMsg({ type: 'success', text: 'Password updated successfully.' })
      setAccount((a) => ({ ...a, current_password: '', new_password: '', confirm: '' }))
    } catch (e) {
      setAccountMsg({ type: 'error', text: e.message })
    } finally {
      setAccountBusy(false)
    }
  }

  if (!settings) return <div className="empty">Loading settings...</div>

  return (
    <div style={{ maxWidth: 760 }}>
      {error && <div className="alert error">{error}</div>}
      {saved && <div className="alert success">{saved}</div>}
      {demo && <div className="alert info">{demo}</div>}

      <div className="card">
        <h3>Recognition Settings</h3>
        <div className="form-field">
          <label>
            Similarity Threshold: <strong>{threshold.toFixed(2)}</strong>
          </label>
          <input
            type="range"
            min="0.3"
            max="0.8"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 6 }}>
            Lower = more permissive (fewer unknowns), higher = stricter (fewer false matches). A match is accepted when cosine
            similarity is at or above this value. Default 0.50.
          </p>
        </div>

        <div className="form-field">
          <label className="flex" style={{ cursor: 'pointer', gap: 10 }}>
            <input type="checkbox" checked={autoLog} onChange={(e) => setAutoLog(e.target.checked)} />
            Automatically log unknown persons
          </label>
          <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 4 }}>
            When enabled, unidentified faces are recorded in the recognition log for security auditing.
          </p>
        </div>

        <div className="form-field">
          <label className="flex" style={{ cursor: 'pointer', gap: 10 }}>
            <input type="checkbox" checked={cameraFlip} onChange={(e) => setCameraFlip(e.target.checked)} />
            Mirror the webcam view (selfie style)
          </label>
        </div>

        <button className="btn" onClick={save} disabled={busy}>
          {busy ? <span className="spinner" /> : 'Save Settings'}
        </button>
      </div>

      <div className="card">
        <h3>Administrator Account</h3>
        {accountMsg && <div className={`alert ${accountMsg.type}`}>{accountMsg.text}</div>}
        <div className="form-field">
          <label>Change Username</label>
          <div className="flex">
            <input
              className="input"
              placeholder="New username"
              value={account.new_username}
              onChange={(e) => setAccount({ ...account, new_username: e.target.value })}
              style={{ maxWidth: 280 }}
            />
            <button className="btn secondary" onClick={changeUsername} disabled={accountBusy}>
              Update Username
            </button>
          </div>
        </div>
        <div className="form-field">
          <label>Change Password</label>
          <div className="form-row">
            <div className="form-field">
              <input
                className="input"
                type="password"
                placeholder="Current password"
                value={account.current_password}
                onChange={(e) => setAccount({ ...account, current_password: e.target.value })}
              />
            </div>
            <div className="form-field">
              <input
                className="input"
                type="password"
                placeholder="New password (min 6 chars)"
                value={account.new_password}
                onChange={(e) => setAccount({ ...account, new_password: e.target.value })}
              />
            </div>
            <div className="form-field">
              <input
                className="input"
                type="password"
                placeholder="Confirm new password"
                value={account.confirm}
                onChange={(e) => setAccount({ ...account, confirm: e.target.value })}
              />
            </div>
            <div className="form-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn secondary" onClick={changePassword} disabled={accountBusy}>
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-2">
        <h3>Demo Data</h3>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          Populate the system with sample users and historical recognition logs so the dashboard and reports can be explored.
        </p>
        <div className="flex" style={{ flexWrap: 'wrap' }}>
          <button className="btn secondary" onClick={() => runDemo('users')}>Seed Demo Users</button>
          <button className="btn secondary" onClick={() => runDemo('logs')}>Seed Demo Logs</button>
          <button className="btn danger" onClick={() => runDemo('clear')}>Clear All Logs</button>
        </div>
      </div>

      <div className="card mt-2">
        <h3>About the AI Models</h3>
        <ul style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 2, paddingLeft: 18 }}>
          <li><strong>Face Detection</strong> — YuNet (OpenCV Zoo), a lightweight CNN face detector</li>
          <li><strong>Face Recognition</strong> — SFace, a deep CNN that extracts 128-dimensional facial embeddings</li>
          <li><strong>Matching</strong> — cosine similarity between normalized embeddings, compared against registered users</li>
          <li><strong>Backend</strong> — FastAPI + SQLAlchemy (SQLite by default, switchable to MySQL/PostgreSQL)</li>
        </ul>
      </div>
    </div>
  )
}
