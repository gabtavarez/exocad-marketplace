export type OrderStatus = 'OPEN' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED'

export type ToothItem = {
  toothNumber: number
  serviceType: string
  notes?: string
}

export type CreateOrderRequest = {
  userId: number
  title: string
  description?: string
  items: ToothItem[]
}

export type OrderItemResponse = {
  id: number
  toothNumber: number
  serviceType: string
  notes?: string
}

export type OrderResponse = {
  id: number
  userId: number
  status: OrderStatus
  title: string
  description?: string
  totalAmount: number
  createdAt?: string
  updatedAt?: string
  items: OrderItemResponse[]
}
