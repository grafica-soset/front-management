/**
 * Metadados e helpers do cadastro de máquinas.
 *
 * Hoje só existe a impressora OFFSET (endpoint `/printing-machines`). Este
 * arquivo concentra: rótulos PT-BR (tipo de máquina, tipo de tinta), construção
 * do bloco offset default, hidratação da response, helpers de faixas (tiers) e a
 * validação do formulário (cf. `.docs/offset-machines-api.md`).
 */
import type {
  DieCuttingBlockRequest,
  DieCuttingBlockResponse,
  DieCuttingFeed,
  GuillotineBlock,
  HolePunchingBlock,
  InkType,
  LaminatingBlock,
  LaminatingBlockResponse,
  MachineType,
  OffsetBlock,
  OffsetInkSetting,
  OffsetTier,
  ScreenPrintingBlockRequest,
  ScreenPrintingBlockResponse,
} from '@/types/Machine'

/** Endpoint base da API de impressão. */
export const PRINTING_MACHINES_BASE = '/printing-machines'

/** Endpoint base da API de corte (guilhotina). */
export const CUTTING_MACHINES_BASE = '/cutting-machines'

/** Endpoint base da API de corte e vinco. */
export const DIE_CUTTING_MACHINES_BASE = '/die-cutting-machines'

/** Endpoint base da API de serigrafia. */
export const SCREEN_PRINTING_MACHINES_BASE = '/screen-printing-machines'

/** Endpoint base da API de furadeira. */
export const HOLE_PUNCHING_MACHINES_BASE = '/hole-punching-machines'

/** Endpoint base da API de plastificadora. */
export const LAMINATING_MACHINES_BASE = '/laminating-machines'

export const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  OFFSET: 'Impressora Offset',
  GUILLOTINE: 'Guilhotina',
  DIE_CUTTING: 'Corte e Vinco',
  SCREEN_PRINTING: 'Serigrafia',
  HOLE_PUNCHING: 'Furadeira',
  LAMINATING: 'Plastificadora',
}

// ---------- Tipos de tinta ----------

export const INK_TYPES: InkType[] = ['LINE', 'CMYK', 'PANTONE']

export const INK_TYPE_LABELS: Record<InkType, string> = {
  LINE: 'Traço (linha)',
  CMYK: 'CMYK (escala)',
  PANTONE: 'Pantone (especial)',
}

// ---------- Bloco offset ----------

/** Cria uma faixa (tier) padrão para um tipo de tinta. */
export function makeTier(inkType: InkType, fromQuantity: number, toQuantity: number | null): OffsetTier {
  return { inkType, fromQuantity, toQuantity, sheetsPerHour: 0, wastePercent: '0' }
}

/** Faixas (tiers) de um tipo de tinta, na ordem em que aparecem no bloco. */
export function tiersForInk(block: OffsetBlock, ink: InkType): OffsetTier[] {
  return block.speedRamp.tiers.filter((t) => t.inkType === ink)
}

/**
 * Bloco offset vazio. Cada tinta começa com uma única faixa aberta (1 → ∞);
 * o usuário adiciona/edita faixas conforme a máquina (cf. doc — totalmente
 * configurável).
 */
export function defaultOffsetBlock(): OffsetBlock {
  return {
    numberOfColors: 1,
    supportsNumbering: false,
    maxNumberingUnits: 0,
    setupTimes: {
      plateSetupMinutesPerColor: 0,
      colorMatchingMinutes: 0,
      numberingSetupMinutesPerUnit: 0,
      paperFeedSetupMinutes: 0,
      feedTimeSecondsPerLoad: 0,
      feedLoadIncrementMm: 40,
      washMinutesPerColor: 0,
    },
    speedRamp: {
      minSpeedSheetsPerHour: 0,
      maxSpeedSheetsPerHour: 0,
      numberingMaxSheetsPerHour: 0,
      idealWeightMinGsm: 63,
      idealWeightMaxGsm: 180,
      belowIdealSpeedReducerPercent: '0',
      aboveIdealSpeedReducerPercent: '0',
      fullCoverageSpeedReducerPercent: '0',
      numberingSpeedReducerPercent: '0',
      inkSettings: INK_TYPES.map((inkType) => ({
        inkType,
        initialWasteSheets: 0,
        fullCoverageExtraWastePercent: '0',
      })),
      // Uma faixa aberta por tinta (0 → ∞); o usuário define as faixas conforme
      // a máquina (limites livres, validados por contiguidade).
      tiers: INK_TYPES.map((inkType) => makeTier(inkType, 0, null)),
    },
  }
}

/**
 * Normaliza o bloco offset vindo da API para uso na UI: tintas e ajustes na
 * ordem canônica de `INK_TYPES`, faixas agrupadas por tinta e ordenadas por
 * `fromQuantity`, e percentuais como string.
 *
 * Nem toda máquina imprime todos os tipos de impressão (Traço, CMYK, Pantone):
 * apenas os tipos que vierem da API ficam habilitados. Se nenhum vier (defensivo),
 * habilita todos para o formulário não quebrar.
 */
export function hydrateOffsetBlock(block: OffsetBlock): OffsetBlock {
  const base = defaultOffsetBlock()
  const apiInkSettings = block.speedRamp?.inkSettings ?? []
  const inkByType = new Map(apiInkSettings.map((s) => [s.inkType, s]))

  const present = INK_TYPES.filter((ink) => inkByType.has(ink))
  const enabledInks = present.length ? present : INK_TYPES

  const inkSettings: OffsetInkSetting[] = enabledInks.map((inkType) => {
    const found = inkByType.get(inkType)
    return found
      ? {
          inkType,
          initialWasteSheets: found.initialWasteSheets,
          fullCoverageExtraWastePercent: String(found.fullCoverageExtraWastePercent),
        }
      : { inkType, initialWasteSheets: 0, fullCoverageExtraWastePercent: '0' }
  })

  const tiers: OffsetTier[] = enabledInks.flatMap((inkType) => {
    const list = (block.speedRamp?.tiers ?? [])
      .filter((t) => t.inkType === inkType)
      .map((t) => ({
        inkType,
        fromQuantity: t.fromQuantity,
        toQuantity: t.toQuantity ?? null,
        sheetsPerHour: t.sheetsPerHour,
        wastePercent: String(t.wastePercent),
      }))
      .sort((a, b) => a.fromQuantity - b.fromQuantity)
    return list.length ? list : [makeTier(inkType, 0, null)]
  })

  return {
    numberOfColors: block.numberOfColors,
    supportsNumbering: block.supportsNumbering,
    maxNumberingUnits: block.maxNumberingUnits,
    setupTimes: { ...base.setupTimes, ...block.setupTimes },
    speedRamp: {
      minSpeedSheetsPerHour: block.speedRamp.minSpeedSheetsPerHour ?? 0,
      maxSpeedSheetsPerHour: block.speedRamp.maxSpeedSheetsPerHour ?? 0,
      numberingMaxSheetsPerHour: block.speedRamp.numberingMaxSheetsPerHour ?? 0,
      idealWeightMinGsm: block.speedRamp.idealWeightMinGsm,
      idealWeightMaxGsm: block.speedRamp.idealWeightMaxGsm,
      belowIdealSpeedReducerPercent: String(block.speedRamp.belowIdealSpeedReducerPercent),
      aboveIdealSpeedReducerPercent: String(block.speedRamp.aboveIdealSpeedReducerPercent),
      fullCoverageSpeedReducerPercent: String(block.speedRamp.fullCoverageSpeedReducerPercent),
      numberingSpeedReducerPercent: String(block.speedRamp.numberingSpeedReducerPercent),
      inkSettings,
      tiers,
    },
  }
}

// ---------- Bloco guilhotina ----------

/** Bloco guilhotina vazio (tempos zerados, em segundos; leva de alimentação de 40 mm = 4 cm). */
export function defaultGuillotineBlock(): GuillotineBlock {
  return {
    bladeDescentTimeSeconds: 0,
    paperMovementTimeSeconds: 0,
    measureSetupTimeSeconds: 0,
    feedTimeSecondsPerLoad: 0,
    feedLoadIncrementMm: 40,
  }
}

/** Normaliza o bloco guilhotina vindo da API, garantindo todos os campos. */
export function hydrateGuillotineBlock(block: GuillotineBlock | null): GuillotineBlock {
  const base = defaultGuillotineBlock()
  if (!block) return base
  return {
    bladeDescentTimeSeconds: block.bladeDescentTimeSeconds ?? 0,
    paperMovementTimeSeconds: block.paperMovementTimeSeconds ?? 0,
    measureSetupTimeSeconds: block.measureSetupTimeSeconds ?? 0,
    feedTimeSecondsPerLoad: block.feedTimeSecondsPerLoad ?? 0,
    feedLoadIncrementMm: block.feedLoadIncrementMm ?? base.feedLoadIncrementMm,
  }
}

/**
 * Valida o bloco guilhotina: tempos não-negativos e a altura de cada leva de
 * alimentação (≥ 1 mm), igual à Offset.
 */
export function validateGuillotine(block: GuillotineBlock): Record<string, string> {
  const errors: Record<string, string> = {}
  const keys: (keyof GuillotineBlock)[] = [
    'bladeDescentTimeSeconds',
    'paperMovementTimeSeconds',
    'measureSetupTimeSeconds',
    'feedTimeSecondsPerLoad',
  ]
  for (const k of keys) {
    if (!(block[k] >= 0)) errors[k] = 'Valor mínimo: 0.'
  }
  if (!(block.feedLoadIncrementMm >= 1)) errors['feedLoadIncrementMm'] = 'Valor mínimo: 1.'
  return errors
}

// ---------- Bloco furadeira (HOLE_PUNCHING) ----------

/** Bloco furadeira vazio (tempos zerados; leva de alimentação de 40 mm = 4 cm). */
export function defaultHolePunchingBlock(): HolePunchingBlock {
  return {
    squareSetupMinutes: 0,
    drillDescentTimeSeconds: 0,
    paperMovementTimeSeconds: 0,
    feedTimeSecondsPerLoad: 0,
    feedLoadIncrementMm: 40,
  }
}

/** Normaliza o bloco furadeira vindo da API, garantindo todos os campos. */
export function hydrateHolePunchingBlock(block: HolePunchingBlock | null): HolePunchingBlock {
  const base = defaultHolePunchingBlock()
  if (!block) return base
  return {
    squareSetupMinutes: block.squareSetupMinutes ?? 0,
    drillDescentTimeSeconds: block.drillDescentTimeSeconds ?? 0,
    paperMovementTimeSeconds: block.paperMovementTimeSeconds ?? 0,
    feedTimeSecondsPerLoad: block.feedTimeSecondsPerLoad ?? 0,
    feedLoadIncrementMm: block.feedLoadIncrementMm ?? base.feedLoadIncrementMm,
  }
}

/**
 * Valida o bloco furadeira: setup do esquadro e tempos não-negativos; a altura de cada leva de
 * alimentação (≥ 1 mm), igual à guilhotina.
 */
export function validateHolePunching(block: HolePunchingBlock): Record<string, string> {
  const errors: Record<string, string> = {}
  const keys: (keyof HolePunchingBlock)[] = [
    'squareSetupMinutes',
    'drillDescentTimeSeconds',
    'paperMovementTimeSeconds',
    'feedTimeSecondsPerLoad',
  ]
  for (const k of keys) {
    if (!(block[k] >= 0)) errors[k] = 'Valor mínimo: 0.'
  }
  if (!(block.feedLoadIncrementMm >= 1)) errors['feedLoadIncrementMm'] = 'Valor mínimo: 1.'
  return errors
}

// ---------- Bloco plastificadora (LAMINATING) ----------

/** Bloco plastificadora vazio (velocidade 1 m/min como ponto de partida). */
export function defaultLaminatingBlock(): LaminatingBlock {
  return {
    setupMinutes: 0,
    speedMetersPerMinute: '1',
  }
}

/** Normaliza o bloco plastificadora vindo da API para o formato de request (velocidade como string). */
export function hydrateLaminatingBlock(block: LaminatingBlockResponse | null): LaminatingBlock {
  const base = defaultLaminatingBlock()
  if (!block) return base
  return {
    setupMinutes: block.setupMinutes ?? 0,
    speedMetersPerMinute: String(block.speedMetersPerMinute),
  }
}

/** Valida o bloco plastificadora: setup ≥ 0 e velocidade (m/min) > 0. */
export function validateLaminating(block: LaminatingBlock): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!(block.setupMinutes >= 0)) errors['setupMinutes'] = 'Valor mínimo: 0.'
  const speed = Number(block.speedMetersPerMinute)
  if (!Number.isFinite(speed) || speed <= 0) errors['speedMetersPerMinute'] = 'Informe uma velocidade maior que zero.'
  return errors
}

// ---------- Bloco corte e vinco (DIE_CUTTING) ----------

/** Bloco de alimentação default (apenas automática; leva de 40 mm = 4 cm). */
export function defaultDieCuttingFeed(): DieCuttingFeed {
  return { paperFeedSetupMinutes: 0, feedTimeSecondsPerLoad: 0, feedLoadIncrementMm: 40 }
}

/** Bloco corte e vinco vazio (manual por padrão; matriz com dimensões zeradas). */
export function defaultDieCuttingBlock(): DieCuttingBlockRequest {
  return {
    automatic: false,
    squareSetupMinutes: 0,
    minFormat: { widthMm: 0, lengthMm: 0, sheetsPerHour: 0, dieSetupMinutes: 0 },
    maxFormat: { widthMm: 0, lengthMm: 0, sheetsPerHour: 0, dieSetupMinutes: 0 },
    belowMinSpeedReducerPercent: '0',
    aboveMaxSpeedReducerPercent: '0',
    feed: null,
  }
}

/** Normaliza o bloco corte e vinco vindo da API para o formato de request (dimensões em mm + strings). */
export function hydrateDieCuttingBlock(block: DieCuttingBlockResponse | null): DieCuttingBlockRequest {
  const base = defaultDieCuttingBlock()
  if (!block) return base
  return {
    automatic: block.automatic,
    squareSetupMinutes: block.squareSetupMinutes ?? 0,
    minFormat: {
      widthMm: block.minFormat.width.millimeters,
      lengthMm: block.minFormat.length.millimeters,
      sheetsPerHour: block.minFormat.sheetsPerHour,
      dieSetupMinutes: block.minFormat.dieSetupMinutes,
    },
    maxFormat: {
      widthMm: block.maxFormat.width.millimeters,
      lengthMm: block.maxFormat.length.millimeters,
      sheetsPerHour: block.maxFormat.sheetsPerHour,
      dieSetupMinutes: block.maxFormat.dieSetupMinutes,
    },
    belowMinSpeedReducerPercent: String(block.belowMinSpeedReducerPercent),
    aboveMaxSpeedReducerPercent: String(block.aboveMaxSpeedReducerPercent),
    feed: block.automatic ? { ...defaultDieCuttingFeed(), ...(block.feed ?? {}) } : null,
  }
}

/**
 * Valida o bloco corte e vinco: setup de esquadros ≥ 0; a matriz de formato (dois pontos) com
 * dimensões e velocidade ≥ 1; redutores ≥ 0; e — só na automática — os campos de alimentação.
 * (A regra "máximo ≥ mínimo" é validada no formulário pelo tamanho linear das dimensões; o
 * backend também a reforça.)
 */
export function validateDieCutting(block: DieCuttingBlockRequest): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!(block.squareSetupMinutes >= 0)) errors['squareSetupMinutes'] = 'Valor mínimo: 0.'

  for (const which of ['minFormat', 'maxFormat'] as const) {
    const p = block[which]
    if (!(p.widthMm >= 1)) errors[`${which}.widthMm`] = 'Informe a largura (≥ 1).'
    if (!(p.lengthMm >= 1)) errors[`${which}.lengthMm`] = 'Informe o comprimento (≥ 1).'
    if (!(p.sheetsPerHour >= 1)) errors[`${which}.sheetsPerHour`] = 'Informe a velocidade (≥ 1).'
    if (!(p.dieSetupMinutes >= 0)) errors[`${which}.dieSetupMinutes`] = 'Valor mínimo: 0.'
  }

  if (!isNonNegativeNumber(block.belowMinSpeedReducerPercent)) errors['belowMinSpeedReducerPercent'] = 'Percentual inválido.'
  if (!isNonNegativeNumber(block.aboveMaxSpeedReducerPercent)) errors['aboveMaxSpeedReducerPercent'] = 'Percentual inválido.'

  if (block.automatic) {
    const f = block.feed
    if (!f) {
      errors['feed'] = 'Informe os dados de alimentação.'
    } else {
      if (!(f.paperFeedSetupMinutes >= 0)) errors['feed.paperFeedSetupMinutes'] = 'Valor mínimo: 0.'
      if (!(f.feedTimeSecondsPerLoad >= 0)) errors['feed.feedTimeSecondsPerLoad'] = 'Valor mínimo: 0.'
      if (!(f.feedLoadIncrementMm >= 1)) errors['feed.feedLoadIncrementMm'] = 'Valor mínimo: 1.'
    }
  }

  return errors
}

// ---------- Bloco serigrafia (SCREEN_PRINTING) ----------

/** Bloco serigrafia vazio (manual; matriz com dimensões zeradas). */
export function defaultScreenPrintingBlock(): ScreenPrintingBlockRequest {
  return {
    automatic: false,
    squareSetupMinutes: 0,
    screenSetupMinutes: 0,
    washMinutesPerColor: 0,
    wasteSheetsPerColor: 0,
    minFormat: { widthMm: 0, lengthMm: 0, sheetsPerHour: 0 },
    maxFormat: { widthMm: 0, lengthMm: 0, sheetsPerHour: 0 },
    belowMinSpeedReducerPercent: '0',
    aboveMaxSpeedReducerPercent: '0',
  }
}

/** Normaliza o bloco serigrafia vindo da API para o formato de request (dimensões em mm + strings). */
export function hydrateScreenPrintingBlock(block: ScreenPrintingBlockResponse | null): ScreenPrintingBlockRequest {
  const base = defaultScreenPrintingBlock()
  if (!block) return base
  return {
    automatic: block.automatic,
    squareSetupMinutes: block.squareSetupMinutes ?? 0,
    screenSetupMinutes: block.screenSetupMinutes ?? 0,
    washMinutesPerColor: block.washMinutesPerColor ?? 0,
    wasteSheetsPerColor: block.wasteSheetsPerColor ?? 0,
    minFormat: {
      widthMm: block.minFormat.width.millimeters,
      lengthMm: block.minFormat.length.millimeters,
      sheetsPerHour: block.minFormat.sheetsPerHour,
    },
    maxFormat: {
      widthMm: block.maxFormat.width.millimeters,
      lengthMm: block.maxFormat.length.millimeters,
      sheetsPerHour: block.maxFormat.sheetsPerHour,
    },
    belowMinSpeedReducerPercent: String(block.belowMinSpeedReducerPercent),
    aboveMaxSpeedReducerPercent: String(block.aboveMaxSpeedReducerPercent),
  }
}

/**
 * Valida o bloco serigrafia: setups e quebra ≥ 0; a matriz de formato (dois pontos) com
 * dimensões e velocidade ≥ 1; redutores ≥ 0. (A regra "máximo ≥ mínimo" é validada no
 * formulário pelo tamanho linear das dimensões; o backend também a reforça.)
 */
export function validateScreenPrinting(block: ScreenPrintingBlockRequest): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!(block.squareSetupMinutes >= 0)) errors['squareSetupMinutes'] = 'Valor mínimo: 0.'
  if (!(block.screenSetupMinutes >= 0)) errors['screenSetupMinutes'] = 'Valor mínimo: 0.'
  if (!(block.washMinutesPerColor >= 0)) errors['washMinutesPerColor'] = 'Valor mínimo: 0.'
  if (!(block.wasteSheetsPerColor >= 0)) errors['wasteSheetsPerColor'] = 'Valor mínimo: 0.'

  for (const which of ['minFormat', 'maxFormat'] as const) {
    const p = block[which]
    if (!(p.widthMm >= 1)) errors[`${which}.widthMm`] = 'Informe a largura (≥ 1).'
    if (!(p.lengthMm >= 1)) errors[`${which}.lengthMm`] = 'Informe o comprimento (≥ 1).'
    if (!(p.sheetsPerHour >= 1)) errors[`${which}.sheetsPerHour`] = 'Informe a velocidade (≥ 1).'
  }

  if (!isNonNegativeNumber(block.belowMinSpeedReducerPercent)) errors['belowMinSpeedReducerPercent'] = 'Percentual inválido.'
  if (!isNonNegativeNumber(block.aboveMaxSpeedReducerPercent)) errors['aboveMaxSpeedReducerPercent'] = 'Percentual inválido.'

  return errors
}

// ---------- Validação ----------

/** `true` se o texto representa um número finito ≥ 0. */
function isNonNegativeNumber(value: string | number): boolean {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) && num >= 0
}

/**
 * Valida as faixas de um tipo de tinta (na ordem dada). Retorna a primeira
 * mensagem de erro encontrada, ou `null` se estiver tudo certo. Regras:
 * ao menos uma faixa; contíguas e sem sobreposição; só a última pode ser aberta;
 * velocidade dentro do envelope `[min, max]`.
 */
function validateInkTiers(
  tiers: OffsetTier[],
  minSpeed: number,
  maxSpeed: number,
): string | null {
  if (tiers.length === 0) return 'Adicione ao menos uma faixa.'
  const envelopeOk = minSpeed >= 1 && maxSpeed >= minSpeed

  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i]!
    const isLast = i === tiers.length - 1
    const pos = i + 1

    if (!(t.fromQuantity >= 0)) return `Faixa ${pos}: "de" inválido.`

    if (t.toQuantity === null) {
      if (!isLast) return 'Apenas a última faixa pode ser aberta (sem "até").'
    } else if (!(t.toQuantity >= t.fromQuantity)) {
      return `Faixa ${pos}: "até" deve ser ≥ "de".`
    }

    if (i > 0) {
      const prev = tiers[i - 1]!
      if (prev.toQuantity === null) return 'Só a última faixa pode ser aberta.'
      if (t.fromQuantity !== prev.toQuantity + 1) {
        return `Faixa ${pos}: deve iniciar em ${prev.toQuantity + 1} (contígua à anterior).`
      }
    }

    if (!(t.sheetsPerHour >= 1)) return `Faixa ${pos}: informe a velocidade (folhas/h).`
    if (envelopeOk && (t.sheetsPerHour < minSpeed || t.sheetsPerHour > maxSpeed)) {
      return `Faixa ${pos}: a velocidade (folhas/h) deve estar entre ${minSpeed} e ${maxSpeed} (envelope da máquina).`
    }
    if (!isNonNegativeNumber(t.wastePercent)) return `Faixa ${pos}: quebra inválida.`
  }
  return null
}

/**
 * Valida o bloco offset. Erros por dot-path (campos escalares), erros por tinta
 * em `tiers.<INK>` e um agregado `inkSettings` para os ajustes por tinta.
 */
export function validateOffset(block: OffsetBlock): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!(block.numberOfColors >= 1)) errors['numberOfColors'] = 'Mínimo de 1 cor.'
  if (block.maxNumberingUnits < 0) errors['maxNumberingUnits'] = 'Valor mínimo: 0.'

  const st = block.setupTimes
  const setupKeys: (keyof typeof st)[] = [
    'plateSetupMinutesPerColor',
    'colorMatchingMinutes',
    'numberingSetupMinutesPerUnit',
    'paperFeedSetupMinutes',
    'feedTimeSecondsPerLoad',
    'washMinutesPerColor',
  ]
  for (const k of setupKeys) {
    if (!(st[k] >= 0)) errors[`setupTimes.${k}`] = 'Valor mínimo: 0.'
  }
  if (!(st.feedLoadIncrementMm >= 1)) errors['setupTimes.feedLoadIncrementMm'] = 'Valor mínimo: 1.'

  const sr = block.speedRamp

  // Envelope de velocidade.
  if (!(sr.minSpeedSheetsPerHour >= 1)) errors['speedRamp.minSpeedSheetsPerHour'] = 'Valor mínimo: 1.'
  if (!(sr.maxSpeedSheetsPerHour >= sr.minSpeedSheetsPerHour)) {
    errors['speedRamp.maxSpeedSheetsPerHour'] = 'Deve ser ≥ velocidade mínima.'
  }
  // Teto com numeração (único da máquina). Só exigido quando há numeração.
  if (block.supportsNumbering && !(sr.numberingMaxSheetsPerHour >= 1)) {
    errors['speedRamp.numberingMaxSheetsPerHour'] = 'Valor mínimo: 1.'
  }

  if (!(sr.idealWeightMinGsm >= 0)) errors['speedRamp.idealWeightMinGsm'] = 'Valor mínimo: 0.'
  if (sr.idealWeightMaxGsm < sr.idealWeightMinGsm) {
    errors['speedRamp.idealWeightMaxGsm'] = 'Deve ser ≥ gramatura mínima.'
  }
  const reducerKeys: (keyof typeof sr)[] = [
    'belowIdealSpeedReducerPercent',
    'aboveIdealSpeedReducerPercent',
    'fullCoverageSpeedReducerPercent',
    'numberingSpeedReducerPercent',
  ]
  for (const k of reducerKeys) {
    if (!isNonNegativeNumber(sr[k] as string)) errors[`speedRamp.${k}`] = 'Percentual inválido.'
  }

  // Tipos de impressão habilitados (com ajuste). Nem toda máquina imprime os três.
  const enabledInks = INK_TYPES.filter((ink) => sr.inkSettings.some((s) => s.inkType === ink))
  if (enabledInks.length === 0) {
    errors['inkSettings'] = 'Habilite ao menos um tipo de impressão.'
    return errors
  }

  const inkSettingsOk = sr.inkSettings.every(
    (s) => s.initialWasteSheets >= 0 && isNonNegativeNumber(s.fullCoverageExtraWastePercent),
  )
  if (!inkSettingsOk) errors['inkSettings'] = 'Revise os ajustes por tipo de impressão (não podem ser negativos).'

  // Faixas apenas dos tipos de tinta habilitados.
  for (const ink of enabledInks) {
    const inkTiers = sr.tiers.filter((t) => t.inkType === ink)
    const msg = validateInkTiers(inkTiers, sr.minSpeedSheetsPerHour, sr.maxSpeedSheetsPerHour)
    if (msg) errors[`tiers.${ink}`] = msg
  }

  return errors
}
