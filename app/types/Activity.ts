/**
 * Atividade (atividade 028): etapa reutilizável de execução.
 * MANUAL usa custo por hora-homem; AUTOMATED usa uma máquina. Pode consumir um grupo de insumo.
 */
export type ActivityType = 'MANUAL' | 'AUTOMATED'

export interface Activity {
  id: number
  customerId: number
  name: string
  type: ActivityType
  machineId: number | null
  laborHourlyCost: number | null
  supplyGroupId: number | null
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

/** Corpo de POST /activities. `laborHourlyCost` como string (decimal preservado). */
export interface CreateActivityRequest {
  customerId: number
  name: string
  type: ActivityType
  machineId?: number | null
  laborHourlyCost?: string | null
  supplyGroupId?: number | null
}

export interface UpdateActivityRequest extends CreateActivityRequest {
  active: boolean
}
