export type OrderStatus = 'OPEN' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'REVISION_REQUESTED'
export type AttachmentStage = 'CLINICAL_INPUT' | 'CAD_DELIVERY'

export type ToothItem = {
  toothNumber: number
  serviceType: string
  notes?: string
}

export type CreateOrderRequest = {
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
  designerId?: number
  status: OrderStatus
  title: string
  description?: string
  totalAmount: number
  createdAt?: string
  updatedAt?: string
  items: OrderItemResponse[]
}

export type CreateUploadUrlRequest = {
  fileName: string
  mimeType: string
  size: number
  attachmentStage: AttachmentStage
}

export type UploadUrlResponse = {
  attachmentId: number
  uploadUrl: string
  storagePath: string
  expiresAt: string
}

export type OrderAttachment = {
  id: number | string
  fileName: string
  size: number
  stage: AttachmentStage
  mimeType?: string
  downloadUrl?: string
  viewerUrl?: string
}
