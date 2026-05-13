import type { GlobalRole } from './Person'

/** Resposta de POST /auth/login. */
export interface LoginResponse {
  token: string
  personId: number
  name: string
  roles: GlobalRole[]
}
