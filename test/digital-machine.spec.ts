import { describe, it, expect } from 'vitest'
import type { DigitalBlockRequest, DigitalBlockResponse } from '@/types/Machine'
import {
  defaultDigitalBlock,
  hydrateDigitalBlock,
  validateDigital,
} from '@/utils/machineCatalog'

/**
 * Bloco IMPRESSORA DIGITAL (DIGITAL): cor, envelope de velocidade, matriz de formato, limites de
 * gramatura/espessura, quebra e cobertura por tipo de impressão (traço/imagem).
 */

function validBlock(): DigitalBlockRequest {
  return {
    colorMode: 'COLOR',
    setupMinutes: 15,
    // Acerto da numeração (atividade 036): a digital numera sem numerador, e só cobra o acerto.
    numberingSetupMinutes: 9,
    paperFeedSetupMinutes: 6,
    feedTimeSecondsPerLoad: 45,
    feedLoadIncrementMm: 40,
    minSpeedSheetsPerHour: 4000,
    maxSpeedSheetsPerHour: 10000,
    minFormat: { widthMm: 150, lengthMm: 220, sheetsPerHour: 5000 },
    maxFormat: { widthMm: 660, lengthMm: 960, sheetsPerHour: 9000 },
    belowMinFormatReducerPercent: '10',
    aboveMaxFormatReducerPercent: '20',
    // Frente e verso (atividade 043): os dois lados na mesma passada, 35% mais devagar.
    duplexSpeedReducerPercent: '35',
    minWeightGsm: 60,
    maxWeightGsm: 300,
    maxThicknessMicrons: 400,
    wasteSheets: 4,
    lineCoverage: { speedReducerPercentAt100: '10' },
    imageCoverage: { speedReducerPercentAt100: '50' },
    // Tinta da máquina (atividade 032 — ajuste 0001): digital colorida a toner, só CMYK.
    acceptedInkColorTypes: ['CMYK'],
    inkSubtype: 'TONER',
  }
}

describe('Cadastro IMPRESSORA DIGITAL — catálogo', () => {
  it('o bloco default é colorido com alimentação de 40 mm', () => {
    const block = defaultDigitalBlock()
    expect(block.colorMode).toBe('COLOR')
    expect(block.feedLoadIncrementMm).toBe(40)
  })

  it('um bloco bem preenchido não tem erros', () => {
    expect(validateDigital(validBlock())).toEqual({})
  })

  it('o bloco default nasce sem acerto de numeração', () => {
    // Zero é resposta legítima: numerar nessa máquina não cobra acerto nenhum.
    expect(defaultDigitalBlock().numberingSetupMinutes).toBe(0)
  })

  // ---- Frente e verso (atividade 043) ----

  it('o bloco default nasce sem redutor de frente e verso', () => {
    expect(defaultDigitalBlock().duplexSpeedReducerPercent).toBe('0')
  })

  it('o redutor de frente e verso fica entre 0 e 100%', () => {
    expect(validateDigital({ ...validBlock(), duplexSpeedReducerPercent: '-1' })['duplexSpeedReducerPercent']).toBeTruthy()
    expect(validateDigital({ ...validBlock(), duplexSpeedReducerPercent: '100.5' })['duplexSpeedReducerPercent']).toBeTruthy()
    expect(validateDigital({ ...validBlock(), duplexSpeedReducerPercent: '' })['duplexSpeedReducerPercent']).toBeTruthy()
    expect(validateDigital({ ...validBlock(), duplexSpeedReducerPercent: '100' })).toEqual({})
  })

  it('recusa acerto de numeração negativo', () => {
    const block = { ...validBlock(), numberingSetupMinutes: -1 }
    expect(validateDigital(block)['numberingSetupMinutes']).toBeTruthy()
  })

  it('exige velocidade máxima ≥ mínima', () => {
    const block = { ...validBlock(), minSpeedSheetsPerHour: 10000, maxSpeedSheetsPerHour: 4000 }
    expect(validateDigital(block)['maxSpeedSheetsPerHour']).toBeTruthy()
  })

  it('exige dimensões e velocidade da matriz ≥ 1', () => {
    const block = validBlock()
    block.minFormat = { widthMm: 0, lengthMm: 220, sheetsPerHour: 5000 }
    expect(validateDigital(block)['minFormat.widthMm']).toBeTruthy()
  })

  it('exige limites de gramatura e espessura', () => {
    const block = { ...validBlock(), maxWeightGsm: 0, maxThicknessMicrons: 0 }
    const errors = validateDigital(block)
    expect(errors['maxWeightGsm']).toBeTruthy()
    expect(errors['maxThicknessMicrons']).toBeTruthy()
  })

  it('exige gramatura máxima ≥ mínima', () => {
    const block = { ...validBlock(), minWeightGsm: 300, maxWeightGsm: 90 }
    expect(validateDigital(block)['maxWeightGsm']).toBeTruthy()
  })

  it('rejeita percentual inválido na cobertura', () => {
    const block = validBlock()
    block.imageCoverage = { speedReducerPercentAt100: 'abc' }
    expect(validateDigital(block)['imageCoverage.speedReducerPercentAt100']).toBeTruthy()
  })

  it('hidrata a response (mm + strings)', () => {
    const fromApi: DigitalBlockResponse = {
      colorMode: 'MONOCOLOR',
      setupMinutes: 15,
      paperFeedSetupMinutes: 6,
      feedTimeSecondsPerLoad: 45,
      feedLoadIncrementMm: 40,
      minSpeedSheetsPerHour: 4000,
      maxSpeedSheetsPerHour: 10000,
      minFormat: {
        width: { value: 15, unit: 'CENTIMETER', millimeters: 150 },
        length: { value: 22, unit: 'CENTIMETER', millimeters: 220 },
        sheetsPerHour: 5000,
      },
      maxFormat: {
        width: { value: 66, unit: 'CENTIMETER', millimeters: 660 },
        length: { value: 96, unit: 'CENTIMETER', millimeters: 960 },
        sheetsPerHour: 9000,
      },
      belowMinFormatReducerPercent: 10,
      aboveMaxFormatReducerPercent: 20,
      minWeightGsm: 60,
      maxWeightGsm: 300,
      maxThicknessMicrons: 400,
      wasteSheets: 4,
      lineCoverage: { speedReducerPercentAt100: 10 },
      imageCoverage: { speedReducerPercentAt100: 50 },
      acceptedInkColorTypes: ['CMYK', 'PANTONE'],
      inkSubtype: 'TONER',
    }
    const hydrated = hydrateDigitalBlock(fromApi)
    expect(hydrated.colorMode).toBe('MONOCOLOR')
    expect(hydrated.minFormat.widthMm).toBe(150)
    expect(hydrated.maxFormat.sheetsPerHour).toBe(9000)
    expect(hydrated.imageCoverage.speedReducerPercentAt100).toBe('50')
    expect(hydrated.acceptedInkColorTypes).toEqual(['CMYK', 'PANTONE'])
    expect(hydrated.inkSubtype).toBe('TONER')
    // Máquina anterior à atividade 043 volta sem o campo: frente e verso sem perda.
    expect(hydrated.duplexSpeedReducerPercent).toBe('0')
    expect(hydrateDigitalBlock({ ...fromApi, duplexSpeedReducerPercent: 50 }).duplexSpeedReducerPercent).toBe('50')
  })

  // ---- Tinta da máquina (atividade 032 — ajuste 0001) ----

  it('o bloco default da digital já nasce com subtipo TONER', () => {
    expect(defaultDigitalBlock().inkSubtype).toBe('TONER')
  })

  it('exige ao menos um tipo de tinta aceito', () => {
    const block = { ...validBlock(), acceptedInkColorTypes: [] }
    expect(validateDigital(block)['acceptedInkColorTypes']).toBe(
      'Selecione ao menos um tipo de tinta (CMYK ou Pantone).',
    )
  })

  it('aceita uma digital que também imprime cor especial', () => {
    const block = { ...validBlock(), acceptedInkColorTypes: ['CMYK', 'PANTONE'] as const }
    expect(validateDigital({ ...block, acceptedInkColorTypes: [...block.acceptedInkColorTypes] })).toEqual({})
  })
})
