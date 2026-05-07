import type { BasePagedQuery, PersonDto } from './shared'

/**
 * DTOs alinhados com PaperController.kt e PaperDtos.kt.
 */

export interface SkuDto {
  id?: number
  name: string
  code?: string | null
  description?: string | null
}

export interface PaperTypeDto {
  id: number
  name: string
}

export interface PaperResponse {
  id: number
  sku: SkuDto
  type: PaperTypeDto
  formatWidth: number
  formatHeight: number
  grammageG: number
  pricePerKg?: number | null
  pricePerSheet?: number | null
  supplier?: PersonDto | null
  active: boolean
  createdAt?: string
  updatedAt?: string
}

/**
 * O tipo do papel pode ser referenciado por id (já cadastrado) OU pelo
 * nome (`typeName`), que dispara o cadastro de um novo PaperType no backend.
 * Exatamente um dos dois deve ser informado.
 */
export interface CreatePaperRequest {
  sku: SkuDto
  typeId?: number
  typeName?: string
  formatWidth: number
  formatHeight: number
  grammageG: number
  pricePerKg?: number | null
  pricePerSheet?: number | null
  supplier?: PersonDto | null
  active: boolean
}

export interface UpdatePaperRequest {
  sku?: SkuDto
  typeId?: number
  typeName?: string
  formatWidth?: number
  formatHeight?: number
  grammageG?: number
  pricePerKg?: number | null
  pricePerSheet?: number | null
  supplier?: PersonDto | null
  active?: boolean
}

export interface PaperListQuery extends BasePagedQuery {
  name?: string
  typeId?: number
}
