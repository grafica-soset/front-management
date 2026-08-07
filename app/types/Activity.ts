/**
 * Atividade (028/029; tipos reestruturados na 032 — ajuste 0004): etapa reutilizável de execução.
 *
 * O TIPO diz a natureza da etapa e decide o que o orçamento vai perguntar — nem todo produto
 * imprime (às vezes é só cortar o papel), então a tinta saiu do cadastro e só é perguntada no
 * orçamento quando há uma atividade de IMPRESSÃO ativa:
 *
 *   MANUAL     nome + custo hora-homem (o orçamento pergunta as horas)
 *   PRINTING   tipo de tinta + 1..N impressoras (a tinta de cada face sai no orçamento)
 *   CUTTING    as guilhotinas do corte (1+; o orçamento escolhe a de melhor preço)
 *   FINISHING  subtipo (manual / acabamento / automatizada) + insumo opcional
 *   PACKAGING  família de papéis do pacote (/paper-types) + tarefa de acabamento Empacotar
 */
export type ActivityType = 'MANUAL' | 'PRINTING' | 'CUTTING' | 'FINISHING' | 'PACKAGING'

/** Subtipo do acabamento — de onde vem o custo. Era o "tipo" da atividade antes do ajuste 0004. */
export type ActivityFinishingSubtype = 'MANUAL' | 'FINISHING_TASK' | 'AUTOMATED'

/** Tipo de tinta da atividade de impressão. */
export type PrintingInkKind = 'CMYK' | 'PANTONE' | 'SCREEN_PRINTING'

/** Base geométrica do consumo de insumo: como a quantidade escala no orçamento. */
export type ConsumptionBasis = 'UNIT' | 'AREA_M2' | 'LINEAR_M'

export interface Activity {
  id: number
  customerId: number
  name: string
  type: ActivityType
  /** Máquinas da atividade: 1+ na impressão e no corte, exatamente 1 no acabamento automatizado. */
  machineIds: number[]
  laborHourlyCost: number | null
  printingInkKind: PrintingInkKind | null
  finishingSubtype: ActivityFinishingSubtype | null
  finishingTaskId: number | null
  /** Família de papéis usada para empacotar — só no tipo PACKAGING. */
  paperTypeId: number | null
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
  machineIds?: number[]
  laborHourlyCost?: string | null
  printingInkKind?: PrintingInkKind | null
  finishingSubtype?: ActivityFinishingSubtype | null
  finishingTaskId?: number | null
  paperTypeId?: number | null
  supplyGroupId?: number | null
  supplyConsumptionQuantity?: string | null
  supplyConsumptionBasis?: ConsumptionBasis | null
}

export interface UpdateActivityRequest extends CreateActivityRequest {
  active: boolean
}
