const TOKEN_KEY = 'faceid_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const opts = { ...options, headers }

  if (opts.body && typeof opts.body !== 'string') {
    opts.body = JSON.stringify(opts.body)
  }

  return fetch(path, opts).then(async (res) => {
    if (res.status === 401) {
      setToken(null)
      if (!path.includes('/auth/login')) window.location.href = '/login'
      throw new Error('Unauthorized')
    }
    if (!res.ok) {
      let detail = res.statusText
      try {
        const body = await res.json()
        detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
      } catch (e) {
        /* ignore */
      }
      const err = new Error(detail || 'Request failed')
      err.status = res.status
      throw err
    }
    const text = await res.text()
    return text ? JSON.parse(text) : null
  })
}

export const authApi = {
  login: (username, password) =>
    api('/api/auth/login', { method: 'POST', body: { username, password } }),
  me: () => api('/api/auth/me'),
  changePassword: (current_password, new_password) =>
    api('/api/auth/change-password', { method: 'PUT', body: { current_password, new_password } }),
  changeUsername: (new_username) =>
    api('/api/auth/change-username', { method: 'PUT', body: { new_username } }),
}

export const usersApi = {
  list: (params = {}) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.set(k, v)
    })
    return api(`/api/users?${q.toString()}`)
  },
  get: (id) => api(`/api/users/${id}`),
  create: (data) => api('/api/users', { method: 'POST', body: data }),
  update: (id, data) => api(`/api/users/${id}`, { method: 'PUT', body: data }),
  remove: (id) => api(`/api/users/${id}`, { method: 'DELETE' }),
  registerFaces: (id, images) =>
    api(`/api/users/${id}/faces`, { method: 'POST', body: { images } }),
}

export const recognitionApi = {
  upload: (image, { source = 'upload', log = false } = {}) =>
    api('/api/recognize', { method: 'POST', body: { image, source, log } }),
  frame: (image, { source = 'webcam', log = false } = {}) =>
    api('/api/recognition/frame', { method: 'POST', body: { image, source, log } }),
}

export const logsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.set(k, v)
    })
    return api(`/api/logs?${q.toString()}`)
  },
  exportUrl: (params = {}) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.set(k, v)
    })
    return `/api/logs/export?${q.toString()}`
  },
}

export const statsApi = {
  overview: () => api('/api/stats/overview'),
  reports: (days = 7) => api(`/api/stats/reports?days=${days}`),
}

export const settingsApi = {
  get: () => api('/api/settings'),
  update: (data) => api('/api/settings', { method: 'PUT', body: data }),
  seedUsers: () => api('/api/settings/seed-users', { method: 'POST' }),
  seedLogs: () => api('/api/settings/seed-logs', { method: 'POST' }),
  clearLogs: () => api('/api/settings/clear-logs', { method: 'POST' }),
}
