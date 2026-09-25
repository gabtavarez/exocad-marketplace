import type { Notification } from '@/types/notification'
import { API_BASE_URL } from '@/services/apiConfig'

const TOKEN_KEY = 'exomarket.auth.token'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error('Não foi possível carregar as notificações.')
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export const getNotifications = () => request<Notification[]>('/api/notifications')
export const getUnreadNotificationCount = () => request<{ unreadCount: number }>('/api/notifications/unread-count')
export const markNotificationRead = (id: number) => request<void>(`/api/notifications/${id}/read`, { method: 'PATCH' })
export const markAllNotificationsRead = () => request<void>('/api/notifications/mark-all-read', { method: 'POST' })
