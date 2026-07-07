/**
 * Tarefa de acabamento ("Acabamento") — atividade 029.
 * Recurso parametrizável por empresa, análogo às máquinas: cada tipo tem sua config própria
 * (tempos/valores) e um valor-hora comum. Usado pelas atividades do tipo FINISHING.
 */
export type FinishingTaskType =
  | 'FOLD_TURNING'
  | 'PACKAGING'
  | 'SPIRAL_BINDING'
  | 'BLOCK_GLUING'
  | 'BAG_APPLICATION'
  | 'ENVELOPE_SEALING'
  | 'COLLATION'

/** Posição da Intercalação de Vias: para `viaCount` vias, `secondsPerSet` segundos por jogo. */
export interface CollationTier {
  viaCount: number
  secondsPerSet: number
}

/** Campos de configuração específicos por tipo (nulos quando não aplicáveis). */
export interface FinishingTaskConfigFields {
  // FOLD_TURNING
  foldTurnSecondsPerUnit?: number | null
  // PACKAGING
  packagingMinutesPerPackage?: number | null
  packagingPackageWeightKg?: number | string | null
  // SPIRAL_BINDING
  spiralMinLengthMm?: number | null
  spiralMinTimeSeconds?: number | null
  spiralMaxLengthMm?: number | null
  spiralMaxTimeSeconds?: number | null
  // BLOCK_GLUING
  blockStackingTimeSeconds?: number | null
  blockApplicationTimeSeconds?: number | null
  // BAG_APPLICATION
  bagFoldTurnSecondsPerUnit?: number | null
  bagGlueSecondsPerUnit?: number | null
  bagCloseSecondsPerUnit?: number | null
  // ENVELOPE_SEALING
  envelopeFoldTurnSecondsPerUnit?: number | null
  envelopeGlueSecondsPerUnit?: number | null
  envelopeCloseSecondsPerUnit?: number | null
  // COLLATION (Intercalação de Vias) — lista qtd de vias → tempo/jogo.
  collationTiers?: CollationTier[]
}

export interface FinishingTask extends FinishingTaskConfigFields {
  id: number
  customerId: number
  type: FinishingTaskType
  name: string
  hourlyCost: number
  active: boolean
}

/** Item KeyValue da listagem (id + value + type). */
export interface FinishingTaskKeyValue {
  id: number
  value: string
  type: FinishingTaskType
  active: boolean
}

/** Corpo de POST /finishing-tasks. Valores decimais como string (preservação). */
export interface CreateFinishingTaskRequest extends FinishingTaskConfigFields {
  customerId: number
  type: FinishingTaskType
  name: string
  hourlyCost: string
}

export interface UpdateFinishingTaskRequest extends FinishingTaskConfigFields {
  customerId: number
  name: string
  hourlyCost: string
  active: boolean
}
