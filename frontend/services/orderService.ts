import type { CreateOrderRequest, CreateUploadUrlRequest, OrderResponse, OrderStatus, UploadUrlResponse } from '@/types/order'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`)
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

export function createUploadUrl(orderId: string | number, data: CreateUploadUrlRequest): Promise<UploadUrlResponse> {
  return request<UploadUrlResponse>(`/api/orders/${orderId}/upload-url`, {
    method: 'POST',
    body: JSON.stringify(data),
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
