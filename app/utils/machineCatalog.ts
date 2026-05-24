/**
 * Catálogo de metadados de máquinas — fonte única de verdade para dirigir
 * menus, roteamento, formulários e leitura das responses
 * (cf. .docs/machines-frontend-guide.md, seção "Regra-chave").
 *
 * Aqui ficam: o mapa categoria → (slug, endpoint, tipos), os rótulos PT-BR dos
 * tipos, e os descritores de campos dos blocos específicos "planos" — usados
 * pelo renderer genérico SpecificFields. FOLDING é o único bloco não-plano
 * (lista de unidades de dobra) e tem componente dedicado.
 */
import type {
  FoldingBlock,
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
    types: ['GUILLOTINE'],
  },
  {
    category: 'DIE_CUTTING_CENTER',
    slug: 'corte-e-vinco',
    label: 'Corte e Vinco',
    base: '/die-cutting-machines',
    types: ['DIE_CUTTING'],
  },
  {
    category: 'FINISHING',
    slug: 'acabamento',
    label: 'Acabamento',
    base: '/finishing-machines',
    types: ['FOLDING', 'STITCHING', 'HOLE_PUNCHING', 'LAMINATING', 'PERFORATING'],
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
  OFFSET: 'Impressora Offset',
  DIGITAL: 'Impressora Digital',
  SCREEN_PRINTING: 'Serigrafia',
  GUILLOTINE: 'Guilhotina',
  DIE_CUTTING: 'Corte e Vinco',
  PERFORATING: 'Picotadeira / Serrilhadeira',
  FOLDING: 'Dobradeira',
  STITCHING: 'Grampeadeira',
  HOLE_PUNCHING: 'Furadeira',
  LAMINATING: 'Plastificadora / Laminadora',
  IMAGESETTER: 'Gravadora de Filme',
  CTP: 'CTP (Computer-to-Plate)',
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

/** FOLDING é o único bloco com componente dedicado (lista de unidades de dobra). */
export function isCustomBlock(type: MachineType): boolean {
  return type === 'FOLDING'
}

// ---------- Alimentação (paperFeeder) por tipo ----------

/** Tipos que sempre alimentam por pilha (enviam paperFeeder). */
const ALWAYS_FEEDER: MachineType[] = ['OFFSET', 'DIGITAL', 'GUILLOTINE', 'FOLDING', 'PERFORATING']

/**
 * Indica se a máquina usa alimentação por pilha (e portanto envia `paperFeeder`).
 * Corte e Vinco e Grampeadeira dependem de `automaticFeeding`; serigrafia,
 * furadeira, plastificadora e pré-impressão nunca usam.
 */
export function machineUsesFeeder(type: MachineType, block: Record<string, unknown>): boolean {
  if (ALWAYS_FEEDER.includes(type)) return true
  if (type === 'DIE_CUTTING' || type === 'STITCHING') return block?.['automaticFeeding'] === true
  return false
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

/** Opções numéricas 1..n para selects (ex.: cores, picotes, cabeçotes). */
const rangeOptions = (from: number, to: number): { value: number; label: string }[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ value: from + i, label: String(from + i) }))

/** Descritores por tipo. FOLDING fica de fora (componente dedicado). */
export const SPECIFIC_FIELDS: Partial<Record<MachineType, FieldDescriptor[]>> = {
  OFFSET: [
    { key: 'numberOfColors', label: 'Nº de cores (castelos)', kind: 'select', options: rangeOptions(1, 10) },
    { key: 'supportsNumbering', label: 'Suporta numeração?', kind: 'boolean' },
    { key: 'setupTimes.setupMinutes', label: 'Setup (min)', kind: 'decimal', min: 0, step: 0.01, suffix: 'min' },
    { key: 'setupTimes.feedSwapMinutes', label: 'Troca de pilha (min)', kind: 'decimal', min: 0, step: 0.01, suffix: 'min' },
    { key: 'setupTimes.cleanupMinutes', label: 'Lavagem (min)', kind: 'decimal', min: 0, step: 0.01, suffix: 'min' },
    { key: 'speedProfile.minSpeedSheetsPerHour', label: 'Vmín (folhas/h)', kind: 'int', min: 1, suffix: 'folhas/h' },
    {
      key: 'speedProfile.maxSpeedSheetsPerHour',
      label: 'Vmáx (folhas/h)',
      kind: 'int',
      min: 1,
      suffix: 'folhas/h',
      gteField: 'speedProfile.minSpeedSheetsPerHour',
      gteLabel: 'Vmín',
    },
    { key: 'speedProfile.cruiseSpeedSheets', label: 'Folhas de rampa', kind: 'int', min: 1 },
  ],
  DIGITAL: [
    { key: 'pricePerMonoClick', label: 'Preço/clique mono (100% cobertura)', kind: 'decimal', min: 0, step: 0.0001, suffix: 'R$' },
    { key: 'pricePerColorClick', label: 'Preço/clique cor (100% cobertura)', kind: 'decimal', min: 0, step: 0.0001, suffix: 'R$' },
    { key: 'standardWeightGsm', label: 'Gramatura padrão', kind: 'int', min: 1, suffix: 'g/m²' },
    { key: 'sheetsPerMinuteAt100Coverage', label: 'Folhas/min (100% cobertura)', kind: 'int', min: 1, suffix: 'folhas/min' },
  ],
  SCREEN_PRINTING: [
    { key: 'maxPrintAreaWidthMm', label: 'Área máx — largura', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'maxPrintAreaLengthMm', label: 'Área máx — comprimento', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'simultaneousColors', label: 'Cores simultâneas (telas)', kind: 'int', min: 1 },
    { key: 'baseSetupMinutes', label: 'Setup base de tela (min)', kind: 'decimal', min: 0, step: 0.01, suffix: 'min' },
    { key: 'sheetsPerHour', label: 'Folhas/hora (operador)', kind: 'int', min: 1, suffix: 'folhas/h' },
  ],
  GUILLOTINE: [
    { key: 'cuttingWidthMm', label: 'Largura de corte / lâmina', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'bladeSetupMinutes', label: 'Setup por faca (min)', kind: 'decimal', min: 0, step: 0.01, suffix: 'min', help: 'Repetido a cada faca informada no orçamento.' },
    { key: 'feedSetupMinutes', label: 'Setup de alimentação (min)', kind: 'decimal', min: 0, step: 0.01, suffix: 'min', help: 'Por pilha de altura máxima.' },
    { key: 'measureSetupMinutes', label: 'Setup de medidas (min)', kind: 'decimal', min: 0, step: 0.01, suffix: 'min', help: 'Por sequência de corte (fixo por evento).' },
    { key: 'numberOfPrograms', label: 'Programas de corte (0 = manual)', kind: 'int', min: 0 },
    { key: 'hasSafetyCurtain', label: 'Cortina de segurança?', kind: 'boolean' },
  ],
  DIE_CUTTING: [
    MANUFACTURER,
    MODEL,
    { key: 'maxSheetWidthMm', label: 'Largura máx', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'maxSheetLengthMm', label: 'Comprimento máx', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'automaticFeeding', label: 'Alimentação automática?', kind: 'boolean' },
    { key: 'squareSetupMinutes', label: 'Setup de esquadro (min)', kind: 'decimal', min: 0, step: 0.01, suffix: 'min' },
    { key: 'bladeSetupMinutes', label: 'Setup da faca (min/lâmina)', kind: 'decimal', min: 0, step: 0.01, suffix: 'min', help: 'Por lâmina informada no orçamento.' },
    { key: 'feedSheetsPerHour', label: 'Cadência automática (folhas/h)', kind: 'int', min: 0, suffix: 'folhas/h' },
    { key: 'manualSheetsPerHour', label: 'Cadência manual (folhas/h)', kind: 'int', min: 0, suffix: 'folhas/h' },
  ],
  PERFORATING: [
    MANUFACTURER,
    MODEL,
    { key: 'maxCuttingWidthMm', label: 'Largura máx de corte/serrilha', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'minWeightGsm', label: 'Gramatura mín.', kind: 'int', min: 1, suffix: 'g/m²' },
    {
      key: 'maxWeightGsm',
      label: 'Gramatura máx.',
      kind: 'int',
      min: 1,
      suffix: 'g/m²',
      gteField: 'minWeightGsm',
      gteLabel: 'gramatura mín.',
    },
    { key: 'maxPerforationsPerCycle', label: 'Picotes por vez', kind: 'select', options: rangeOptions(1, 10) },
    { key: 'allowsSegmentedPerforation', label: 'Permite picote segmentado?', kind: 'boolean' },
    { key: 'bladeSetupMinutes', label: 'Setup por lâmina/picote (min)', kind: 'decimal', min: 0, step: 0.01, suffix: 'min' },
    { key: 'constantSpeedSheetHeightCmPerHour', label: 'Velocidade constante', kind: 'decimal', min: 0, step: 0.01, suffix: 'cm/h', help: 'Altura de papéis por hora.' },
  ],
  STITCHING: [
    MANUFACTURER,
    MODEL,
    { key: 'automaticFeeding', label: 'Alimentação automática?', kind: 'boolean' },
    { key: 'handlingAreaWidthMm', label: 'Área de manuseio (largura)', kind: 'int', min: 1, suffix: 'mm', help: 'Define quantos blocos cabem juntos.' },
    { key: 'staplesSetupMinutes', label: 'Setup dos grampos (min)', kind: 'decimal', min: 0, step: 0.01, suffix: 'min' },
    { key: 'feedMinutesPerBlockAtMaxWidth', label: 'Alimentação por bloco (min)', kind: 'decimal', min: 0, step: 0.01, suffix: 'min', help: 'Tempo na largura máxima.' },
    { key: 'numberOfHeads', label: 'Cabeçotes', kind: 'select', options: rangeOptions(1, 4) },
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
    { key: 'maxStitchingThicknessMm', label: 'Espessura máx. de grampeação', kind: 'int', min: 1, suffix: 'mm', help: 'Altura máxima do bloco.' },
  ],
  HOLE_PUNCHING: [
    MANUFACTURER,
    MODEL,
    { key: 'maxPunchBlockHeightMm', label: 'Altura máx. de furação por bloco', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'setupMinutes', label: 'Setup (min)', kind: 'decimal', min: 0, step: 0.01, suffix: 'min' },
    { key: 'blocksPerHour', label: 'Blocos por hora', kind: 'int', min: 1, suffix: 'blocos/h' },
  ],
  LAMINATING: [
    MANUFACTURER,
    MODEL,
    { key: 'minReelWidthMm', label: 'Largura mín. da bobina', kind: 'int', min: 1, suffix: 'mm' },
    {
      key: 'maxReelWidthMm',
      label: 'Largura máx. da bobina',
      kind: 'int',
      min: 1,
      suffix: 'mm',
      gteField: 'minReelWidthMm',
      gteLabel: 'largura mín.',
    },
    { key: 'maxReelDiameterMm', label: 'Diâmetro máx. da bobina', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'setupMinutes', label: 'Setup (min)', kind: 'decimal', min: 0, step: 0.01, suffix: 'min' },
    { key: 'speedMetersPerMinute', label: 'Velocidade', kind: 'decimal', min: 0.01, step: 0.01, suffix: 'm/min' },
  ],
  IMAGESETTER: [
    MANUFACTURER,
    MODEL,
    { key: 'maxMediaWidthMm', label: 'Largura máx da mídia', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'maxMediaLengthMm', label: 'Comprimento máx da mídia', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'maxResolutionDpi', label: 'Resolução máx', kind: 'int', min: 1, suffix: 'dpi' },
  ],
  CTP: [
    MANUFACTURER,
    MODEL,
    { key: 'technology', label: 'Tecnologia', kind: 'text', maxLength: 150, help: 'Ex.: Laser Violeta 405nm' },
    { key: 'maxPlateWidthMm', label: 'Largura máx da chapa', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'maxPlateLengthMm', label: 'Comprimento máx da chapa', kind: 'int', min: 1, suffix: 'mm' },
    { key: 'platesPerHour', label: 'Chapas/hora', kind: 'int', min: 1, suffix: 'chapas/h' },
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

// ---------- Bloco FOLDING (componente dedicado) ----------

/** Default do bloco FOLDING — inicia com uma unidade de dobra de 1 bolsa. */
export function defaultFoldingBlock(): FoldingBlock {
  return {
    manufacturer: '',
    model: '',
    minWeightGsm: 0,
    maxWeightGsm: 0,
    idealWeightGsm: 0,
    maxSpeedSheetsPerHour: 0,
    foldUnits: [{ orderIndex: 0, pockets: 1, hasKnife: false }],
  }
}

/** Constrói um bloco específico vazio (defaults sensatos) para o tipo. */
export function defaultSpecificBlock(type: MachineType): Record<string, unknown> {
  if (type === 'FOLDING') return defaultFoldingBlock() as unknown as Record<string, unknown>
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

/** Opções de bolsas por unidade de dobra. */
export const FOLD_POCKET_OPTIONS = [1, 2, 4]

/** Validação do bloco FOLDING. Erros por dot-path. */
export function validateFolding(block: FoldingBlock): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!block.manufacturer.trim()) errors['manufacturer'] = 'Informe o fabricante.'
  if (!block.model.trim()) errors['model'] = 'Informe o modelo.'
  if (!(block.minWeightGsm > 0)) errors['minWeightGsm'] = 'Deve ser maior que zero.'
  if (!(block.maxWeightGsm >= block.minWeightGsm)) errors['maxWeightGsm'] = 'Deve ser ≥ gramatura mín.'
  if (block.idealWeightGsm < block.minWeightGsm || block.idealWeightGsm > block.maxWeightGsm) {
    errors['idealWeightGsm'] = 'Deve estar entre a gramatura mín. e máx.'
  }
  if (!(block.maxSpeedSheetsPerHour >= 1)) errors['maxSpeedSheetsPerHour'] = 'Valor mínimo: 1.'

  if (block.foldUnits.length === 0) {
    errors['foldUnits'] = 'Adicione ao menos uma unidade de dobra.'
  }
  block.foldUnits.forEach((unit, i) => {
    if (!FOLD_POCKET_OPTIONS.includes(unit.pockets)) {
      errors[`foldUnits.${i}.pockets`] = 'Bolsas devem ser 1, 2 ou 4.'
    }
  })
  const knifeCount = block.foldUnits.filter((u) => u.hasKnife).length
  if (knifeCount > 2) errors['foldUnits'] = 'No máximo 2 unidades com faca.'
  // Unidades com faca devem ser as últimas (contíguas no fim).
  const firstKnife = block.foldUnits.findIndex((u) => u.hasKnife)
  if (firstKnife !== -1 && block.foldUnits.slice(firstKnife).some((u) => !u.hasKnife)) {
    errors['foldUnits'] = 'Unidades com faca devem ser sempre as últimas.'
  }
  return errors
}
