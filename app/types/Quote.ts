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
    /** Legado (pré-036): numeração por etapa. Prefira `numbering` no produto. */
    numberingUnits?: number
    /** Picote (atividade 035): picotes por folha e em quantas vias (nulo = todas). */
    perforationCount?: number
    perforatedSheetCount?: number | null
    /** Grampo (atividade 035): quantos grampos o talão leva. */
    stapleCount?: number
    /** Máquina escolhida para a etapa automatizada (nula = a mais barata que dá conta). */
    machineId?: number | null
  }
  printing?: QuotePrintingRequest | null
}

/**
 * NUMERAÇÃO do produto (atividade 036).
 *
 * Numerar é do TRABALHO, não de uma etapa: um talão numerado é numerado na tiragem inteira, e é
 * isso que decide quais impressoras podem fazê-lo. Só algumas offsets numeram (cada uma comporta
 * um número de numeradores); a digital numera sempre.
 */
export interface QuoteNumberingRequest {
  /** Quantos numeradores o trabalho usa; ≥ 1. Offset que comporta menos fica inelegível. */
  units: number
  /** Primeiro número da sequência. Não muda o preço — a produção precisa dele. */
  startNumber: number
  /** Dígitos do numerador (6 ⇒ 000001). */
  digits: number
}

export interface QuoteProductRequest {
  name: string
  quantity: number
  /** Tamanho pedido pelo cliente: aponta para o menor formato cadastrado que o comporta. */
  widthMm: number
  heightMm: number
  structure: ProductStructure
  sets: number
  /** Vias/lâminas iguais: mesma chapa, mesma montagem e todas na mesma impressora. */
  identicalArtwork?: boolean
  /** Quantos desenhos diferentes há entre as vias/lâminas. Nulo/ausente = todas diferentes. */
  distinctArtworkCount?: number | null
  /** Numeração do trabalho (atividade 036). Nula = produto sem numeração. */
  numbering?: QuoteNumberingRequest | null
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
  /** Descidas cadastradas do formato final, contadas da folha INTEIRA — o numerador do refile. */
  finalFormatDescents: number
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

/** O que aconteceu com uma combinação avaliada na escolha de formato e impressora. */
export type SelectionOutcome = 'CHOSEN' | 'VIABLE' | 'REJECTED'

/**
 * Uma linha da MEMÓRIA DE SELEÇÃO: uma combinação papel × formato × impressora que o motor testou.
 *
 * Os campos vêm nulos até onde a avaliação chegou — é isso que diz em que ponto a combinação caiu:
 * sem `printFormatName`, a recusa foi antes do formato; sem `machineName`, antes da impressora.
 */
export interface SelectionEntryResponse {
  outcome: SelectionOutcome
  paperId: number | null
  paperCode: string | null
  wholeFormatName: string | null
  printFormatName: string | null
  printFormatNumber: number | null
  printWidthMm: number | null
  printHeightMm: number | null
  applicationsPerSheet: number | null
  machineId: number | null
  machineName: string | null
  printSheetsNet: number | null
  wholeSheets: number | null
  totalCost: number | null
  /** Preenchido só em REJECTED: o que faltou, apontando o cadastro a corrigir. */
  reason: string | null
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
  /** Todas as combinações testadas — inclusive as recusadas, com o motivo. */
  selection: SelectionEntryResponse[]
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
  /** Máquinas avaliadas para a etapa (atividade 035): a escolhida e as recusadas, com o motivo. */
  machineOptions?: FinishingMachineOptionResponse[]
  /** Insumo consumido pela etapa — hoje o arame do grampo. */
  supplyUsage?: StepSupplyUsageResponse | null
}

/**
 * Uma máquina avaliada para a etapa. `minutes`/`cost` vêm nulos na recusada, e `reason` diz o que
 * impede — a grampeadeira de 2 cabeçotes recusada por 3 grampos aparece dizendo isso.
 */
export interface FinishingMachineOptionResponse {
  machineId: number
  machineName: string
  minutes: number | null
  cost: number | null
  chosen: boolean
  reason: string | null
}

/** O insumo consumido pela etapa, com a conta por extenso. */
export interface StepSupplyUsageResponse {
  supplyName: string
  quantity: number
  unitLabel: string
  unitCost: number
  cost: number
  detail: string
}

/** O peso de uma folha do produto no pacote: área do formato final × gramatura × folhas. */
export interface PackagingSheetWeightResponse {
  sheetNumber: number
  kind: SheetKind
  paperTypeName: string
  paperWeightGsm: number
  /** Folhas desta via/lâmina/capa que a tiragem consome. */
  sheets: number
  weightKg: number
}

/**
 * OS DADOS DO PACOTE: quanto pesa o trabalho, em quantos pacotes ele sai e o que custa embrulhar.
 *
 * O peso usa o formato FINAL PEDIDO (10,5 × 15,5 cm), não o formato cadastrado que o comporta: o
 * que entra no pacote é a peça refilada que o cliente recebe.
 */
export interface PackagingCostingResponse {
  activityName: string
  taskName: string
  widthMm: number
  heightMm: number
  weights: PackagingSheetWeightResponse[]
  totalWeightKg: number
  /** Teto de peso de um pacote, do cadastro da tarefa de empacotar. */
  packageWeightKg: number
  packages: number
  piecesPerPackage: number
  minutesPerPackage: number
  totalMinutes: number
  laborHourlyCost: number
  laborCost: number
  wrappingPaperName: string | null
  wrappingSheetsPerPackage: number
  wrappingSheets: number
  wrappingPricePerSheet: number
  wrappingCost: number
  totalCost: number
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
  /** A conta do pacote, aberta. Nula quando o produto não tem etapa de empacotamento. */
  packaging: PackagingCostingResponse | null
  paperCost: number
  plateCost: number
  inkCost: number
  printCost: number
  stepsCost: number
  totalCost: number
  unitCost: number
  totalMinutes: number
  /** A numeração pedida, com o último número da sequência já calculado. Nula = sem numeração. */
  numbering: QuoteNumberingResponse | null
  warnings: string[]
}

/** A numeração devolvida pelo motor (atividade 036). */
export interface QuoteNumberingResponse {
  units: number
  startNumber: number
  /** `startNumber + quantity - 1`: o número que a última unidade da tiragem deve trazer. */
  lastNumber: number
  digits: number
}

export interface QuoteCostingResponse {
  products: ProductCostingResponse[]
  totalCost: number
}
