/**
 * PROPOSTA DE FORNECIMENTO (atividade 038) — `GET /quotes/{id}/proposal`.
 * Visão de leitura do orçamento salvo, pronta para imprimir.
 */
import type { QuoteStatus, SupplyConditions } from '@/types/SavedQuote'

export interface ProposalAddress {
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}

export interface ProposalCompany {
  name: string
  corporateName: string | null
  document: string
  email: string | null
  phone: string | null
  address: ProposalAddress | null
  logoUrl: string | null
}

export interface ProposalRecipient {
  name: string
  corporateName: string | null
  document: string
  contactName: string | null
  email: string | null
  phone: string | null
  mobile: string | null
}

export interface ProposalItem {
  position: number
  quantity: number
  description: string
  totalPrice: number
  unitPrice: number
}

export interface QuoteProposal {
  quoteId: number
  number: number
  status: QuoteStatus
  issuedAt: string | null
  company: ProposalCompany
  recipient: ProposalRecipient
  items: ProposalItem[]
  productsTotal: number
  agencyCommissionPercent: number
  agencyCommissionAmount: number
  total: number
  conditions: SupplyConditions
  notes: string | null
  signedBy: string | null
}
