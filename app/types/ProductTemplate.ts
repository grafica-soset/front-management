/**
 * MODELO DE PRODUTO SALVO (atividade 037) — `/product-templates`.
 *
 * Único por Modelo + Tipo ("Blocos > Anotações"). Guarda só o que se repete entre um pedido e
 * outro: a estrutura, as etapas na ordem de produção, os impostos e o markup. Formato, quantidade,
 * papéis e os parâmetros de cada etapa são do pedido e ficam de fora.
 */
import type { PricingTerms, ProductTaxes } from '@/types/ProductTaxes'
import type { ProductStructure } from '@/types/QuoteDraft'

export interface ProductTemplateRequest {
  customerId: number
  productModelId: number
  typeName: string
  structure: ProductStructure
  blades: number
  vias: number
  hasCovers: boolean
  coverCount: number
  /** "As vias/lâminas são iguais?" — nulo com uma só. */
  identicalArtwork: boolean | null
  distinctArtworks: number | null
  /** Atividades na ordem de produção; pode repetir. */
  activityIds: number[]
  taxes: ProductTaxes
  pricing: PricingTerms
  active: boolean
}

export interface ProductTemplate extends ProductTemplateRequest {
  id: number
  productModelName: string | null
  /** "Blocos > Anotações". */
  label: string
  /** Comissão + impostos que compõem o preço + markup. */
  totalPricePercent: number
}

export interface ProductTemplateKeyValue {
  id: number
  value: string
  productModelId: number
  typeName: string
  active: boolean
}

export interface ProductTemplatePage {
  items: ProductTemplate[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}
