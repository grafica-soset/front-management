import { describe, it, expect } from 'vitest'
import type { FoldingBlockRequest, FoldingBlockResponse } from '@/types/Machine'
import {
  defaultFoldingBlock,
  hydrateFoldingBlock,
  validateFolding,
} from '@/utils/machineCatalog'

/**
 * Bloco DOBRADEIRA (FOLDING): bolsas paralelas/cruzadas, envelope de velocidade, redutores
 * (bolsa, gramatura, formato), espessura máxima, quebra de acerto e movimentação de saída.
 */

function validBlock(): FoldingBlockRequest {
  return {
    parallelPockets: 4,
    crossPockets: 4,
    pocketSetupMinutes: 6,
    perPocketSpeedReducerPercent: '5',
    paperFeedSetupMinutes: 3,
    feedTimeSecondsPerLoad: 45,
    feedLoadIncrementMm: 40,
    minSpeedSheetsPerHour: 1000,
    maxSpeedSheetsPerHour: 10000,
    maxPaperThicknessMicrons: 45,
    idealWeightMinGsm: 90,
    idealWeightMaxGsm: 300,
    belowIdealWeightReducerPercent: '5',
    aboveIdealWeightReducerPercent: '10',
    minFormat: { widthMm: 150, lengthMm: 220 },
    maxFormat: { widthMm: 480, lengthMm: 660 },
    belowMinFormatReducerPercent: '10',
    aboveMaxFormatReducerPercent: '20',
    setupWasteSheets: 50,
    outputMovementMinutesPerBundle: 10,
    outputBundleSheets: 100,
  }
}

describe('Cadastro DOBRADEIRA — catálogo', () => {
  it('o bloco default tem 4+4 bolsas e maço de 100', () => {
    const block = defaultFoldingBlock()
    expect(block.parallelPockets).toBe(4)
    expect(block.crossPockets).toBe(4)
    expect(block.outputBundleSheets).toBe(100)
  })

  it('um bloco bem preenchido não tem erros', () => {
    expect(validateFolding(validBlock())).toEqual({})
  })

  it('exige ao menos uma bolsa', () => {
    const block = { ...validBlock(), parallelPockets: 0, crossPockets: 0 }
    expect(validateFolding(block)['parallelPockets']).toBeTruthy()
  })

  it('exige velocidade máxima ≥ mínima', () => {
    const block = { ...validBlock(), minSpeedSheetsPerHour: 10000, maxSpeedSheetsPerHour: 1000 }
    expect(validateFolding(block)['maxSpeedSheetsPerHour']).toBeTruthy()
  })

  it('exige dimensões do formato ideal ≥ 1', () => {
    const block = validBlock()
    block.minFormat = { widthMm: 0, lengthMm: 220 }
    expect(validateFolding(block)['minFormat.widthMm']).toBeTruthy()
  })

  it('rejeita percentuais inválidos', () => {
    const block = { ...validBlock(), perPocketSpeedReducerPercent: 'abc' }
    expect(validateFolding(block)['perPocketSpeedReducerPercent']).toBeTruthy()
  })

  it('hidrata a response (mm + strings)', () => {
    const fromApi: FoldingBlockResponse = {
      parallelPockets: 4,
      crossPockets: 4,
      pocketSetupMinutes: 6,
      perPocketSpeedReducerPercent: 5,
      paperFeedSetupMinutes: 3,
      feedTimeSecondsPerLoad: 45,
      feedLoadIncrementMm: 40,
      minSpeedSheetsPerHour: 1000,
      maxSpeedSheetsPerHour: 10000,
      maxPaperThicknessMicrons: 45,
      idealWeightMinGsm: 90,
      idealWeightMaxGsm: 300,
      belowIdealWeightReducerPercent: 5,
      aboveIdealWeightReducerPercent: 10,
      minFormat: {
        width: { value: 15, unit: 'CENTIMETER', millimeters: 150 },
        length: { value: 22, unit: 'CENTIMETER', millimeters: 220 },
      },
      maxFormat: {
        width: { value: 48, unit: 'CENTIMETER', millimeters: 480 },
        length: { value: 66, unit: 'CENTIMETER', millimeters: 660 },
      },
      belowMinFormatReducerPercent: 10,
      aboveMaxFormatReducerPercent: 20,
      setupWasteSheets: 50,
      outputMovementMinutesPerBundle: 10,
      outputBundleSheets: 100,
    }
    const hydrated = hydrateFoldingBlock(fromApi)
    expect(hydrated.minFormat.widthMm).toBe(150)
    expect(hydrated.maxFormat.lengthMm).toBe(660)
    expect(hydrated.perPocketSpeedReducerPercent).toBe('5')
    expect(hydrated.setupWasteSheets).toBe(50)
  })
})
