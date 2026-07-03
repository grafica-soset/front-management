/**
 * Tipos do módulo de Insumos (atividade 027).
 * Insumo = matéria-prima/consumível de uma empresa, com unidade de medida + custo. Classificado por
 * tipo fixo (INK/PLATE/OTHER) para a listagem "por tipo". Chapa (PLATE) guarda matriz + tamanho.
 */
import type { FormattedDimension } from './FormattedDimension'
import type { PlateType } from './PlateType'

export type SupplyType = 'INK' | 'PLATE' | 'OTHER'

export type SupplyUnitOfMeasure =
  | 'UNIT'
  | 'KILOGRAM'
  | 'GRAM'
  | 'LITER'
  | 'MILLILITER'
  | 'LINEAR'
  | 'AREA'
  | 'VOLUME'
  | 'SHEET'

/** Bloco de chapa enviado no cadastro/edição (tamanho em mm, canônico; espessura em µm). */
export interface PlateInfoRequest {
  plateType: PlateType
  widthMm: number
  heightMm: number
  thicknessMicrometers: number
}

/** Bloco de chapa devolvido pela API (tamanho já na unidade da empresa; espessura em µm). */
export interface PlateInfoResponse {
  plateType: PlateType
  width: FormattedDimension
  height: FormattedDimension
  thicknessMicrometers: number
}

/** Insumo detalhado (GET/{id}, POST, PUT). */
export interface Supply {
  id: number
  customerId: number
  type: SupplyType
  name: string
  unitOfMeasure: SupplyUnitOfMeasure
  unitCost: number
  description: string | null
  active: boolean
  plate: PlateInfoResponse | null
}

/** Item da listagem leve (KeyValue). */
export interface SupplyKeyValue {
  id: number
  value: string
  type: SupplyType
  active: boolean
}

/** Item da grid paginada. */
export interface SupplyPageItem {
  id: number
  type: SupplyType
  name: string
  unitOfMeasure: SupplyUnitOfMeasure
  unitCost: number
  active: boolean
  plate: PlateInfoResponse | null
}

export interface SupplyPage {
  items: SupplyPageItem[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

/** Corpo de POST /supplies. `unitCost` como string (decimal preservado). */
export interface CreateSupplyRequest {
  customerId: number
  type: SupplyType
  name: string
  unitOfMeasure: SupplyUnitOfMeasure
  unitCost: string
  description?: string | null
  plate?: PlateInfoRequest | null
}

/** Corpo de PUT /supplies/{id}. */
export interface UpdateSupplyRequest extends CreateSupplyRequest {
  active: boolean
}
