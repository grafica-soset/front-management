import type { Person } from './Person'
import type { TenantRole } from './CustomerUser'

/** Resposta de POST /customers. */
export interface CustomerResponse {
  id: number
  person: Person
  active: boolean
  linkId: number
  tenantRole: TenantRole
}
