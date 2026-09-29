import type { PersonType } from './Client'

export type RecordStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

/**
 * Payload de POST /sellers e PUT /sellers/{id}. CPF e telefones vão só com dígitos.
 */
export interface SellerRequest {
  personType: 'PHYSICAL'
  name: string
  document: string
  email?: string
  phone?: string
  mobile?: string
}

/** Resposta de GET/POST/PUT/PATCH /sellers. */
export interface Seller {
  id: number
  personId: number
  personType: PersonType
  name: string
  corporateName?: string | null
  document: string
  email?: string | null
  phone?: string | null
  mobile?: string | null
  active: boolean
}

/** Item de GET /sellers — apenas vendedores ativos, para selects. */
export interface SellerListItem {
  id: number
  name: string
}

export interface SellerPageItem {
  id: number
  personType: PersonType
  name: string
  document: string
  email?: string | null
  phone?: string | null
  mobile?: string | null
  active: boolean
}

export interface SellerPage {
  items: SellerPageItem[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}
