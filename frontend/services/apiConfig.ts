const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL
  ?? process.env.NEXT_PUBLIC_API_BASE_URL
  ?? 'http://localhost:8080'

export const API_BASE_URL = configuredApiUrl.replace(/\/$/, '')
