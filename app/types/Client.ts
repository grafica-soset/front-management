export type PersonType = 'PHYSICAL' | 'LEGAL'
export type AddressType = 'MAIN' | 'BILLING' | 'SHIPPING'
export type ClientStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

export interface ClientAddressInput {
  nickname?: string
  addressType: AddressType
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
}

export interface ClientContactInput {
  name: string
  position?: string
  email?: string
  phone?: string
  mobile?: string
  notes?: string
  primary: boolean
}

export interface RegisterClientRequest {
  personType: PersonType
  name: string
  corporateName?: string
  document: string
  email?: string
  phone?: string
  addresses: ClientAddressInput[]
  contacts: ClientContactInput[]
}

export type UpdateClientRequest = Omit<RegisterClientRequest, 'addresses' | 'contacts'>

export interface ClientAddress extends ClientAddressInput {
  id: number
  country: string
}

export interface ClientContact extends ClientContactInput {
  id: number
}

export interface Client {
  id: number
  personId: number
  personType: PersonType
  name: string
  corporateName?: string | null
  document: string
  email?: string | null
  phone?: string | null
  active: boolean
  addresses: ClientAddress[]
  contacts: ClientContact[]
}

/**
 * Item da busca de cliente do orçamento (`GET /clients/search`, atividade 037): nome, e-mail e
 * documento — o bastante para confirmar que é o cliente certo.
 */
export interface ClientSearchItem {
  id: number
  personType: PersonType
  name: string
  corporateName: string | null
  email: string | null
  document: string
}

export interface ClientKeyValue {
  id: number
  value: string
}

export interface ClientPageItem {
  id: number
  name: string
  document: string
  primaryContact?: string | null
  primaryCity?: string | null
  active: boolean
}

export interface ClientPage {
  items: ClientPageItem[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}
