export type UserRole = 'DENTIST' | 'DESIGNER'

export type AuthUser = {
  id: number
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
}

export type AuthResponse = {
  token: string
  user: AuthUser
}

export type RegisterRequest = {
  name: string
  email: string
  password: string
  role: UserRole
}
