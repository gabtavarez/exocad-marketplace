import type { FinancialSummary, TransactionPage } from '@/types/financial'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'
const TOKEN_KEY = 'exomarket.auth.token'

async function financialRequest<T>(path: string): Promise<T> {
  const token = typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    throw new Error('Não foi possível carregar os dados financeiros.')
  }
  return response.json() as Promise<T>
}

export function getFinancialSummary(): Promise<FinancialSummary> {
  return financialRequest('/api/financial/summary')
}

export function getFinancialStatement(page = 0, size = 25): Promise<TransactionPage> {
  return financialRequest(`/api/financial/statement?page=${page}&size=${size}`)
}
