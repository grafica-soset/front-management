import type { FormattedDimension } from './FormattedDimension'

/**
 * Domínio de máquinas do parque fabril (cf. .docs/machines-frontend-guide.md).
 *
 * Cada máquina tem um `machineType` que pertence a uma `category`. A categoria
 * define o endpoint dedicado. O payload tem uma parte comum + um único bloco
 * específico cujo nome corresponde ao tipo selecionado.
 */

export type MachineCategory = 'PRINTING' | 'CUTTING' | 'DIE_CUTTING_CENTER' | 'FINISHING' | 'PREPRESS'

export type MachineType =
  | 'OFFSET'
  | 'DIGITAL'
  | 'SCREEN_PRINTING'
  | 'GUILLOTINE'
  | 'DIE_CUTTING'
  | 'PERFORATING'
  | 'FOLDING'
  | 'STITCHING'
  | 'HOLE_PUNCHING'
  | 'LAMINATING'
  | 'IMAGESETTER'
  | 'CTP'
  | 'PLATE_COPIER'

// ---------- Blocos comuns ----------

/**
 * Faixa de formato de papel — largura × comprimento, em milímetros (lado do
 * request). Não há altura: o papel é definido por largura e comprimento.
 */
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

/** Pinça: apenas a margem de pinça. Puxa-se sempre pelo lado maior. */
export interface GripMargins {
  gripMm: number
}

/**
 * Alimentação por pilha. Opcional: máquinas de alimentação manual omitem o
 * bloco (a máquina aguenta a carga total da altura cadastrada).
 */
export interface PaperFeeder {
  maxStackHeightMm: number
}

// ---------- Blocos específicos ----------

export interface OffsetSetupTimes {
  setupMinutes: number
  feedSwapMinutes: number
  cleanupMinutes: number
}

export interface OffsetSpeedProfile {
  minSpeedSheetsPerHour: number
  maxSpeedSheetsPerHour: number
  cruiseSpeedSheets: number
}

export interface OffsetBlock {
  /** Castelos de impressão (1–10). */
  numberOfColors: number
  supportsNumbering: boolean
  setupTimes: OffsetSetupTimes
  speedProfile: OffsetSpeedProfile
}

/**
 * Impressora digital. A velocidade real varia com cobertura e gramatura — o
 * cadastro guarda os valores de referência a 100% de cobertura; o cálculo
 * percentual acontece no orçamento.
 */
export interface DigitalBlock {
  pricePerMonoClick: number
  pricePerColorClick: number
  standardWeightGsm: number
  sheetsPerMinuteAt100Coverage: number
}

export interface ScreenPrintingBlock {
  maxPrintAreaWidthMm: number
  maxPrintAreaLengthMm: number
  simultaneousColors: number
  baseSetupMinutes: number
  /** Folhas por hora que um operador consegue (alimentação manual). */
  sheetsPerHour: number
}

export interface GuillotineBlock {
  cuttingWidthMm: number
  /** Setup por faca (repetido a cada faca informada no orçamento). */
  bladeSetupMinutes: number
  /** Setup de alimentação por pilha de altura máxima. */
  feedSetupMinutes: number
  /** Setup de medidas por sequência de corte (fixo por evento). */
  measureSetupMinutes: number
  numberOfPrograms: number
  hasSafetyCurtain: boolean
}

export interface DieCuttingBlock {
  manufacturer: string
  model: string
  maxSheetWidthMm: number
  maxSheetLengthMm: number
  automaticFeeding: boolean
  /** Setup de esquadro. */
  squareSetupMinutes: number
  /** Setup da faca, por lâmina informada no orçamento. */
  bladeSetupMinutes: number
  /** Cadência das automáticas (alimentação por pilha). */
  feedSheetsPerHour: number
  /** Cadência das manuais (folhas/hora que um operador faz). */
  manualSheetsPerHour: number
}

export interface PerforatingBlock {
  manufacturer: string
  model: string
  maxCuttingWidthMm: number
  minWeightGsm: number
  maxWeightGsm: number
  /** Número de picotes por vez (1–10). */
  maxPerforationsPerCycle: number
  allowsSegmentedPerforation: boolean
  /** Setup por lâmina/picote. */
  bladeSetupMinutes: number
  /** Velocidade constante, em cm de altura de papéis por hora. */
  constantSpeedSheetHeightCmPerHour: number
}

/** Unidade de dobra: um conjunto de bolsas, com ou sem faca. */
export interface FoldUnit {
  orderIndex: number
  /** Bolsas da unidade: 1, 2 ou 4. */
  pockets: number
  /** Unidade com faca (sempre uma das últimas; no máx. 2 no total). */
  hasKnife: boolean
}

export interface FoldingBlock {
  manufacturer: string
  model: string
  minWeightGsm: number
  maxWeightGsm: number
  idealWeightGsm: number
  maxSpeedSheetsPerHour: number
  foldUnits: FoldUnit[]
}

export interface StitchingBlock {
  manufacturer: string
  model: string
  automaticFeeding: boolean
  /** Área de manuseio (largura) — define o paralelismo de blocos. */
  handlingAreaWidthMm: number
  staplesSetupMinutes: number
  /** Tempo de alimentação por bloco na largura máxima. */
  feedMinutesPerBlockAtMaxWidth: number
  /** Cabeçotes (1–4). */
  numberOfHeads: number
  minWireThicknessMm: number
  maxWireThicknessMm: number
  /** Espessura máx. de grampeação (altura máxima do bloco). */
  maxStitchingThicknessMm: number
}

export interface HolePunchingBlock {
  manufacturer: string
  model: string
  /** Altura máxima de furação por bloco. */
  maxPunchBlockHeightMm: number
  setupMinutes: number
  blocksPerHour: number
}

export interface LaminatingBlock {
  manufacturer: string
  model: string
  minReelWidthMm: number
  maxReelWidthMm: number
  maxReelDiameterMm: number
  setupMinutes: number
  speedMetersPerMinute: number
}

export interface ImagesetterBlock {
  manufacturer: string
  model: string
  maxMediaWidthMm: number
  maxMediaLengthMm: number
  maxResolutionDpi: number
}

export interface CtpBlock {
  manufacturer: string
  model: string
  technology: string
  maxPlateWidthMm: number
  maxPlateLengthMm: number
  platesPerHour: number
  resolutionDpi: number
}

export interface PlateCopierBlock {
  manufacturer: string
  model: string
  doubleSided: boolean
  hasVacuumSystem: boolean
  hasUvExposure: boolean
}

/** Conjunto de blocos específicos — exatamente um é preenchido por máquina. */
export interface MachineSpecificBlocks {
  offset?: OffsetBlock
  digital?: DigitalBlock
  screenPrinting?: ScreenPrintingBlock
  guillotine?: GuillotineBlock
  dieCutting?: DieCuttingBlock
  perforating?: PerforatingBlock
  folding?: FoldingBlock
  stitching?: StitchingBlock
  holePunching?: HolePunchingBlock
  laminating?: LaminatingBlock
  imagesetter?: ImagesetterBlock
  ctp?: CtpBlock
  plateCopier?: PlateCopierBlock
}

// ---------- Request / Response ----------

/**
 * Corpo de POST /{base} e PUT /{base}/{id}. `active` só é enviado no PUT.
 * `paperFeeder` é omitido nas máquinas de alimentação manual.
 * `hourlyCost` é o Custo-Hora Máquina (R$/hora), um único número.
 */
export interface MachineRequest extends MachineSpecificBlocks {
  customerId: number
  machineType: MachineType
  name: string
  active?: boolean
  formatRange: FormatRangeRequest
  gripMargins: GripMargins
  paperFeeder?: PaperFeeder
  hourlyCost: number
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
  digital: DigitalBlock | null
  screenPrinting: ScreenPrintingBlock | null
  guillotine: GuillotineBlock | null
  dieCutting: DieCuttingBlock | null
  perforating: PerforatingBlock | null
  folding: FoldingBlock | null
  stitching: StitchingBlock | null
  holePunching: HolePunchingBlock | null
  laminating: LaminatingBlock | null
  imagesetter: ImagesetterBlock | null
  ctp: CtpBlock | null
  plateCopier: PlateCopierBlock | null
}

/** Item da grid paginada (GET /{base}/page). */
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

/** Item do seletor enxuto (GET /{base}). */
export interface MachineKeyValue {
  id: number
  value: string
  machineType: MachineType
  active: boolean
}
