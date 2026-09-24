'use client'

import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from '@/contexts/AuthContext'

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? 'google-client-id-not-configured'
  return <GoogleOAuthProvider clientId={clientId}><AuthProvider>{children}</AuthProvider></GoogleOAuthProvider>
}
