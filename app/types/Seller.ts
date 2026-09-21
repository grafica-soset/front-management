export type RecordStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

/** Payload de POST /sellers e PUT /sellers/{id}. Telefones vão só com dígitos. */
export interface SellerRequest {
  name: string
  lastName: string
  phone?: string
  mobile?: string
  code: string
}

/** Resposta de GET/POST/PUT/PATCH /sellers. */
export interface Seller {
  id: number
  personId: number
  code: string
  name: string
  lastName: string
  phone?: string | null
  mobile?: string | null
  active: boolean
}

/** Item de GET /sellers — apenas vendedores ativos, para selects. */
export interface SellerListItem {
  id: number
  code: string
  name: string
}

export interface SellerPageItem {
  id: number
  code: string
  name: string
  lastName: string
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
