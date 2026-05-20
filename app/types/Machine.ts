import type { FormattedDimension } from './FormattedDimension'

/**
 * Domínio de máquinas do parque fabril (cf. .docs/machines-frontend-guide.md).
 *
 * Cada máquina tem um `machineType` que pertence a uma `category`. A categoria
 * define o endpoint dedicado. O payload tem uma parte comum + um único bloco
 * específico cujo nome corresponde ao tipo selecionado.
 */

export type MachineCategory = 'PRINTING' | 'CUTTING' | 'FINISHING' | 'PREPRESS'

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

/** Faixa de formato de papel, em milímetros (lado do request). */
export interface FormatRangeRequest {
  minWidthMm: number
  maxWidthMm: number
  minHeightMm: number
  maxHeightMm: number
}

/** Faixa de formato devolvida pela API, com dimensões já formatadas. */
export interface FormatRangeResponse {
  minWidth: FormattedDimension
  maxWidth: FormattedDimension
  minHeight: FormattedDimension
  maxHeight: FormattedDimension
}

export interface GripMargins {
  gripMm: number
  borderMm: number
  gripLongSide: boolean
}

export interface PaperFeeder {
  maxStackHeightMm: number
  maxLoadKg: number
}

export interface HourlyCostRequest {
  depreciation: number
  occupancy: number
  energy: number
  maintenance: number
  labor: number
}

/** O `total` é calculado pelo backend (somente leitura na UI). */
export interface HourlyCostResponse extends HourlyCostRequest {
  total: number
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
  numberOfColors: number
  supportsNumbering: boolean
  setupTimes: OffsetSetupTimes
  speedProfile: OffsetSpeedProfile
}

export type DigitalCostModelType = 'CLICK_CHARGE' | 'WEAR_CONSUMABLES' | 'INK_PURCHASE'
export type ConsumableType = 'DRUM' | 'FUSER' | 'DEVELOPER'

export interface DigitalConsumable {
  consumableType: ConsumableType
  description: string | null
  price: number
  durabilityCopies: number
}

export interface ClickChargeCostModel {
  type: 'CLICK_CHARGE'
  pricePerMonoClick: number
  pricePerColorClick: number
}

export interface WearConsumablesCostModel {
  type: 'WEAR_CONSUMABLES'
  consumables: DigitalConsumable[]
}

export interface InkPurchaseCostModel {
  type: 'INK_PURCHASE'
  inkPricePerLiter: number
  averageCoveragePerSheetMl: number
}

export type DigitalCostModel =
  | ClickChargeCostModel
  | WearConsumablesCostModel
  | InkPurchaseCostModel

export interface DigitalCalibration {
  sheetsPerCalibration: number
  intervalMinutes: number
}

export interface DigitalBlock {
  pagesPerMinute: number
  supportsNumbering: boolean
  duplexMultiplier: number
  costModel: DigitalCostModel
  calibration: DigitalCalibration
}

export interface ScreenPrintingBlock {
  maxPrintAreaWidthMm: number
  maxPrintAreaHeightMm: number
  simultaneousColors: number
  baseSetupMinutes: number
}

export interface GuillotineBlock {
  cuttingWidthMm: number
  clampForceKgf: number
  secondsPerCut: number
  numberOfPrograms: number
  hasSafetyCurtain: boolean
}

export interface DieCuttingBlock {
  manufacturer: string
  model: string
  maxSheetWidthMm: number
  maxSheetHeightMm: number
  automaticFeeding: boolean
}

export interface PerforatingBlock {
  manufacturer: string
  model: string
  maxCuttingWidthMm: number
  sheetsPerCycle: number
  referencePaperWeightGsm: number
}

export interface FoldingBlock {
  manufacturer: string
  model: string
  maxFoldsPerSheet: number
  sheetsPerHour: number
}

export interface StitchingBlock {
  manufacturer: string
  model: string
  staplesPerMinute: number
  minWireThicknessMm: number
  maxWireThicknessMm: number
  maxStitchingThicknessMm: number
}

export interface HolePunchingBlock {
  manufacturer: string
  model: string
  perforationLengthMm: number
  sheetsPerStroke: number
  simultaneousHoles: number
}

export interface LaminatingBlock {
  manufacturer: string
  model: string
  maxLaminationWidthMm: number
  cruiseSpeedMetersPerHour: number
  supportsDuplex: boolean
}

export interface ImagesetterBlock {
  manufacturer: string
  model: string
  maxMediaWidthMm: number
  maxMediaHeightMm: number
  maxResolutionDpi: number
}

export interface CtpBlock {
  manufacturer: string
  model: string
  technology: string
  maxPlateWidthMm: number
  maxPlateHeightMm: number
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

/** Corpo de POST /{base} e PUT /{base}/{id}. `active` só é enviado no PUT. */
export interface MachineRequest extends MachineSpecificBlocks {
  customerId: number
  machineType: MachineType
  name: string
  active?: boolean
  formatRange: FormatRangeRequest
  gripMargins: GripMargins
  paperFeeder: PaperFeeder
  hourlyCost: HourlyCostRequest
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
  paperFeeder: PaperFeeder
  hourlyCost: HourlyCostResponse
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
