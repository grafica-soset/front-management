import type { Person } from './Person'

/** Papel do usuário dentro de uma empresa (multi-tenant). */
export type TenantRole = 'ADMIN' | 'USER'

/**
 * Item retornado em GET /customer-users/page — visão para grids,
 * inclui usuários ativos e inativos.
 */
export interface CustomerUserPageItem {
  linkId: number
  personId: number
  name: string
  document: string
  email: string | null
  role: TenantRole
  active: boolean
}

/** Resposta paginada de GET /customer-users/page. */
export interface CustomerUserPage {
  items: CustomerUserPageItem[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

/**
 * Item de GET /customer-users — listagem enxuta (somente ativos),
 * ordenada por nome.
 */
export interface CustomerUserKeyValue {
  id: number
  value: string
  personId: number
}

/** Payload de POST /customer-users. */
export interface CreateCustomerUserRequest {
  name: string
  document: string
  email?: string
  phone?: string
  username: string
  password: string
  role: TenantRole
}

/** Resposta de POST /customer-users — 201 Created. */
export interface CreateCustomerUserResponse {
  linkId: number
  customerId: number
  person: Person
  role: TenantRole
  active: boolean
}

/** Resposta de PATCH /customer-users/{linkId}/deactivate. */
export interface CustomerUserLinkSummary {
  linkId: number
  customerId: number
  personId: number
  role: TenantRole
  active: boolean
}

/** Payload de PUT /customer-users/{linkId}/password. */
export interface ResetCustomerUserPasswordRequest {
  newPassword: string
}
