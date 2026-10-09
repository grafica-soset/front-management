/**
 * ORÇAMENTO SALVO (atividade 037) — `/quotes`.
 *
 * O custo não viaja do navegador: o servidor recalcula cada produto a partir de `configuration`
 * (o mesmo produto de `POST /quotes/calculate`) e aplica a fórmula do preço.
 */
import type { PricingTerms, ProductTaxes } from '@/types/ProductTaxes'
import type { ProductCostingResponse, QuoteProductRequest } from '@/types/Quote'
import type { QuoteProduct } from '@/types/QuoteDraft'

export type QuoteStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'

/** "Das Condições de Fornecimento" da proposta (atividade 038). Texto livre de cada orçamento. */
export interface SupplyConditions {
  proposalValidity: string | null
  deliveryTerms: string | null
  paymentTerms: string | null
  bankDetails: string | null
}

export interface SaveQuoteProductRequest {
  configuration: QuoteProductRequest
  /** O rascunho da tela, guardado como veio — é com ele que o assistente reabre o produto. */
  editorState: QuoteProduct
  productModelId: number | null
  typeName: string | null
  productTemplateId: number | null
  taxes: ProductTaxes
  pricing: PricingTerms
  /**
   * O cálculo do produto — a resposta de POST /quotes/calculate que o usuário viu (atividade 047).
   * O servidor grava como veio e tira dele o custo; sem ele, o produto não salva.
   */
  costing: ProductCostingResponse | null
  /** Unitário assumido (3 casas). Nulo = vale o calculado. */
  unitPriceOverride: number | null
}

export interface SaveQuoteRequest {
  customerId: number
  clientId: number
  agencyCommissionPercent: number
  notes: string | null
  conditions: SupplyConditions
  products: SaveQuoteProductRequest[]
  /** A proposta soma os produtos num total (atividade 044). */
  totalizeProposal: boolean
  /** Só na criação: a chave da tentativa de salvar, para repetir não duplicar (ver quoteDraft). */
  requestId?: string
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
  /** Preço da fórmula ÷ quantidade, com 3 casas (atividade 044). */
  calculatedUnitPrice: number
  /** Unitário assumido pelo orçamentista; nulo = vale o calculado. */
  unitPriceOverride: number | null
  /** Unitário praticado; o total é ele × quantidade. */
  unitPrice: number
  totalPrice: number
  /** Escolhido pelo cliente na aprovação. */
  approved: boolean
  /** O cálculo gravado ao salvar; nulo em orçamento anterior à 044. */
  costing: ProductCostingResponse | null
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
  conditions: SupplyConditions
  totalizeProposal: boolean
  /** Quem criou — assina a proposta. */
  createdByName: string | null
  totalCost: number
  productsTotal: number
  /** No aprovado, a soma dos produtos escolhidos; nulo nos demais. */
  approvedProductsTotal: number | null
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
