'use client'

import { useAuth } from '@/contexts/AuthContext'
import LoginPage from '@/components/LoginPage'
import OdontoMarketplace from '@/components/odonto-marketplace'

export default function AuthenticatedApp() {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="auth-loading">A carregar...</div>
  }
  return user ? <OdontoMarketplace /> : <LoginPage />
}
