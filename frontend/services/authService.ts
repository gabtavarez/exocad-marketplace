import type { AuthResponse, RegisterRequest, UserRole } from '@/types/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'

async function authRequest(path: string, body: unknown): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(payload?.message ?? 'Não foi possível autenticar.')
  }

  return response.json() as Promise<AuthResponse>
}

export function login(email: string, password: string) {
  return authRequest('/api/auth/login', { email, password })
}

export function register(data: RegisterRequest) {
  return authRequest('/api/auth/register', data)
}

export function loginWithGoogle(credential: string, role: UserRole) {
  return authRequest('/api/auth/google', { credential, role })
}
