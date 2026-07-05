/**
 * Grupo de insumos (atividade 028): família de insumos (ex.: "Grampos", "Plásticos").
 * A atividade referencia o grupo; o orçamento escolhe o insumo específico do grupo.
 */
export interface SupplyGroup {
  id: number
  customerId: number
  name: string
  active: boolean
}

/** Item KeyValue da listagem de grupos. */
export interface SupplyGroupKeyValue {
  id: number
  value: string
  active: boolean
}

export interface CreateSupplyGroupRequest {
  customerId: number
  name: string
}

export interface UpdateSupplyGroupRequest {
  customerId: number
  name: string
  active: boolean
}

/** Define quais insumos pertencem ao grupo (substitui o vínculo atual). */
export interface SetSupplyGroupSuppliesRequest {
  supplyIds: number[]
}
