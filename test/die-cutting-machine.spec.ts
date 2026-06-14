import { describe, it, expect } from 'vitest'
import type { DieCuttingBlockRequest, DieCuttingBlockResponse } from '@/types/Machine'
import {
  defaultDieCuttingBlock,
  defaultDieCuttingFeed,
  hydrateDieCuttingBlock,
  validateDieCutting,
} from '@/utils/machineCatalog'

/**
 * Bloco CORTE E VINCO (DIE_CUTTING): matriz de formato (dois pontos com dimensões numéricas),
 * setup de esquadros frontal e lateral, redutores e — só na automática — alimentação de papel.
 */

/** Bloco manual bem preenchido (exemplo do enunciado: 15×22→500 / 66×96→1000). */
function validManualBlock(): DieCuttingBlockRequest {
  return {
    automatic: false,
    squareSetupMinutes: 12,
    minFormat: { widthMm: 150, lengthMm: 220, sheetsPerHour: 500, dieSetupMinutes: 8 },
    maxFormat: { widthMm: 660, lengthMm: 960, sheetsPerHour: 1000, dieSetupMinutes: 15 },
    belowMinSpeedReducerPercent: '10',
    aboveMaxSpeedReducerPercent: '20',
    feed: null,
  }
}

describe('Cadastro CORTE E VINCO — catálogo', () => {
  it('o bloco default é manual e sem alimentação', () => {
    const block = defaultDieCuttingBlock()
    expect(block.automatic).toBe(false)
    expect(block.feed).toBeNull()
  })

  it('um bloco manual bem preenchido não tem erros', () => {
    expect(validateDieCutting(validManualBlock())).toEqual({})
  })

  it('exige velocidade ≥ 1 em cada ponto da matriz', () => {
    const block = validManualBlock()
    block.minFormat.sheetsPerHour = 0
    expect(validateDieCutting(block)['minFormat.sheetsPerHour']).toBeTruthy()
  })

  it('exige dimensões ≥ 1 em cada ponto da matriz', () => {
    const block = validManualBlock()
    block.minFormat.widthMm = 0
    block.maxFormat.lengthMm = 0
    const errors = validateDieCutting(block)
    expect(errors['minFormat.widthMm']).toBeTruthy()
    expect(errors['maxFormat.lengthMm']).toBeTruthy()
  })

  it('máquina automática exige os campos de alimentação', () => {
    const block: DieCuttingBlockRequest = { ...validManualBlock(), automatic: true, feed: null }
    expect(validateDieCutting(block)['feed']).toBeTruthy()

    block.feed = defaultDieCuttingFeed()
    expect(validateDieCutting(block)).toEqual({})
  })

  it('hidrata a response (dimensões em mm + strings) e descarta a alimentação quando manual', () => {
    const fromApi: DieCuttingBlockResponse = {
      automatic: false,
      squareSetupMinutes: 12,
      minFormat: {
        width: { value: 15, unit: 'CENTIMETER', millimeters: 150 },
        length: { value: 22, unit: 'CENTIMETER', millimeters: 220 },
        sheetsPerHour: 500,
        dieSetupMinutes: 8,
      },
      maxFormat: {
        width: { value: 66, unit: 'CENTIMETER', millimeters: 660 },
        length: { value: 96, unit: 'CENTIMETER', millimeters: 960 },
        sheetsPerHour: 1000,
        dieSetupMinutes: 15,
      },
      belowMinSpeedReducerPercent: 10,
      aboveMaxSpeedReducerPercent: 20,
      feed: null,
    }
    const hydrated = hydrateDieCuttingBlock(fromApi)
    expect(hydrated.minFormat.widthMm).toBe(150)
    expect(hydrated.minFormat.lengthMm).toBe(220)
    expect(hydrated.maxFormat.widthMm).toBe(660)
    expect(hydrated.maxFormat.lengthMm).toBe(960)
    expect(hydrated.belowMinSpeedReducerPercent).toBe('10')
    expect(hydrated.feed).toBeNull()
  })

  it('hidrata a alimentação quando a máquina é automática', () => {
    const fromApi: DieCuttingBlockResponse = {
      automatic: true,
      squareSetupMinutes: 12,
      minFormat: {
        width: { value: 15, unit: 'CENTIMETER', millimeters: 150 },
        length: { value: 22, unit: 'CENTIMETER', millimeters: 220 },
        sheetsPerHour: 500,
        dieSetupMinutes: 8,
      },
      maxFormat: {
        width: { value: 66, unit: 'CENTIMETER', millimeters: 660 },
        length: { value: 96, unit: 'CENTIMETER', millimeters: 960 },
        sheetsPerHour: 1000,
        dieSetupMinutes: 15,
      },
      belowMinSpeedReducerPercent: 10,
      aboveMaxSpeedReducerPercent: 20,
      feed: { paperFeedSetupMinutes: 5, feedTimeSecondsPerLoad: 7, feedLoadIncrementMm: 40 },
    }
    const hydrated = hydrateDieCuttingBlock(fromApi)
    expect(hydrated.feed).toEqual({ paperFeedSetupMinutes: 5, feedTimeSecondsPerLoad: 7, feedLoadIncrementMm: 40 })
  })
})
