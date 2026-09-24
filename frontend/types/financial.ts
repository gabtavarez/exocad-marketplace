export type WalletTransactionType = 'ESCROW_HOLD' | 'ESCROW_RELEASE' | 'ESCROW_REFUND' | 'PLATFORM_FEE'

export type FinancialSummary = {
  availableBalance: number
  escrowBalance: number
  totalEarnedOrSpent: number
  invoicedCases: number
}

export type WalletTransaction = {
  id: number
  orderId: number
  type: WalletTransactionType
  amount: number
  status: 'COMPLETED'
  createdAt: string
}

export type TransactionPage = {
  content: WalletTransaction[]
  totalElements: number
  totalPages: number
  number: number
  first: boolean
  last: boolean
}
