import type { PaperType } from './PaperType'
import type { FormattedDimension } from './FormattedDimension'

/** Papel global, conforme retornado em GET /papers. */
export interface Paper {
  id: number
  paperType: PaperType
  code: string
  longName: string
  shortName: string
  pricePerKg: number
  pricePerSheet: number
  width: FormattedDimension
  height: FormattedDimension
  thicknessMicrometers: number
  weightPerM2Grams: number
  isEnvelope: boolean
  hasTwoSides: boolean
  active: boolean
}

/** Payload de POST /papers. `customerId` é obrigatório quando o caller é CUSTOMER sem ADMIN. */
export interface CreatePaperRequest {
  customerId?: number
  paperTypeId: number
  code: string
  longName: string
  shortName: string
  pricePerKg: number
  pricePerSheet: number
  widthMm: number
  heightMm: number
  thicknessMicrometers: number
  weightPerM2Grams: number
  isEnvelope: boolean
  hasTwoSides: boolean
}

/** Payload de PUT /papers/{id}. */
export interface UpdatePaperRequest {
  paperTypeId: number
  code: string
  longName: string
  shortName: string
  pricePerKg: number
  pricePerSheet: number
  widthMm: number
  heightMm: number
  thicknessMicrometers: number
  weightPerM2Grams: number
  isEnvelope: boolean
  hasTwoSides: boolean
  active: boolean
}
