import { describe, it, expect } from 'vitest'
import type { DieCuttingBlockRequest, DieCuttingBlockResponse } from '@/types/Machine'
import {
  defaultDieCuttingBlock,
  defaultDieCuttingFeed,
  hydrateDieCuttingBlock,
  validateDieCutting,
} from '@/utils/machineCatalog'

/**
 * Bloco CORTE E VINCO (DIE_CUTTING): matriz de formato (dois pontos), setup do esquadro,
 * margem de esquadro lateral, redutores e — só na automática — alimentação de papel.
 */

/** Bloco manual bem preenchido (exemplo do enunciado: 15×22→500 / 66×96→1000). */
function validManualBlock(): DieCuttingBlockRequest {
  return {
    automatic: false,
    squareSetupMinutes: 12,
    lateralSquareMarginMm: 5,
    minFormat: { formatId: 31, sheetsPerHour: 500, dieSetupMinutes: 8 },
    maxFormat: { formatId: 47, sheetsPerHour: 1000, dieSetupMinutes: 15 },
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

  it('exige um formato selecionado em cada ponto da matriz', () => {
    const block = validManualBlock()
    block.minFormat.formatId = 0
    expect(validateDieCutting(block)['minFormat.formatId']).toBeTruthy()
  })

  it('máquina automática exige os campos de alimentação', () => {
    const block: DieCuttingBlockRequest = { ...validManualBlock(), automatic: true, feed: null }
    expect(validateDieCutting(block)['feed']).toBeTruthy()

    block.feed = defaultDieCuttingFeed()
    expect(validateDieCutting(block)).toEqual({})
  })

  it('hidrata a response (formatId + strings) e descarta a alimentação quando manual', () => {
    const fromApi: DieCuttingBlockResponse = {
      automatic: false,
      squareSetupMinutes: 12,
      lateralSquareMargin: { value: 0.5, unit: 'CENTIMETER', millimeters: 5 },
      minFormat: {
        format: {
          formatId: 31,
          formatName: '15x22',
          width: { value: 15, unit: 'CENTIMETER', millimeters: 150 },
          length: { value: 22, unit: 'CENTIMETER', millimeters: 220 },
        },
        sheetsPerHour: 500,
        dieSetupMinutes: 8,
      },
      maxFormat: {
        format: {
          formatId: 47,
          formatName: '66x96',
          width: { value: 66, unit: 'CENTIMETER', millimeters: 660 },
          length: { value: 96, unit: 'CENTIMETER', millimeters: 960 },
        },
        sheetsPerHour: 1000,
        dieSetupMinutes: 15,
      },
      belowMinSpeedReducerPercent: 10,
      aboveMaxSpeedReducerPercent: 20,
      feed: null,
    }
    const hydrated = hydrateDieCuttingBlock(fromApi)
    expect(hydrated.lateralSquareMarginMm).toBe(5)
    expect(hydrated.minFormat.formatId).toBe(31)
    expect(hydrated.maxFormat.formatId).toBe(47)
    expect(hydrated.belowMinSpeedReducerPercent).toBe('10')
    expect(hydrated.feed).toBeNull()
  })

  it('hidrata a alimentação quando a máquina é automática', () => {
    const fromApi: DieCuttingBlockResponse = {
      automatic: true,
      squareSetupMinutes: 12,
      lateralSquareMargin: { value: 0.5, unit: 'CENTIMETER', millimeters: 5 },
      minFormat: {
        format: {
          formatId: 31,
          formatName: '15x22',
          width: { value: 15, unit: 'CENTIMETER', millimeters: 150 },
          length: { value: 22, unit: 'CENTIMETER', millimeters: 220 },
        },
        sheetsPerHour: 500,
        dieSetupMinutes: 8,
      },
      maxFormat: {
        format: {
          formatId: 47,
          formatName: '66x96',
          width: { value: 66, unit: 'CENTIMETER', millimeters: 660 },
          length: { value: 96, unit: 'CENTIMETER', millimeters: 960 },
        },
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
