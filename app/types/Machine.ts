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

export type MachineCategory = 'PRINTING' | 'CUTTING'
export type MachineType = 'OFFSET' | 'GUILLOTINE'

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
