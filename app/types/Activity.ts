/**
 * Atividade (atividades 028/029): etapa reutilizável de execução.
 * Fonte de custo por tipo: MANUAL (custo hora-homem), AUTOMATED (máquina), FINISHING (tarefa de
 * acabamento, podendo ter máquina junto). Pode consumir um grupo de insumo, informando a quantidade
 * (na unidade do grupo) e a base geométrica de cobrança.
 */
export type ActivityType = 'MANUAL' | 'AUTOMATED' | 'FINISHING'

/** Base geométrica do consumo de insumo: como a quantidade escala no orçamento. */
export type ConsumptionBasis = 'UNIT' | 'AREA_M2' | 'LINEAR_M'

export interface Activity {
  id: number
  customerId: number
  name: string
  type: ActivityType
  machineId: number | null
  laborHourlyCost: number | null
  finishingTaskId: number | null
  supplyGroupId: number | null
  supplyConsumptionQuantity: number | null
  supplyConsumptionBasis: ConsumptionBasis | null
  active: boolean
}

/** Item KeyValue da listagem de atividades (usado pelo modelo para escolher atividades). */
export interface ActivityKeyValue {
  id: number
  value: string
  type: ActivityType
  active: boolean
}

export interface ActivityPage {
  items: Activity[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

/** Corpo de POST /activities. Decimais como string (preservados). */
export interface CreateActivityRequest {
  customerId: number
  name: string
  type: ActivityType
  machineId?: number | null
  laborHourlyCost?: string | null
  finishingTaskId?: number | null
  supplyGroupId?: number | null
  supplyConsumptionQuantity?: string | null
  supplyConsumptionBasis?: ConsumptionBasis | null
}

export interface UpdateActivityRequest extends CreateActivityRequest {
  active: boolean
}
