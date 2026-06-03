/**
 * Metadados e helpers do cadastro de máquinas.
 *
 * Hoje só existe a impressora OFFSET (endpoint `/printing-machines`). Este
 * arquivo concentra: rótulos PT-BR (tipo de máquina, tipo de tinta, faixas de
 * volume), construção do bloco offset default, hidratação da response e a
 * validação do formulário (cf. `.docs/offset-machines-api.md`).
 */
import type {
  InkType,
  MachineType,
  OffsetBlock,
  OffsetInkSetting,
  OffsetTier,
  QuantityTier,
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
  CMYK: 'CMYK (seleção)',
  PANTONE: 'Pantone (especial)',
}

// ---------- Faixas de volume (quantidade de folhas) ----------

export const QUANTITY_TIERS: QuantityTier[] = [
  'UP_TO_500',
  'FROM_500_TO_1000',
  'FROM_1000_TO_2000',
  'FROM_2000_TO_3000',
  'FROM_3000_TO_5000',
  'ABOVE_5000',
]

export const QUANTITY_TIER_LABELS: Record<QuantityTier, string> = {
  UP_TO_500: 'Até 500',
  FROM_500_TO_1000: '501 – 1.000',
  FROM_1000_TO_2000: '1.001 – 2.000',
  FROM_2000_TO_3000: '2.001 – 3.000',
  FROM_3000_TO_5000: '3.001 – 5.000',
  ABOVE_5000: 'Acima de 5.000',
}

// ---------- Bloco offset ----------

/** Bloco offset vazio, com a matriz completa (3 tintas × 6 faixas = 18 células). */
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
      idealWeightMinGsm: 63,
      idealWeightMaxGsm: 180,
      belowIdealSpeedReducerPercent: '0',
      aboveIdealSpeedReducerPercent: '0',
      fullCoverageSpeedReducerPercent: '0',
      numberingSpeedReducerPercent: '0',
      inkSettings: INK_TYPES.map((inkType) => ({
        inkType,
        numberingMaxSheetsPerHour: 0,
        initialWasteSheets: 0,
        fullCoverageExtraWastePercent: '0',
      })),
      tiers: INK_TYPES.flatMap((inkType) =>
        QUANTITY_TIERS.map((quantityTier) => ({
          inkType,
          quantityTier,
          sheetsPerHour: 0,
          wastePercent: '0',
        })),
      ),
    },
  }
}

/**
 * Normaliza o bloco offset vindo da API para a ordem canônica usada na UI
 * (tintas na ordem de `INK_TYPES`, faixas na ordem de `QUANTITY_TIERS`) e
 * garante que percentuais venham como string. Células ausentes são preenchidas
 * com o default, de modo que o formulário nunca quebre.
 */
export function hydrateOffsetBlock(block: OffsetBlock): OffsetBlock {
  const base = defaultOffsetBlock()
  const inkByType = new Map(block.speedRamp?.inkSettings?.map((s) => [s.inkType, s]) ?? [])
  const tierByKey = new Map(
    block.speedRamp?.tiers?.map((t) => [`${t.inkType}:${t.quantityTier}`, t]) ?? [],
  )

  const inkSettings: OffsetInkSetting[] = INK_TYPES.map((inkType) => {
    const found = inkByType.get(inkType)
    return found
      ? {
          inkType,
          numberingMaxSheetsPerHour: found.numberingMaxSheetsPerHour,
          initialWasteSheets: found.initialWasteSheets,
          fullCoverageExtraWastePercent: String(found.fullCoverageExtraWastePercent),
        }
      : base.speedRamp.inkSettings.find((s) => s.inkType === inkType)!
  })

  const tiers: OffsetTier[] = INK_TYPES.flatMap((inkType) =>
    QUANTITY_TIERS.map((quantityTier) => {
      const found = tierByKey.get(`${inkType}:${quantityTier}`)
      return found
        ? {
            inkType,
            quantityTier,
            sheetsPerHour: found.sheetsPerHour,
            wastePercent: String(found.wastePercent),
          }
        : { inkType, quantityTier, sheetsPerHour: 0, wastePercent: '0' }
    }),
  )

  return {
    numberOfColors: block.numberOfColors,
    supportsNumbering: block.supportsNumbering,
    maxNumberingUnits: block.maxNumberingUnits,
    setupTimes: { ...base.setupTimes, ...block.setupTimes },
    speedRamp: {
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
 * Valida o bloco offset. Retorna erros por dot-path (campos escalares) mais a
 * chave agregada `matrix` quando alguma célula da matriz/ajuste é inválida.
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

  const matrixOk =
    sr.inkSettings.every(
      (s) =>
        s.numberingMaxSheetsPerHour >= 0 &&
        s.initialWasteSheets >= 0 &&
        isNonNegativeNumber(s.fullCoverageExtraWastePercent),
    ) &&
    sr.tiers.every((t) => t.sheetsPerHour >= 0 && isNonNegativeNumber(t.wastePercent))
  if (!matrixOk) errors['matrix'] = 'Revise os valores da matriz de velocidade/quebra (não podem ser negativos).'

  return errors
}
