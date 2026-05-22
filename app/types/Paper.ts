import type { PaperType } from './PaperType'
import type { FormattedDimension } from './FormattedDimension'

/**
 * Papel = SKU (variação de tamanho) dentro de um Agrupamento de medidas (`paperType`).
 *
 * Gramatura, espessura e face NÃO vivem aqui — são herdadas do agrupamento e devem
 * ser lidas de `paperType.weightPerM2Grams` / `paperType.thicknessMicrometers` /
 * `paperType.hasTwoSides` (somente leitura).
 *
 * `pricePerKg` e `pricePerSheet` vêm `null` quando não há contexto de empresa
 * (catálogo global / ADMIN sem customerId).
 */
export interface Paper {
  id: number
  paperType: PaperType
  code: string
  longName: string
  pricePerKg: number | null
  pricePerSheet: number | null
  width: FormattedDimension
  height: FormattedDimension
  isEnvelope: boolean
  active: boolean
}

/** Payload de POST /papers. `customerId` é obrigatório quando o caller é CUSTOMER sem ADMIN. */
export interface CreatePaperRequest {
  customerId?: number
  paperTypeId: number
  code: string
  longName: string
  pricePerKg: number
  widthMm: number
  heightMm: number
  isEnvelope: boolean
}

/** Payload de PUT /papers/{id}. */
export interface UpdatePaperRequest {
  customerId?: number
  paperTypeId: number
  code: string
  longName: string
  pricePerKg: number
  widthMm: number
  heightMm: number
  isEnvelope: boolean
  active: boolean
}
