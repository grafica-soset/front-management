import type { FormattedDimension } from './FormattedDimension'

/**
 * Domínio de máquinas do parque fabril.
 *
 * Neste momento o cadastro suporta apenas a **impressora OFFSET** (categoria
 * PRINTING, endpoint `/printing-machines`), modelada com o **modelo de Rampa de
 * Velocidade** descrito em `.docs/offset-machines-api.md`. Os demais tipos foram
 * removidos enquanto validamos o fluxo com o cliente.
 *
 * Convenções:
 * - Dimensões são persistidas sempre em milímetros (largura × comprimento).
 * - Valores decimais (custo-hora e percentuais) trafegam como string para
 *   preservar a precisão exigida pelo backend (BigDecimal).
 */

export type MachineCategory = 'PRINTING' | 'CUTTING' | 'DIE_CUTTING'
export type MachineType = 'OFFSET' | 'GUILLOTINE' | 'DIE_CUTTING' | 'SCREEN_PRINTING'

/** Tipo de tinta usado na matriz de velocidade/quebra. */
export type InkType = 'LINE' | 'CMYK' | 'PANTONE'

// ---------- Blocos comuns ----------

/** Faixa de formato de papel (largura × comprimento), em milímetros. */
export interface FormatRangeRequest {
  minWidthMm: number
  maxWidthMm: number
  minLengthMm: number
  maxLengthMm: number
}

/** Faixa de formato devolvida pela API, com dimensões já formatadas. */
export interface FormatRangeResponse {
  minWidth: FormattedDimension
  maxWidth: FormattedDimension
  minLength: FormattedDimension
  maxLength: FormattedDimension
}

/** Margens técnicas (mm): pinça e limite máximo de mancha. */
export interface GripMargins {
  gripMm: number
  /**
   * Limite máximo de mancha (mm): borda não imprimível entre a máquina e o papel.
   * Quanto maior, menor a área de impressão útil.
   */
  maxImageMarginMm: number
}

/** Alimentador — apenas a altura máxima da pilha (mm). Obrigatório p/ OFFSET. */
export interface PaperFeeder {
  maxStackHeightMm: number
}

// ---------- Bloco OFFSET (Rampa de Velocidade) ----------

export interface OffsetSetupTimes {
  /** Acerto de Chapa por Cor (min): aplicado por cor (× numberOfColors). */
  plateSetupMinutesPerColor: number
  /** Acerto das Cores (min): aplicado por cor (× numberOfColors). */
  colorMatchingMinutes: number
  numberingSetupMinutesPerUnit: number
  paperFeedSetupMinutes: number
  feedTimeSecondsPerLoad: number
  feedLoadIncrementMm: number
  washMinutesPerColor: number
}

/** Ajustes por tipo de impressão — um item por LINE, CMYK e PANTONE. */
export interface OffsetInkSetting {
  inkType: InkType
  initialWasteSheets: number
  fullCoverageExtraWastePercent: string
}

/**
 * Faixa de quantidade configurável (por tipo de tinta). O usuário define quantas
 * faixas quiser, com início/fim livres. `toQuantity` nulo = faixa aberta
 * ("acima de"), permitida apenas na última faixa de cada tinta. As faixas de uma
 * mesma tinta devem ser contíguas (próxima `fromQuantity` = anterior `toQuantity` + 1).
 */
export interface OffsetTier {
  inkType: InkType
  fromQuantity: number
  toQuantity: number | null
  sheetsPerHour: number
  wastePercent: string
}

export interface OffsetSpeedRamp {
  /** Envelope de velocidade da máquina (piso e teto físicos). */
  minSpeedSheetsPerHour: number
  maxSpeedSheetsPerHour: number
  /** Teto de velocidade quando há numeração — único da máquina (não varia por tinta). */
  numberingMaxSheetsPerHour: number
  idealWeightMinGsm: number
  idealWeightMaxGsm: number
  belowIdealSpeedReducerPercent: string
  aboveIdealSpeedReducerPercent: string
  fullCoverageSpeedReducerPercent: string
  numberingSpeedReducerPercent: string
  inkSettings: OffsetInkSetting[]
  tiers: OffsetTier[]
}

export interface OffsetBlock {
  numberOfColors: number
  supportsNumbering: boolean
  maxNumberingUnits: number
  setupTimes: OffsetSetupTimes
  speedRamp: OffsetSpeedRamp
}

// ---------- Bloco GUILLOTINE (categoria CUTTING) ----------

/**
 * Tempos unitários da guilhotina (em segundos). A guilhotina corta o papel do formato
 * maior para o menor em múltiplos — a cada "descida" da lâmina há um corte e o operador
 * move o papel. O número de descidas vem da tabela de conversões do Formato (cutCount);
 * aqui só guardamos os tempos para o orçamento calcular o total.
 */
export interface GuillotineBlock {
  /** Tempo (s) de uma descida da lâmina — 1x a cada descida (corte). */
  bladeDescentTimeSeconds: number
  /** Tempo (s) de movimentação do papel — 1x a cada descida. */
  paperMovementTimeSeconds: number
  /** Tempo (s) de setup das medidas — 1x a cada medida distinta. */
  measureSetupTimeSeconds: number
  /** Tempo (s) para carregar uma leva de papel de altura feedLoadIncrementMm na mesa. */
  feedTimeSecondsPerLoad: number
  /** Altura (mm) de cada leva de alimentação (ex.: 40 mm = 4 cm). */
  feedLoadIncrementMm: number
}

// ---------- Bloco DIE_CUTTING (Corte e Vinco) ----------

/**
 * A máquina de corte e vinco é baseada na offset, mas NÃO imprime: sem cores, lavagem,
 * quebra ou rampa por tinta. A velocidade e o tempo de setup de faca vêm de uma MATRIZ DE
 * FORMATO (dois pontos: mínimo e máximo). Pode ser MANUAL ou AUTOMÁTICA — só a automática
 * tem alimentador (altura da pilha) e o bloco de alimentação (`feed`).
 */

/**
 * Ponto de calibração da matriz — request. As dimensões (largura × comprimento, em mm) são
 * digitadas diretamente (numéricas — não há mais vínculo com o cadastro de `/formats`).
 */
export interface DieCuttingFormatPointRequest {
  widthMm: number
  lengthMm: number
  sheetsPerHour: number
  /** Tempo de setup de faca (min) medido neste formato. */
  dieSetupMinutes: number
}

/** Bloco de alimentação de papel — apenas máquina automática. */
export interface DieCuttingFeed {
  paperFeedSetupMinutes: number
  feedTimeSecondsPerLoad: number
  feedLoadIncrementMm: number
}

/** Bloco corte e vinco — request (dimensões em mm, percentuais como string). */
export interface DieCuttingBlockRequest {
  automatic: boolean
  /** Setup de esquadros Frontal e Lateral (min). */
  squareSetupMinutes: number
  minFormat: DieCuttingFormatPointRequest
  maxFormat: DieCuttingFormatPointRequest
  /** Redutor (%) p/ formatos menores que o mínimo. */
  belowMinSpeedReducerPercent: string
  /** Redutor (%) p/ formatos maiores que o máximo. */
  aboveMaxSpeedReducerPercent: string
  /** Preenchido apenas quando `automatic` é true. */
  feed: DieCuttingFeed | null
}

/** Ponto de calibração devolvido pela API (dimensões numéricas já formatadas). */
export interface DieCuttingFormatPointResponse {
  width: FormattedDimension
  length: FormattedDimension
  sheetsPerHour: number
  dieSetupMinutes: number
}

/** Bloco corte e vinco devolvido pela API. */
export interface DieCuttingBlockResponse {
  automatic: boolean
  squareSetupMinutes: number
  minFormat: DieCuttingFormatPointResponse
  maxFormat: DieCuttingFormatPointResponse
  belowMinSpeedReducerPercent: number
  aboveMaxSpeedReducerPercent: number
  feed: DieCuttingFeed | null
}

// ---------- Request / Response ----------

/** Corpo de POST /printing-machines e PUT /printing-machines/{id}. */
export interface MachineRequest {
  customerId: number
  machineType: MachineType
  name: string
  /** Enviado apenas no PUT. */
  active?: boolean
  formatRange: FormatRangeRequest
  gripMargins: GripMargins
  paperFeeder: PaperFeeder
  /** Custo-Hora Máquina (R$) como string decimal. */
  hourlyCost: string
  /** Tempo de movimento e transporte de insumos (min) — comum a todos os tipos. */
  supplyTransportTimeMinutes: number
  offset: OffsetBlock
}

/** Corpo de POST/PUT /cutting-machines. A guilhotina não usa margens/cores/quebras/rampa. */
export interface CuttingMachineRequest {
  customerId: number
  machineType: 'GUILLOTINE'
  name: string
  active?: boolean
  formatRange: FormatRangeRequest
  paperFeeder: PaperFeeder
  hourlyCost: string
  supplyTransportTimeMinutes: number
  guillotine: GuillotineBlock
}

/**
 * Corpo de POST/PUT /die-cutting-machines. Tem margem da pinça (gripMm), mas NÃO há
 * "limite máximo de mancha" (não imprime). O alimentador (paperFeeder) só existe na
 * máquina automática; na manual vai `null`.
 */
export interface DieCuttingMachineRequest {
  customerId: number
  machineType: 'DIE_CUTTING'
  name: string
  active?: boolean
  formatRange: FormatRangeRequest
  gripMm: number
  paperFeeder: PaperFeeder | null
  hourlyCost: string
  supplyTransportTimeMinutes: number
  dieCutting: DieCuttingBlockRequest
}

/** Máquina de corte e vinco devolvida por GET/{id}, POST e PUT. */
export interface DieCuttingMachine {
  id: number
  customerId: number
  machineType: MachineType
  category: MachineCategory
  name: string
  active: boolean
  formatRange: FormatRangeResponse
  gripMm: number
  paperFeeder: PaperFeeder | null
  hourlyCost: number
  supplyTransportTimeMinutes: number
  dieCutting: DieCuttingBlockResponse | null
}

// ---------- Serigrafia (SCREEN_PRINTING) ----------
/**
 * A serigrafia imprime por TELAS (uma por cor): sem número de cores fixo nem rampa por tinta.
 * A velocidade vem de uma MATRIZ DE FORMATO (dois pontos: mínimo e máximo, com dimensões
 * numéricas). Os setups (tela, lavagem) e a quebra são por tela. Hoje só a máquina MANUAL é
 * suportada (sem alimentador).
 */

/** Ponto de calibração da matriz — request (dimensões em mm + velocidade). */
export interface ScreenPrintingFormatPointRequest {
  widthMm: number
  lengthMm: number
  sheetsPerHour: number
}

/** Bloco serigrafia — request (dimensões em mm, percentuais como string). */
export interface ScreenPrintingBlockRequest {
  /** Hoje sempre false (manual). */
  automatic: boolean
  /** Setup de esquadros Frontal e Lateral (min) — fixo. */
  squareSetupMinutes: number
  /** Tempo de setup de tela (min) — por tela. */
  screenSetupMinutes: number
  /** Lavagem por cor (min) — por tela. */
  washMinutesPerColor: number
  /** Quebra por cor (folhas) — por tela. */
  wasteSheetsPerColor: number
  minFormat: ScreenPrintingFormatPointRequest
  maxFormat: ScreenPrintingFormatPointRequest
  /** Redutor (%) p/ formatos menores que o mínimo. */
  belowMinSpeedReducerPercent: string
  /** Redutor (%) p/ formatos maiores que o máximo. */
  aboveMaxSpeedReducerPercent: string
}

/** Ponto de calibração devolvido pela API (dimensões numéricas já formatadas). */
export interface ScreenPrintingFormatPointResponse {
  width: FormattedDimension
  length: FormattedDimension
  sheetsPerHour: number
}

/** Bloco serigrafia devolvido pela API. */
export interface ScreenPrintingBlockResponse {
  automatic: boolean
  squareSetupMinutes: number
  screenSetupMinutes: number
  washMinutesPerColor: number
  wasteSheetsPerColor: number
  minFormat: ScreenPrintingFormatPointResponse
  maxFormat: ScreenPrintingFormatPointResponse
  belowMinSpeedReducerPercent: number
  aboveMaxSpeedReducerPercent: number
}

/**
 * Corpo de POST/PUT /screen-printing-machines. Tem os esquadros frontal e lateral (gripMm), mas
 * NÃO há "limite máximo de mancha" nem alimentador (a máquina é manual).
 */
export interface ScreenPrintingMachineRequest {
  customerId: number
  machineType: 'SCREEN_PRINTING'
  name: string
  active?: boolean
  formatRange: FormatRangeRequest
  gripMm: number
  hourlyCost: string
  supplyTransportTimeMinutes: number
  screenPrinting: ScreenPrintingBlockRequest
}

/** Máquina de serigrafia devolvida por GET/{id}, POST e PUT. */
export interface ScreenPrintingMachine {
  id: number
  customerId: number
  machineType: MachineType
  category: MachineCategory
  name: string
  active: boolean
  formatRange: FormatRangeResponse
  gripMm: number
  hourlyCost: number
  supplyTransportTimeMinutes: number
  screenPrinting: ScreenPrintingBlockResponse | null
}

/** Máquina completa devolvida por GET/{id}, POST e PUT. */
export interface Machine {
  id: number
  customerId: number
  machineType: MachineType
  category: MachineCategory
  name: string
  active: boolean
  formatRange: FormatRangeResponse
  gripMargins: GripMargins
  paperFeeder: PaperFeeder | null
  hourlyCost: number
  supplyTransportTimeMinutes: number
  offset: OffsetBlock | null
}

/** Máquina de corte (guilhotina) devolvida por GET/{id}, POST e PUT. */
export interface CuttingMachine {
  id: number
  customerId: number
  machineType: MachineType
  category: MachineCategory
  name: string
  active: boolean
  formatRange: FormatRangeResponse
  paperFeeder: PaperFeeder | null
  hourlyCost: number
  supplyTransportTimeMinutes: number
  guillotine: GuillotineBlock | null
}

/** Item da grid paginada (GET /printing-machines/page). */
export interface MachinePageItem {
  id: number
  name: string
  machineType: MachineType
  active: boolean
  hourlyCost: number
}

export interface MachinePage {
  items: MachinePageItem[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

/** Item do seletor enxuto (GET /printing-machines). */
export interface MachineKeyValue {
  id: number
  value: string
  machineType: MachineType
  active: boolean
}
