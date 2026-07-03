import { describe, it, expect } from 'vitest'
import type { InkType, MachineRequest, OffsetBlock, OffsetTier } from '@/types/Machine'
import { hydrateOffsetBlock, validateOffset } from '@/utils/machineCatalog'

/**
 * Teste de cadastro da máquina real "Sakurai 58 Monocolor" (OFFSET monocolor
 * com numeração). Garante que o payload montado pelo formulário é válido e que
 * as regras das faixas de quantidade (contiguidade, sem sobreposição, envelope
 * de velocidade) protegem contra ranges mal preenchidos.
 *
 * Dimensões informadas em cm pelo usuário são persistidas em mm (×10):
 *   29 cm → 290 mm, 58 cm → 580 mm, 18,5 cm → 185 mm, 45 cm → 450 mm,
 *   1,2 cm → 12 mm, 80 cm → 800 mm, 4 cm (altura de alimentação) → 40 mm.
 */

// Faixas (iguais para Traço, CMYK e Pantone nesta máquina).
const TIER_SPEC: { from: number; to: number | null; sph: number; waste: string }[] = [
  { from: 0, to: 500, sph: 4000, waste: '4' },
  { from: 501, to: 1000, sph: 4500, waste: '3' },
  { from: 1001, to: 2000, sph: 5000, waste: '2.5' },
  { from: 2001, to: 3000, sph: 6000, waste: '2' },
  { from: 3001, to: 5000, sph: 7000, waste: '1.5' },
  { from: 5001, to: null, sph: 8000, waste: '1' },
]

function buildTiers(ink: InkType): OffsetTier[] {
  return TIER_SPEC.map((s) => ({
    inkType: ink,
    fromQuantity: s.from,
    toQuantity: s.to,
    sheetsPerHour: s.sph,
    wastePercent: s.waste,
  }))
}

function buildSakuraiOffset(): OffsetBlock {
  return {
    numberOfColors: 1,
    supportsNumbering: true,
    maxNumberingUnits: 20,
    acceptedPlateTypes: ['CTP', 'FOTOLITO'],
    setupTimes: {
      plateSetupMinutesPerColor: 15,
      colorMatchingMinutes: 10,
      numberingSetupMinutesPerUnit: 4,
      paperFeedSetupMinutes: 6,
      feedTimeSecondsPerLoad: 45,
      feedLoadIncrementMm: 40,
      washMinutesPerColor: 24,
    },
    speedRamp: {
      minSpeedSheetsPerHour: 2000,
      maxSpeedSheetsPerHour: 8000,
      numberingMaxSheetsPerHour: 4500,
      idealWeightMinGsm: 63,
      idealWeightMaxGsm: 180,
      belowIdealSpeedReducerPercent: '5',
      aboveIdealSpeedReducerPercent: '10',
      fullCoverageSpeedReducerPercent: '10',
      numberingSpeedReducerPercent: '10',
      inkSettings: [
        { inkType: 'LINE', initialWasteSheets: 50, fullCoverageExtraWastePercent: '3' },
        { inkType: 'CMYK', initialWasteSheets: 80, fullCoverageExtraWastePercent: '3' },
        { inkType: 'PANTONE', initialWasteSheets: 100, fullCoverageExtraWastePercent: '3' },
      ],
      tiers: [...buildTiers('LINE'), ...buildTiers('CMYK'), ...buildTiers('PANTONE')],
    },
  }
}

function buildSakuraiRequest(): MachineRequest {
  return {
    customerId: 42,
    machineType: 'OFFSET',
    name: 'Sakurai 58 Monocolor',
    formatRange: { minWidthMm: 290, maxWidthMm: 580, minLengthMm: 185, maxLengthMm: 450 },
    gripMargins: { gripMm: 12, maxImageMarginMm: 5 },
    paperFeeder: { maxStackHeightMm: 800 },
    hourlyCost: '97.41',
    offset: buildSakuraiOffset(),
  }
}

describe('Cadastro OFFSET — Sakurai 58 Monocolor', () => {
  it('monta o payload comum em mm, custo como string decimal', () => {
    const req = buildSakuraiRequest()
    expect(req.formatRange).toEqual({ minWidthMm: 290, maxWidthMm: 580, minLengthMm: 185, maxLengthMm: 450 })
    expect(req.gripMargins.gripMm).toBe(12)
    expect(req.gripMargins.maxImageMarginMm).toBe(5)
    expect(req.paperFeeder.maxStackHeightMm).toBe(800)
    expect(req.hourlyCost).toBe('97.41')
    expect(req.offset.setupTimes.plateSetupMinutesPerColor).toBe(15)
    expect(req.offset.setupTimes.colorMatchingMinutes).toBe(10)
    expect(req.offset.setupTimes.feedLoadIncrementMm).toBe(40)
  })

  it('é um bloco offset válido (sem erros de validação)', () => {
    expect(validateOffset(buildSakuraiOffset())).toEqual({})
  })

  it('tem 6 faixas por tipo de impressão (18 no total)', () => {
    const offset = buildSakuraiOffset()
    expect(offset.speedRamp.tiers.length).toBe(18)
    for (const ink of ['LINE', 'CMYK', 'PANTONE'] as InkType[]) {
      expect(offset.speedRamp.tiers.filter((t) => t.inkType === ink)).toHaveLength(6)
    }
  })

  it('mantém o teto de numeração único da máquina (não por tinta)', () => {
    expect(buildSakuraiOffset().speedRamp.numberingMaxSheetsPerHour).toBe(4500)
  })

  it('acusa sobreposição de faixas (início invade a faixa anterior)', () => {
    const offset = buildSakuraiOffset()
    // CMYK: faz a 2ª faixa começar em 400 (sobrepõe a 1ª: 0–500).
    const cmyk = offset.speedRamp.tiers.filter((t) => t.inkType === 'CMYK')
    cmyk[1]!.fromQuantity = 400
    const errors = validateOffset(offset)
    expect(errors['tiers.CMYK']).toBeTruthy()
  })

  it('acusa lacuna entre faixas (início não é fim anterior + 1)', () => {
    const offset = buildSakuraiOffset()
    const line = offset.speedRamp.tiers.filter((t) => t.inkType === 'LINE')
    line[1]!.fromQuantity = 600 // após 0–500 deveria ser 501
    expect(validateOffset(offset)['tiers.LINE']).toBeTruthy()
  })

  it('acusa velocidade de faixa fora do envelope da máquina', () => {
    const offset = buildSakuraiOffset()
    const pantone = offset.speedRamp.tiers.filter((t) => t.inkType === 'PANTONE')
    pantone[5]!.sheetsPerHour = 9000 // acima do máximo (8000)
    expect(validateOffset(offset)['tiers.PANTONE']).toBeTruthy()
  })

  it('exige a velocidade máxima com numeração quando há numeração', () => {
    const offset = buildSakuraiOffset()
    offset.speedRamp.numberingMaxSheetsPerHour = 0
    expect(validateOffset(offset)['speedRamp.numberingMaxSheetsPerHour']).toBeTruthy()
  })

  it('hidrata a resposta da API ordenando as faixas e normalizando percentuais', () => {
    const offset = buildSakuraiOffset()
    // Embaralha a ordem das faixas e usa número no wastePercent, como pode vir da API.
    const shuffled: OffsetBlock = {
      ...offset,
      speedRamp: {
        ...offset.speedRamp,
        tiers: [...offset.speedRamp.tiers]
          .reverse()
          .map((t) => ({ ...t, wastePercent: Number(t.wastePercent) as unknown as string })),
      },
    }
    const hydrated = hydrateOffsetBlock(shuffled)
    const line = hydrated.speedRamp.tiers.filter((t) => t.inkType === 'LINE')
    expect(line.map((t) => t.fromQuantity)).toEqual([0, 501, 1001, 2001, 3001, 5001])
    expect(line.map((t) => t.toQuantity)).toEqual([500, 1000, 2000, 3000, 5000, null])
    expect(line.every((t) => typeof t.wastePercent === 'string')).toBe(true)
    expect(validateOffset(hydrated)).toEqual({})
  })
})

describe('Cadastro OFFSET — tipos de impressão habilitados (CMYK/Pantone/Traço opcionais)', () => {
  // Mantém só o tipo informado, removendo ajustes e faixas dos demais.
  function onlyInks(...inks: InkType[]): OffsetBlock {
    const offset = buildSakuraiOffset()
    offset.speedRamp.inkSettings = offset.speedRamp.inkSettings.filter((s) => inks.includes(s.inkType))
    offset.speedRamp.tiers = offset.speedRamp.tiers.filter((t) => inks.includes(t.inkType))
    return offset
  }

  it('aceita uma máquina que imprime apenas Traço (LINE)', () => {
    expect(validateOffset(onlyInks('LINE'))).toEqual({})
  })

  it('não valida faixas de um tipo desabilitado', () => {
    // CMYK desabilitado: mesmo sem faixas de CMYK, não há erro tiers.CMYK.
    const errors = validateOffset(onlyInks('LINE', 'PANTONE'))
    expect(errors['tiers.CMYK']).toBeUndefined()
    expect(errors).toEqual({})
  })

  it('exige ao menos um tipo de impressão habilitado', () => {
    const offset = onlyInks() // nenhum habilitado
    expect(validateOffset(offset)['inkSettings']).toBeTruthy()
  })

  it('hidrata preservando apenas os tipos presentes na resposta da API', () => {
    const hydrated = hydrateOffsetBlock(onlyInks('LINE', 'CMYK'))
    const inks = hydrated.speedRamp.inkSettings.map((s) => s.inkType)
    expect(inks).toEqual(['LINE', 'CMYK'])
    expect(hydrated.speedRamp.tiers.some((t) => t.inkType === 'PANTONE')).toBe(false)
  })
})
