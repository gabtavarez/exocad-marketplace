export type OrderStatus = 'OPEN' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'REVISION_REQUESTED'
export type AttachmentStage = 'CLINICAL_INPUT' | 'CAD_DELIVERY'
export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

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
  attachments: OrderAttachment[]
  revisionFeedback?: string
  applicationStatus?: ApplicationStatus
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
  uploaded?: boolean
  createdAt?: string
  downloadUrl?: string
  viewerUrl?: string
}

export type AttachmentDownloadUrlResponse = {
  attachmentId: number
  downloadUrl: string
  viewUrl: string
  expiresAt: string
}

export type OrderApplication = {
  id: number
  orderId: number
  designerId: number
  designerName: string
  designerAvatarUrl?: string
  status: ApplicationStatus
  createdAt?: string
}

export type OrderMessage = {
  id: number
  orderId: number
  senderId: number
  senderName: string
  senderRole: 'DENTIST' | 'DESIGNER'
  content: string
  createdAt?: string
}

export type ConversationSummary = {
  orderId: number
  orderTitle: string
  patientReference: string
  otherPartyName: string
  otherPartyAvatarUrl?: string
  lastMessageText: string
  lastMessageCreatedAt?: string
  unreadCount: number
}
