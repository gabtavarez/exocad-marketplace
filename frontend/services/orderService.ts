import type { CreateOrderRequest, OrderResponse, OrderStatus } from '@/types/order'

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
