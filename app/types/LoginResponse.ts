import type { GlobalRole } from './Person'

/** Resposta de POST /auth/login e POST /auth/refresh. */
export interface LoginResponse {
  token: string
  /** Refresh token opaco (string aleatória base64-url) — não é um JWT. */
  refreshToken: string
  personId: number
  name: string
  roles: GlobalRole[]
}
