import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import LiveRecognition from './pages/LiveRecognition'
import UploadRecognition from './pages/UploadRecognition'
import Users from './pages/Users'
import RegisterUser from './pages/RegisterUser'
import Logs from './pages/Logs'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

function Protected({ children }) {
  const { admin, loading } = useAuth()
  if (loading) return <div className="page-loading">Loading...</div>
  if (!admin) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="live" element={<LiveRecognition />} />
        <Route path="upload" element={<UploadRecognition />} />
        <Route path="users" element={<Users />} />
        <Route path="users/new" element={<RegisterUser />} />
        <Route path="users/:id/edit" element={<RegisterUser />} />
        <Route path="logs" element={<Logs />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
