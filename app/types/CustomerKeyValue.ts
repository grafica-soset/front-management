import type { TenantRole } from './CustomerUser'

/**
 * Resposta de GET /customers — contrato KeyValue (id + label exibível).
 *
 * Usado para popular o seletor de empresa (tenant) no frontend. `role` é o papel
 * do usuário logado naquela empresa (ADMIN global recebe ADMIN em todas).
 */
export interface CustomerKeyValue {
  id: number
  value: string
  role?: TenantRole | null
}
