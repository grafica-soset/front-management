/**
 * Tarefa de acabamento ("Acabamento") — atividade 029.
 * Recurso parametrizável por empresa, análogo às máquinas: cada tipo tem sua config própria
 * (tempos/valores) e um valor-hora comum. Usado pelas atividades do tipo FINISHING.
 */
export type FinishingTaskType = 'FOLD_TURNING' | 'PACKAGING'

export interface FinishingTask {
  id: number
  customerId: number
  type: FinishingTaskType
  name: string
  hourlyCost: number
  active: boolean
  // FOLD_TURNING
  foldTurnSecondsPerUnit: number | null
  // PACKAGING
  packagingMinutesPerPackage: number | null
  packagingPackageWeightKg: number | null
}

/** Item KeyValue da listagem (id + value + type). */
export interface FinishingTaskKeyValue {
  id: number
  value: string
  type: FinishingTaskType
  active: boolean
}

/** Corpo de POST /finishing-tasks. Valores decimais como string (preservação). */
export interface CreateFinishingTaskRequest {
  customerId: number
  type: FinishingTaskType
  name: string
  hourlyCost: string
  foldTurnSecondsPerUnit?: number | null
  packagingMinutesPerPackage?: number | null
  packagingPackageWeightKg?: string | null
}

export interface UpdateFinishingTaskRequest {
  customerId: number
  name: string
  hourlyCost: string
  active: boolean
  foldTurnSecondsPerUnit?: number | null
  packagingMinutesPerPackage?: number | null
  packagingPackageWeightKg?: string | null
}
