import React, { createContext, useContext, useEffect, useState } from 'react'
import { authApi, getToken, setToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .me()
      .then((me) => setAdmin(me))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const res = await authApi.login(username, password)
    setToken(res.access_token)
    setAdmin(res.admin)
    return res
  }

  const logout = () => {
    setToken(null)
    setAdmin(null)
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
