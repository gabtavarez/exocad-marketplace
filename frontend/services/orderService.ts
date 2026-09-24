import type { AttachmentDownloadUrlResponse, ConversationSummary, CreateOrderRequest, CreateUploadUrlRequest, OrderApplication, OrderMessage, OrderResponse, OrderStatus, UploadUrlResponse } from '@/types/order'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'
const TOKEN_KEY = 'exomarket.auth.token'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(payload?.message ?? `API request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function getOrders(status?: OrderStatus | string): Promise<OrderResponse[]> {
  const searchParams = new URLSearchParams()

  if (status) {
    searchParams.set('status', status)
  }

  const query = searchParams.toString()
  return request<OrderResponse[]>(`/api/orders${query ? `?${query}` : ''}`)
}

export function getOrderById(id: string): Promise<OrderResponse> {
  return request<OrderResponse>(`/api/orders/${id}`)
}

export function createOrder(data: CreateOrderRequest): Promise<OrderResponse> {
  return request<OrderResponse>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function applyToOrder(id: string | number): Promise<OrderApplication> {
  return request<OrderApplication>(`/api/orders/${id}/applications`, {
    method: 'POST',
  })
}

export function getOrderApplications(id: string | number): Promise<OrderApplication[]> {
  return request<OrderApplication[]>(`/api/orders/${id}/applications`)
}

export function acceptOrderApplication(id: string | number, applicationId: string | number): Promise<OrderResponse> {
  return request<OrderResponse>(`/api/orders/${id}/applications/${applicationId}/accept`, {
    method: 'POST',
  })
}

export function submitOrderDelivery(id: string | number): Promise<OrderResponse> {
  return request<OrderResponse>(`/api/orders/${id}/submit-delivery`, {
    method: 'POST',
  })
}

export function approveOrder(id: string | number): Promise<OrderResponse> {
  return request<OrderResponse>(`/api/orders/${id}/approve`, {
    method: 'POST',
  })
}

export function requestOrderRevision(id: string | number, feedback: string): Promise<OrderResponse> {
  return request<OrderResponse>(`/api/orders/${id}/request-revision`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  })
}

export function createUploadUrl(orderId: string | number, data: CreateUploadUrlRequest): Promise<UploadUrlResponse> {
  return request<UploadUrlResponse>(`/api/orders/${orderId}/upload-url`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function completeAttachmentUpload(orderId: string | number, attachmentId: string | number): Promise<void> {
  return request<void>(`/api/orders/${orderId}/attachments/${attachmentId}/complete`, {
    method: 'POST',
  })
}

export function getAttachmentDownloadUrl(orderId: string | number, attachmentId: string | number): Promise<AttachmentDownloadUrlResponse> {
  return request<AttachmentDownloadUrlResponse>(`/api/orders/${orderId}/attachments/${attachmentId}/download-url`)
}

export function deleteAttachment(orderId: string | number, attachmentId: string | number): Promise<void> {
  return request<void>(`/api/orders/${orderId}/attachments/${attachmentId}`, { method: 'DELETE' })
}

export function getOrderMessages(orderId: string | number): Promise<OrderMessage[]> {
  return request<OrderMessage[]>(`/api/orders/${orderId}/messages`)
}

export function getConversations(): Promise<ConversationSummary[]> {
  return request<ConversationSummary[]>('/api/orders/conversations')
}

export function sendOrderMessage(orderId: string | number, content: string): Promise<OrderMessage> {
  return request<OrderMessage>(`/api/orders/${orderId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export async function uploadFileToStorage(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  })

  if (!response.ok) {
    throw new Error(`Storage upload failed with status ${response.status}`)
  }
}
