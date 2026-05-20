/**
 * Catálogo de metadados de máquinas — fonte única de verdade para dirigir
 * menus, roteamento, formulários e leitura das responses
 * (cf. .docs/machines-frontend-guide.md, seção "Regra-chave").
 *
 * Aqui ficam: o mapa categoria → (slug, endpoint, tipos), os rótulos PT-BR dos
 * tipos, e os descritores de campos dos blocos específicos "planos" — usados
 * pelo renderer genérico SpecificFields. DIGITAL é o único bloco não-plano
 * (costModel polimórfico + lista de consumíveis) e tem componente dedicado.
 */
import type {
  DigitalBlock,
  DigitalConsumable,
  MachineCategory,
  MachineSpecificBlocks,
  MachineType,
} from '@/types/Machine'

export interface CategoryMeta {
  category: MachineCategory
  /** Slug usado na URL (ex.: /maquinas/impressao). */
  slug: string
  label: string
  /** Endpoint base da API (ex.: /printing-machines). */
  base: string
  types: MachineType[]
}

export const MACHINE_CATEGORIES: CategoryMeta[] = [
  {
    category: 'PRINTING',
    slug: 'impressao',
    label: 'Impressão',
    base: '/printing-machines',
    types: ['OFFSET', 'DIGITAL', 'SCREEN_PRINTING'],
  },
  {
    category: 'CUTTING',
    slug: 'corte',
    label: 'Corte',
    base: '/cutting-machines',
    types: ['GUILLOTINE', 'DIE_CUTTING', 'PERFORATING'],
  },
  {
    category: 'FINISHING',
    slug: 'acabamento',
    label: 'Acabamento',
    base: '/finishing-machines',
    types: ['FOLDING', 'STITCHING', 'HOLE_PUNCHING', 'LAMINATING'],
  },
  {
    category: 'PREPRESS',
    slug: 'pre-impressao',
    label: 'Pré-impressão',
    base: '/prepress-machines',
    types: ['IMAGESETTER', 'CTP', 'PLATE_COPIER'],
  },
]

export const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  OFFSET: 'Impressão Offset',
  DIGITAL: 'Impressão Digital',
  SCREEN_PRINTING: 'Serigrafia',
  GUILLOTINE: 'Guilhotina',
  DIE_CUTTING: 'Corte e Vinco',
  PERFORATING: 'Picotadeira / Serrilhadeira',
  FOLDING: 'Dobradeira',
  STITCHING: 'Grampeadeira',
  HOLE_PUNCHING: 'Furadeira',
  LAMINATING: 'Plastificadora / Laminadora',
  IMAGESETTER: 'Gravadora de Filmes',
  CTP: 'Gravadora de Chapas (CTP)',
  PLATE_COPIER: 'Prensa de Cópia de Chapas',
}

/** Chave do bloco específico no JSON, por tipo. */
export const MACHINE_TYPE_BLOCK_KEY: Record<MachineType, keyof MachineSpecificBlocks> = {
  OFFSET: 'offset',
  DIGITAL: 'digital',
  SCREEN_PRINTING: 'screenPrinting',
  GUILLOTINE: 'guillotine',
  DIE_CUTTING: 'dieCutting',
  PERFORATING: 'perforating',
  FOLDING: 'folding',
  STITCHING: 'stitching',
  HOLE_PUNCHING: 'holePunching',
  LAMINATING: 'laminating',
  IMAGESETTER: 'imagesetter',
  CTP: 'ctp',
  PLATE_COPIER: 'plateCopier',
}

const TYPE_CATEGORY: Record<MachineType, MachineCategory> = MACHINE_CATEGORIES.reduce(
  (acc, meta) => {
    for (const type of meta.types) acc[type] = meta.category
    return acc
  },
  {} as Record<MachineType, MachineCategory>,
)

export function categoryMetaBySlug(slug: string): CategoryMeta | null {
  return MACHINE_CATEGORIES.find((m) => m.slug === slug) ?? null
}

export function categoryMetaByCategory(category: MachineCategory): CategoryMeta | null {
  return MACHINE_CATEGORIES.find((m) => m.category === category) ?? null
}

export function machineTypeCategory(type: MachineType): MachineCategory {
  return TYPE_CATEGORY[type]
}

/** DIGITAL é o único bloco com componente dedicado (não dirigido por descritores). */
export function isCustomBlock(type: MachineType): boolean {
  return type === 'DIGITAL'
}

// ---------- Descritores de campos dos blocos planos ----------

export type FieldKind = 'int' | 'decimal' | 'boolean' | 'text' | 'select'

export interface FieldDescriptor {
  /** Caminho (dot-path) dentro do bloco específico, ex.: "setupTimes.setupMinutes". */
  key: string
  label: string
  kind: FieldKind
  min?: number
  max?: number
  step?: number
  maxLength?: number
  suffix?: string
  help?: string
  /** Opções para campos do tipo `select` (valor numérico). */
  options?: { value: number; label: string }[]
  /** Quando definido, o valor deve ser ≥ ao valor neste outro caminho. */
  gteField?: string
  /** Label do campo referenciado em `gteField`, para a mensagem de erro. */
  gteLabel?: string
}

const MANUFACTURER: FieldDescriptor = { key: 'manufacturer', label: 'Fabricante', kind: 'text', maxLength: 100 }
const MODEL: FieldDescriptor = { key: 'model', label: 'Modelo', kind: 'text', maxLength: 150 }

/** Descritores por tipo. DIGITAL fica de fora (componente dedicado). */
export const SPECIFIC_FIELDS: Partial<Record<MachineType, FieldDescriptor[]>> = {
  OFFSET: [
    {
      key: 'numberOfColors',
      label: 'Nº de cores (castelos)',
      kind: 'select',
      options: [
        { value: 1, label: '1' },
        { value: 2, label: '2' },
        { value: 3, label: '3' },
        { value: 4, label: '4' },
      ],
    },
    { key: 'supportsNumbering', label: 'Suporta numeração?', kind: 'boolean' },
    { key: 'setupTimes.setupMinutes', label: 'Setup (min)', kind: 'int', min: 0 },
    { key: 'setupTimes.feedSwapMinutes', label: 'Troca de pilha (min)', kind: 'int', min: 0 },
    { key: 'setupTimes.cleanupMinutes', label: 'Lavagem (min)', kind: 'int', min: 0 },
    { key: 'speedProfile.minSpeedSheetsPerHour', label: 'Vmín (folhas/h)', kind: 'int', min: 1 },
    {
      key: 'speedProfile.maxSpeedSheetsPerHour',
      label: 'Vmáx (folhas/h)',
      kind: 'int',
      min: 1,
      gteField: 'speedProfile.minSpeedSheetsPerHour',
      gteLabel: 'Vmín',
    },
    { key: 'speedProfile.cruiseSpeedSheets', label: 'Folhas de rampa', kind: 'int', min: 1 },
  ],
  SCREEN_PRINTING: [
    { key: 'maxPrintAreaWidthMm', label: 'Área máx — largura', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'maxPrintAreaHeightMm', label: 'Área máx — altura', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'simultaneousColors', label: 'Cores simultâneas (telas)', kind: 'int', min: 1 },
    { key: 'baseSetupMinutes', label: 'Setup base de tela (min)', kind: 'int', min: 0 },
  ],
  GUILLOTINE: [
    { key: 'cuttingWidthMm', label: 'Largura de corte / lâmina', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'clampForceKgf', label: 'Força do prensador', kind: 'decimal', min: 0.01, step: 0.01, suffix: 'kgf' },
    { key: 'secondsPerCut', label: 'Tempo médio por corte', kind: 'decimal', min: 0.001, step: 0.001, suffix: 's' },
    { key: 'numberOfPrograms', label: 'Programas de corte (0 = manual)', kind: 'int', min: 0 },
    { key: 'hasSafetyCurtain', label: 'Cortina de segurança?', kind: 'boolean' },
  ],
  DIE_CUTTING: [
    MANUFACTURER,
    MODEL,
    { key: 'maxSheetWidthMm', label: 'Largura máx', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'maxSheetHeightMm', label: 'Altura máx', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'automaticFeeding', label: 'Alimentação automática?', kind: 'boolean' },
  ],
  PERFORATING: [
    MANUFACTURER,
    MODEL,
    { key: 'maxCuttingWidthMm', label: 'Largura máx de corte/serrilha', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'sheetsPerCycle', label: 'Folhas por ciclo', kind: 'int', min: 1 },
    { key: 'referencePaperWeightGsm', label: 'Gramatura de referência', kind: 'int', min: 1, suffix: 'g/m²' },
  ],
  FOLDING: [
    MANUFACTURER,
    MODEL,
    { key: 'maxFoldsPerSheet', label: 'Dobras por folha', kind: 'int', min: 1 },
    { key: 'sheetsPerHour', label: 'Folhas/hora', kind: 'int', min: 1 },
  ],
  STITCHING: [
    MANUFACTURER,
    MODEL,
    { key: 'staplesPerMinute', label: 'Grampos por minuto', kind: 'int', min: 1 },
    { key: 'minWireThicknessMm', label: 'Espessura mín. do arame', kind: 'decimal', min: 0.01, step: 0.01, suffix: 'mm' },
    {
      key: 'maxWireThicknessMm',
      label: 'Espessura máx. do arame',
      kind: 'decimal',
      min: 0.01,
      step: 0.01,
      suffix: 'mm',
      gteField: 'minWireThicknessMm',
      gteLabel: 'espessura mín.',
    },
    { key: 'maxStitchingThicknessMm', label: 'Espessura máx. de grampeação', kind: 'int', min: 1, suffix: 'mm' },
  ],
  HOLE_PUNCHING: [
    MANUFACTURER,
    MODEL,
    { key: 'perforationLengthMm', label: 'Extensão de perfuração', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'sheetsPerStroke', label: 'Folhas por batida', kind: 'int', min: 1 },
    { key: 'simultaneousHoles', label: 'Furos simultâneos', kind: 'int', min: 1 },
  ],
  LAMINATING: [
    MANUFACTURER,
    MODEL,
    { key: 'maxLaminationWidthMm', label: 'Largura máx de laminação', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'cruiseSpeedMetersPerHour', label: 'Velocidade', kind: 'int', min: 1, suffix: 'm/h' },
    { key: 'supportsDuplex', label: 'Lamina duas faces?', kind: 'boolean' },
  ],
  IMAGESETTER: [
    MANUFACTURER,
    MODEL,
    { key: 'maxMediaWidthMm', label: 'Largura máx da mídia', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'maxMediaHeightMm', label: 'Altura máx da mídia', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'maxResolutionDpi', label: 'Resolução máx', kind: 'int', min: 1, suffix: 'dpi' },
  ],
  CTP: [
    MANUFACTURER,
    MODEL,
    { key: 'technology', label: 'Tecnologia', kind: 'text', maxLength: 150, help: 'Ex.: Laser Violeta 405nm' },
    { key: 'maxPlateWidthMm', label: 'Largura máx da chapa', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'maxPlateHeightMm', label: 'Altura máx da chapa', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'platesPerHour', label: 'Chapas/hora', kind: 'int', min: 1 },
    { key: 'resolutionDpi', label: 'Resolução', kind: 'int', min: 1, suffix: 'dpi' },
  ],
  PLATE_COPIER: [
    MANUFACTURER,
    MODEL,
    { key: 'doubleSided', label: 'Dupla face?', kind: 'boolean' },
    { key: 'hasVacuumSystem', label: 'Sistema de vácuo?', kind: 'boolean' },
    { key: 'hasUvExposure', label: 'Exposição UV?', kind: 'boolean' },
  ],
}

// ---------- Helpers de leitura/escrita por dot-path ----------

export function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  let target = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!
    if (typeof target[key] !== 'object' || target[key] === null) target[key] = {}
    target = target[key] as Record<string, unknown>
  }
  target[keys[keys.length - 1]!] = value
}

/** Default do bloco DIGITAL (costModel inicia em CLICK_CHARGE zerado). */
export function defaultDigitalBlock(): DigitalBlock {
  return {
    pagesPerMinute: 1,
    supportsNumbering: false,
    duplexMultiplier: 1,
    costModel: { type: 'CLICK_CHARGE', pricePerMonoClick: 0, pricePerColorClick: 0 },
    calibration: { sheetsPerCalibration: 0, intervalMinutes: 0 },
  }
}

/** Constrói um bloco específico vazio (defaults sensatos) para o tipo. */
export function defaultSpecificBlock(type: MachineType): Record<string, unknown> {
  if (type === 'DIGITAL') return defaultDigitalBlock() as unknown as Record<string, unknown>
  const descriptors = SPECIFIC_FIELDS[type] ?? []
  const block: Record<string, unknown> = {}
  for (const d of descriptors) {
    let value: unknown
    if (d.kind === 'boolean') value = false
    else if (d.kind === 'text') value = ''
    else if (d.kind === 'select') value = d.options?.[0]?.value ?? 0
    else value = d.min ?? 0
    setByPath(block, d.key, value)
  }
  return block
}

/** Valida um bloco plano contra seus descritores. Retorna erros por dot-path. */
export function validateDescriptors(
  block: Record<string, unknown>,
  descriptors: FieldDescriptor[],
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const d of descriptors) {
    const value = getByPath(block, d.key)
    if (d.kind === 'text') {
      const text = typeof value === 'string' ? value.trim() : ''
      if (!text) errors[d.key] = `Informe ${d.label.toLowerCase()}.`
      else if (d.maxLength && text.length > d.maxLength) errors[d.key] = `Máximo de ${d.maxLength} caracteres.`
      continue
    }
    if (d.kind === 'boolean' || d.kind === 'select') continue
    const num = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(num)) {
      errors[d.key] = 'Valor inválido.'
      continue
    }
    if (d.min !== undefined && num < d.min) {
      errors[d.key] = `Valor mínimo: ${d.min}.`
      continue
    }
    if (d.max !== undefined && num > d.max) {
      errors[d.key] = `Valor máximo: ${d.max}.`
      continue
    }
    if (d.gteField) {
      const ref = Number(getByPath(block, d.gteField))
      if (Number.isFinite(ref) && num < ref) {
        errors[d.key] = `Deve ser maior ou igual a ${d.gteLabel ?? d.gteField}.`
      }
    }
  }
  return errors
}

/** Rótulos dos tipos de consumível (bloco DIGITAL, WEAR_CONSUMABLES). */
export const CONSUMABLE_TYPE_LABELS: Record<DigitalConsumable['consumableType'], string> = {
  DRUM: 'Cilindro',
  FUSER: 'Fusor',
  DEVELOPER: 'Revelador',
}

/** Validação do bloco DIGITAL (costModel polimórfico). Erros por dot-path. */
export function validateDigital(block: DigitalBlock): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!(block.pagesPerMinute >= 1)) errors['pagesPerMinute'] = 'Valor mínimo: 1.'
  if (!(block.duplexMultiplier > 0)) errors['duplexMultiplier'] = 'Deve ser maior que zero.'
  if (block.calibration.sheetsPerCalibration < 0) errors['calibration.sheetsPerCalibration'] = 'Valor mínimo: 0.'
  if (block.calibration.intervalMinutes < 0) errors['calibration.intervalMinutes'] = 'Valor mínimo: 0.'

  const cm = block.costModel
  if (cm.type === 'CLICK_CHARGE') {
    if (cm.pricePerMonoClick < 0) errors['costModel.pricePerMonoClick'] = 'Valor mínimo: 0.'
    if (cm.pricePerColorClick < 0) errors['costModel.pricePerColorClick'] = 'Valor mínimo: 0.'
  } else if (cm.type === 'INK_PURCHASE') {
    if (cm.inkPricePerLiter < 0) errors['costModel.inkPricePerLiter'] = 'Valor mínimo: 0.'
    if (cm.averageCoveragePerSheetMl < 0) errors['costModel.averageCoveragePerSheetMl'] = 'Valor mínimo: 0.'
  } else {
    if (cm.consumables.length === 0) {
      errors['costModel.consumables'] = 'Adicione ao menos um consumível.'
    }
    cm.consumables.forEach((item, i) => {
      if (item.price < 0) errors[`costModel.consumables.${i}.price`] = 'Valor mínimo: 0.'
      if (!(item.durabilityCopies >= 1)) errors[`costModel.consumables.${i}.durabilityCopies`] = 'Valor mínimo: 1.'
      if (item.description && item.description.length > 150) {
        errors[`costModel.consumables.${i}.description`] = 'Máximo de 150 caracteres.'
      }
    })
  }
  return errors
}

/** Cria um costModel default para o tipo escolhido (usado ao trocar o tipo). */
export function defaultCostModel(type: DigitalBlock['costModel']['type']): DigitalBlock['costModel'] {
  if (type === 'CLICK_CHARGE') return { type: 'CLICK_CHARGE', pricePerMonoClick: 0, pricePerColorClick: 0 }
  if (type === 'INK_PURCHASE') return { type: 'INK_PURCHASE', inkPricePerLiter: 0, averageCoveragePerSheetMl: 0 }
  return { type: 'WEAR_CONSUMABLES', consumables: [] }
}
