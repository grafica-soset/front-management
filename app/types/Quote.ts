/**
 * Contrato de `POST /quotes/calculate` (atividade 034).
 *
 * O cálculo é stateless: manda-se a configuração inteira e recebe-se o custo com toda a memória —
 * papel e formato escolhidos por folha, uma linha por impressão e o detalhe de cada etapa.
 * Dimensões em MILÍMETROS.
 *
 * Duas coisas que o contrato deixa explícitas e que a tela precisa respeitar:
 *
 * - a FOLHA guarda só o papel; cores, cobertura, tintas, impressora e chapa são de cada ETAPA de
 *   impressão, porque a mesma folha pode passar pela máquina mais de uma vez;
 * - refile e primeiro corte são etapas comuns, sem campo que as classifique: é a POSIÇÃO na lista
 *   que diz qual prepara a folha e qual entrega o formato final.
 */

export type SheetKind = 'BLADE' | 'VIA' | 'COVER'
export type ProductStructure = 'BLADE' | 'BLOCK'
export type QuoteInkType = 'LINE' | 'CMYK' | 'PANTONE'

// ─── Requisição ──────────────────────────────────────────────────────────────

export interface QuoteSheetRequest {
  number: number
  kind: SheetKind
  paperTypeId: number
  /** Troca manual do papel escolhido pelo sistema. */
  paperId?: number | null
  /**
   * Troca manual do formato de impressão: o NÚMERO do formato na tabela da folha inteira (o 9 do 66x96
   * é o 32x22). É preferência, não filtro — o motor continua devolvendo os outros em `alternatives`.
   */
  printFormatNumber?: number | null
}

/** O que uma impressão faz com uma folha. Cores zero nas duas faces = folha fora da impressão. */
export interface QuotePrintingSheetRequest {
  sheetNumber: number
  kind: SheetKind
  frontColors: number
  backColors: number
  frontInkSupplyIds: number[]
  backInkSupplyIds: number[]
  /** Obrigatória na face que imprime, de 1 a 100. */
  frontCoveragePercent?: number | null
  backCoveragePercent?: number | null
  printingMachineId?: number | null
}

export interface QuotePrintingRequest {
  /** Impressora do produto nesta impressão; nulo = o sistema escolhe a mais barata. */
  machineId?: number | null
  /** Chapa escolhida quando a impressora aceita mais de um tipo. */
  plateSupplyId?: number | null
  sheets: QuotePrintingSheetRequest[]
}

export interface QuoteStepRequest {
  activityId: number
  parameters?: {
    /** Atividade manual: o usuário informa MINUTOS. */
    laborMinutes?: number | null
    numberingUnits?: number
  }
  printing?: QuotePrintingRequest | null
}

export interface QuoteProductRequest {
  name: string
  quantity: number
  /** Tamanho pedido pelo cliente: aponta para o menor formato cadastrado que o comporta. */
  widthMm: number
  heightMm: number
  structure: ProductStructure
  sets: number
  sheets: QuoteSheetRequest[]
  steps: QuoteStepRequest[]
}

export interface CalculateQuoteRequest {
  customerId: number
  products: QuoteProductRequest[]
}

// ─── Resposta ────────────────────────────────────────────────────────────────

/**
 * Uma parcela da velocidade efetiva, em FOLHAS/HORA — tipo separado do tempo de propósito.
 * Cumulativas: a primeira é a velocidade de partida, as seguintes são os redutores (negativos).
 */
export interface MachineSpeedStageResponse {
  name: string
  detail: string
  sheetsPerHour: number
}

/** Uma etapa do tempo de máquina. O `detail` traz a CONTA: "4 × 12 min" explica os 48 minutos. */
export interface MachineTimeStageResponse {
  name: string
  detail: string
  minutes: number
}

export interface PrintingPassResponse {
  printingIndex: number
  activityId: number
  activityName: string
  machineId: number
  machineName: string
  machineType: 'OFFSET' | 'DIGITAL'
  frontColors: number
  backColors: number
  frontCoveragePercent: number
  backCoveragePercent: number
  inkType: QuoteInkType
  passes: number
  wasteSheets: number
  plateCount: number
  plateSupplyId: number | null
  plateSupplyName: string | null
  plateCost: number
  inkGrams: number
  inkCost: number
  printCost: number
  minutes: number
  /** Acerto: custo fixo do trabalho (chapa, registro, cor). Domina a tiragem curta. */
  setupMinutes: number
  /** Rodagem: o tempo que depende da tiragem, na velocidade efetiva abaixo. */
  runMinutes: number
  /** Velocidade efetiva neste trabalho, já com as reduções da faixa cadastrada. */
  sheetsPerHour: number
  /** Folhas que passaram pela máquina: tiragem + quebra de acerto. */
  sheetsRun: number
  /** O tempo etapa por etapa — as parcelas somam `minutes`. */
  timeStages: MachineTimeStageResponse[]
  /** De onde saiu a velocidade efetiva — as parcelas somam `sheetsPerHour`. */
  speedStages: MachineSpeedStageResponse[]
  notes: string[]
}

export interface SheetPlanResponse {
  paperId: number
  paperCode: string
  paperName: string
  wholeFormatName: string
  printFormatName: string
  printWidthMm: number
  printHeightMm: number
  printFormatNumber: number
  finalFormatName: string
  /** Numerador do critério de escolha: 36 ÷ 9 = 4 aplicações por folha. */
  finalFormatNumber: number
  finalWidthMm: number
  finalHeightMm: number
  applicationsPerSheet: number
  /** Preço da folha inteira: folhas inteiras × preço = custo do papel. */
  paperPricePerSheet: number
  /** Descidas de faca de cada corte, do cadastro de formatos. */
  preCutDescents: number
  refileDescents: number
  printSheetsNet: number
  wasteSheets: number
  wholeSheets: number
  printings: PrintingPassResponse[]
  paperCost: number
  plateCost: number
  inkCost: number
  printCost: number
  printMinutes: number
  totalCost: number
  notes: string[]
}

export interface SheetCostingResponse {
  number: number
  kind: SheetKind
  paperTypeId: number
  paperTypeName: string
  paperWeightGsm: number
  requiredSheets: number
  chosen: SheetPlanResponse
  alternatives: SheetPlanResponse[]
  totalCost: number
}

export interface StepCostingResponse {
  activityId: number
  activityName: string
  activityType: string
  machineId: number | null
  machineName: string | null
  totalMinutes: number
  totalCost: number
  detail: string
  /** Falso na impressão: o custo aparece para conferência, mas já está em Impressão/Chapas/Tinta. */
  countedInStepsTotal: boolean
  /** O tempo etapa por etapa, quando a máquina da etapa tem composição (guilhotina, por exemplo). */
  timeStages: MachineTimeStageResponse[]
}

export interface ProductCostingResponse {
  name: string
  quantity: number
  widthMm: number
  heightMm: number
  structure: ProductStructure
  sets: number
  sheetsPerUnit: number
  totalSheets: number
  finalFormatName: string
  sheets: SheetCostingResponse[]
  steps: StepCostingResponse[]
  paperCost: number
  plateCost: number
  inkCost: number
  printCost: number
  stepsCost: number
  totalCost: number
  unitCost: number
  totalMinutes: number
  warnings: string[]
}

export interface QuoteCostingResponse {
  products: ProductCostingResponse[]
  totalCost: number
}
