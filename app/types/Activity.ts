/**
 * Atividade (028/029; tipos reestruturados na 032 — ajustes 0004 e 0006): etapa reutilizável de
 * execução.
 *
 * O TIPO diz a natureza da etapa e decide o que o orçamento vai perguntar — nem todo produto
 * imprime (às vezes é só cortar o papel), então a tinta saiu do cadastro e só é perguntada no
 * orçamento quando há uma atividade de IMPRESSÃO ativa:
 *
 *   MANUAL     nome + custo hora-homem (o orçamento pergunta as horas)
 *   PRINTING   tipo de tinta + 1..N impressoras (a tinta de cada face e a taxa de cobertura saem no orçamento)
 *   CUTTING    as guilhotinas do corte (1+; o orçamento escolhe a de melhor preço)
 *   FINISHING  subtipo (manual / acabamento / automatizada) + itens de insumo opcionais
 *   PACKAGING  família de papéis do pacote (/paper-types) + tarefa de acabamento Empacotar
 */
export type ActivityType = 'MANUAL' | 'PRINTING' | 'CUTTING' | 'FINISHING' | 'PACKAGING'

/** Subtipo do acabamento — de onde vem o custo. Era o "tipo" da atividade antes do ajuste 0004. */
export type ActivityFinishingSubtype = 'MANUAL' | 'FINISHING_TASK' | 'AUTOMATED'

/** Tipo de tinta da atividade de impressão. */
export type PrintingInkKind = 'CMYK' | 'PANTONE' | 'SCREEN_PRINTING'

/**
 * De onde vem o item consumido pela atividade (032 — ajuste 0006).
 * SUPPLY_GROUP: consome o grupo e o orçamento escolhe o insumo concreto.
 * SUPPLY:       consome aquele insumo do estoque, já decidido aqui.
 */
export type ActivitySupplySource = 'SUPPLY_GROUP' | 'SUPPLY'

/**
 * Item de consumo da atividade. Exatamente um dos dois ids vem preenchido, conforme o `source`.
 * Não tem quantidade nem base de cobrança: COMO se consome vem da unidade de medida do próprio
 * grupo/insumo.
 */
export interface ActivitySupply {
  source: ActivitySupplySource
  supplyGroupId: number | null
  supplyId: number | null
}

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
  /** Itens de insumo consumidos (grupo e/ou insumo do estoque) — só no tipo FINISHING. */
  supplies: ActivitySupply[]
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
  supplies?: ActivitySupply[]
}

export interface UpdateActivityRequest extends CreateActivityRequest {
  active: boolean
}
