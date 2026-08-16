import React from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

const ICONS = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
  ),
  live: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  register: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
  ),
  logs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  ),
}

const TITLES = {
  '/': { title: 'Dashboard', sub: 'System overview and live statistics' },
  '/live': { title: 'Live Recognition', sub: 'Real-time face identification from webcam' },
  '/upload': { title: 'Image Recognition', sub: 'Identify faces in an uploaded image' },
  '/users': { title: 'Registered Users', sub: 'Manage registered individuals' },
  '/users/new': { title: 'Register User', sub: 'Add a new individual with facial samples' },
  '/logs': { title: 'Recognition Logs', sub: 'Audit trail of all identifications' },
  '/reports': { title: 'Reports', sub: 'Analytics and trend visualisation' },
  '/settings': { title: 'Settings', sub: 'System configuration and demo data' },
}

export default function Layout() {
  const { admin, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const page = Object.keys(TITLES)
    .sort((a, b) => b.length - a.length)
    .find((k) => location.pathname.startsWith(k))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = admin ? admin.username.slice(0, 2).toUpperCase() : 'AD'

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </div>
          <div>
            <h2>FaceID System</h2>
            <small>AI Biometric Identification</small>
          </div>
        </div>
        <nav className="nav">
          <div className="nav-group">Main</div>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            {ICONS.dashboard} Dashboard
          </NavLink>
          <NavLink to="/live" className={({ isActive }) => (isActive ? 'active' : '')}>
            {ICONS.live} Live Recognition
          </NavLink>
          <NavLink to="/upload" className={({ isActive }) => (isActive ? 'active' : '')}>
            {ICONS.upload} Image Recognition
          </NavLink>
          <div className="nav-group">Management</div>
          <NavLink to="/users" className={({ isActive }) => (isActive ? 'active' : '')}>
            {ICONS.users} Registered Users
          </NavLink>
          <NavLink to="/users/new" className={({ isActive }) => (isActive ? 'active' : '')}>
            {ICONS.register} Register User
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => (isActive ? 'active' : '')}>
            {ICONS.logs} Recognition Logs
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => (isActive ? 'active' : '')}>
            {ICONS.reports} Reports
          </NavLink>
          <div className="nav-group">System</div>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
            {ICONS.settings} Settings
          </NavLink>
        </nav>
        <div className="footer">
          AI Face Identification System v1.0
          <br />
          YuNet + SFace Deep Learning
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="page-title">
            <h1>{TITLES[page]?.title || ''}</h1>
            <p>{TITLES[page]?.sub || ''}</p>
          </div>
          <div className="user-box">
            <div className="avatar">{initials}</div>
            <span>{admin?.username}</span>
            <button className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
