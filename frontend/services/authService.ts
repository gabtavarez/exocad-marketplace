import type { AuthResponse, AuthUser, RegisterRequest, UserRole } from '@/types/auth'
import { API_BASE_URL } from '@/services/apiConfig'

const TOKEN_KEY = 'exomarket.auth.token'

type AvatarUploadUrlResponse = {
  uploadUrl: string
  publicUrl: string
  expiresAt: string
}

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

export async function updateProfile(name: string, avatarUrl?: string): Promise<AuthUser> {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_BASE_URL}/api/users/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name, avatarUrl: avatarUrl || null }),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(payload?.message ?? 'Não foi possível atualizar o perfil.')
  }
  return response.json() as Promise<AuthUser>
}

export async function uploadAvatar(file: File): Promise<string> {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_BASE_URL}/api/users/me/avatar-upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ fileName: file.name, mimeType: file.type, size: file.size }),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(payload?.message ?? 'Não foi possível preparar o envio da foto.')
  }
  const upload = await response.json() as AvatarUploadUrlResponse
  const storageResponse = await fetch(upload.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!storageResponse.ok) {
    throw new Error('Não foi possível enviar a foto selecionada.')
  }
  return upload.publicUrl
}
