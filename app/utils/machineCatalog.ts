/**
 * Metadados e helpers do cadastro de máquinas.
 *
 * Hoje só existe a impressora OFFSET (endpoint `/printing-machines`). Este
 * arquivo concentra: rótulos PT-BR (tipo de máquina, tipo de tinta), construção
 * do bloco offset default, hidratação da response, helpers de faixas (tiers) e a
 * validação do formulário (cf. `.docs/offset-machines-api.md`).
 */
import type {
  InkType,
  MachineType,
  OffsetBlock,
  OffsetInkSetting,
  OffsetTier,
} from '@/types/Machine'

/** Endpoint base da API de impressão. */
export const PRINTING_MACHINES_BASE = '/printing-machines'

export const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  OFFSET: 'Impressora Offset',
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
      setupMinutes: 0,
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
 * `fromQuantity`, e percentuais como string. Tinta sem faixas recebe uma faixa
 * aberta default, de modo que o formulário nunca quebre.
 */
export function hydrateOffsetBlock(block: OffsetBlock): OffsetBlock {
  const base = defaultOffsetBlock()
  const inkByType = new Map(block.speedRamp?.inkSettings?.map((s) => [s.inkType, s]) ?? [])

  const inkSettings: OffsetInkSetting[] = INK_TYPES.map((inkType) => {
    const found = inkByType.get(inkType)
    return found
      ? {
          inkType,
          initialWasteSheets: found.initialWasteSheets,
          fullCoverageExtraWastePercent: String(found.fullCoverageExtraWastePercent),
        }
      : base.speedRamp.inkSettings.find((s) => s.inkType === inkType)!
  })

  const tiers: OffsetTier[] = INK_TYPES.flatMap((inkType) => {
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
    'setupMinutes',
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

  const inkSettingsOk = sr.inkSettings.every(
    (s) => s.initialWasteSheets >= 0 && isNonNegativeNumber(s.fullCoverageExtraWastePercent),
  )
  if (!inkSettingsOk) errors['inkSettings'] = 'Revise os ajustes por tipo de impressão (não podem ser negativos).'

  // Faixas por tipo de tinta.
  for (const ink of INK_TYPES) {
    const inkTiers = sr.tiers.filter((t) => t.inkType === ink)
    const msg = validateInkTiers(inkTiers, sr.minSpeedSheetsPerHour, sr.maxSpeedSheetsPerHour)
    if (msg) errors[`tiers.${ink}`] = msg
  }

  return errors
}
