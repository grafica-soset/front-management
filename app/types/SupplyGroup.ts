/**
 * Grupo de insumos (atividades 028/029): família de insumos (ex.: "Grampos", "Plásticos").
 * A atividade referencia o grupo; o orçamento escolhe o insumo específico do grupo.
 * A partir da 029 o grupo carrega a UNIDADE DE MEDIDA do consumo (usada pelas atividades).
 */
import type { SupplyUnitOfMeasure } from '@/types/Supply'

export interface SupplyGroup {
  id: number
  customerId: number
  name: string
  unitOfMeasure: SupplyUnitOfMeasure
  active: boolean
}

/** Item KeyValue da listagem de grupos (inclui a unidade para o form de atividade). */
export interface SupplyGroupKeyValue {
  id: number
  value: string
  unitOfMeasure: SupplyUnitOfMeasure
  active: boolean
}

export interface CreateSupplyGroupRequest {
  customerId: number
  name: string
  unitOfMeasure: SupplyUnitOfMeasure
}

export interface UpdateSupplyGroupRequest {
  customerId: number
  name: string
  unitOfMeasure: SupplyUnitOfMeasure
  active: boolean
}

/** Define quais insumos pertencem ao grupo (substitui o vínculo atual). */
export interface SetSupplyGroupSuppliesRequest {
  supplyIds: number[]
}
