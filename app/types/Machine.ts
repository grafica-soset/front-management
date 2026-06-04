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

export type MachineCategory = 'PRINTING'
export type MachineType = 'OFFSET'

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

/** Margem técnica — apenas a pinça (mm). */
export interface GripMargins {
  gripMm: number
}

/** Alimentador — apenas a altura máxima da pilha (mm). Obrigatório p/ OFFSET. */
export interface PaperFeeder {
  maxStackHeightMm: number
}

// ---------- Bloco OFFSET (Rampa de Velocidade) ----------

export interface OffsetSetupTimes {
  setupMinutes: number
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
  offset: OffsetBlock
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
  offset: OffsetBlock | null
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
