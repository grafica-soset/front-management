import type { Person } from './Person'

export type TenantRole = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'SELLER'

/** Resposta de POST /customers. */
export interface CustomerResponse {
  id: number
  person: Person
  active: boolean
  linkId: number
  tenantRole: TenantRole
}
