'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'
import * as authService from '@/services/authService'
import type { AuthResponse, AuthUser, RegisterRequest, UserRole } from '@/types/auth'

const TOKEN_KEY = 'exomarket.auth.token'
const USER_KEY = 'exomarket.auth.user'

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (data: RegisterRequest) => Promise<void>
  signInWithGoogle: (credential: string, role: UserRole) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedUser = localStorage.getItem(USER_KEY)

    if (storedToken && storedUser) {
      try {
        const payload = jwtDecode<{ exp?: number }>(storedToken)
        if (!payload.exp || payload.exp * 1000 > Date.now()) {
          setToken(storedToken)
          setUser(JSON.parse(storedUser) as AuthUser)
        } else {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      }
    }
    setLoading(false)
  }, [])

  const persist = (response: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, response.token)
    localStorage.setItem(USER_KEY, JSON.stringify(response.user))
    setToken(response.token)
    setUser(response.user)
  }

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    signIn: async (email, password) => persist(await authService.login(email, password)),
    signUp: async (data) => persist(await authService.register(data)),
    signInWithGoogle: async (credential, role) => persist(await authService.loginWithGoogle(credential, role)),
    signOut: () => {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      setToken(null)
      setUser(null)
    },
  }), [loading, token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}

export { TOKEN_KEY }
