import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usersApi } from '../api'
import FaceCapture from '../components/FaceCapture'

const EMPTY = {
  name: '',
  email: '',
  employee_id: '',
  department: 'General',
  designation: 'Member',
  phone: '',
  status: 'active',
}

export default function RegisterUser() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm] = useState(EMPTY)
  const [samples, setSamples] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!isEdit) return
    usersApi
      .get(id)
      .then((u) => {
        setForm({
          name: u.name,
          email: u.email || '',
          employee_id: u.employee_id || '',
          department: u.department || 'General',
          designation: u.designation || 'Member',
          phone: u.phone || '',
          status: u.status || 'active',
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      let userId
      if (isEdit) {
        await usersApi.update(id, form)
        userId = Number(id)
      } else {
        const created = await usersApi.create(form)
        userId = created.id
      }
      if (samples.length > 0) {
        await usersApi.registerFaces(userId, samples)
      }
      setSuccess(isEdit ? 'User updated successfully.' : 'User registered successfully.')
      setTimeout(() => navigate('/users'), 900)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="empty">Loading...</div>

  return (
    <div style={{ maxWidth: 860 }}>
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <form onSubmit={submit}>
        <div className="card">
          <h3>Personal Information</h3>
          <div className="form-row">
            <div className="form-field">
              <label>Full Name <span className="badge-required">*</span></label>
              <input className="input" value={form.name} onChange={set('name')} required />
            </div>
            <div className="form-field">
              <label>Email</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="form-field">
              <label>Employee ID</label>
              <input className="input" value={form.employee_id} onChange={set('employee_id')} placeholder="EMP-0000" />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input className="input" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="form-field">
              <label>Department</label>
              <select className="select" value={form.department} onChange={set('department')}>
                {['General', 'Engineering', 'Finance', 'HR', 'Sales', 'Marketing', 'Security', 'Operations', 'IT', 'Administration'].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Designation</label>
              <input className="input" value={form.designation} onChange={set('designation')} />
            </div>
            <div className="form-field">
              <label>Status</label>
              <select className="select" value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card mt-2">
          <FaceCapture samples={samples} onChange={setSamples} />
        </div>

        <div className="flex mt-2">
          <button className="btn" disabled={busy}>
            {busy ? <span className="spinner" /> : isEdit ? 'Save Changes' : 'Register User'}
          </button>
          <button type="button" className="btn secondary" onClick={() => navigate('/users')}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
