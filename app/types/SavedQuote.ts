/**
 * ORÇAMENTO SALVO (atividade 037) — `/quotes`.
 *
 * O custo não viaja do navegador: o servidor recalcula cada produto a partir de `configuration`
 * (o mesmo produto de `POST /quotes/calculate`) e aplica a fórmula do preço.
 */
import type { PricingTerms, ProductTaxes } from '@/types/ProductTaxes'
import type { QuoteProductRequest } from '@/types/Quote'
import type { QuoteProduct } from '@/types/QuoteDraft'

export type QuoteStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'

export interface SaveQuoteProductRequest {
  configuration: QuoteProductRequest
  /** O rascunho da tela, guardado como veio — é com ele que o assistente reabre o produto. */
  editorState: QuoteProduct
  productModelId: number | null
  typeName: string | null
  productTemplateId: number | null
  taxes: ProductTaxes
  pricing: PricingTerms
}

export interface SaveQuoteRequest {
  customerId: number
  clientId: number
  agencyCommissionPercent: number
  notes: string | null
  products: SaveQuoteProductRequest[]
}

export interface SavedQuoteProduct {
  id: number
  position: number
  name: string
  quantity: number
  widthMm: number
  heightMm: number
  productModelId: number | null
  productModelName: string | null
  typeName: string | null
  productTemplateId: number | null
  configuration: QuoteProductRequest
  editorState: QuoteProduct | null
  taxes: ProductTaxes
  pricing: PricingTerms
  totalCost: number
  unitCost: number
  salesCommissionPercent: number
  taxPercent: number
  markupPercent: number
  totalPrice: number
  unitPrice: number
}

export interface SavedQuote {
  id: number
  customerId: number
  number: number
  clientId: number
  clientName: string | null
  status: QuoteStatus
  agencyCommissionPercent: number
  notes: string | null
  totalCost: number
  productsTotal: number
  agencyCommissionAmount: number
  total: number
  products: SavedQuoteProduct[]
  createdAt: string | null
  updatedAt: string | null
}

export interface SavedQuoteRow {
  id: number
  number: number
  clientId: number
  clientName: string
  status: QuoteStatus
  productCount: number
  total: number
  createdAt: string
  updatedAt: string
}

export interface SavedQuotePage {
  items: SavedQuoteRow[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}
