import { describe, it, expect } from 'vitest'
import type { ScreenPrintingBlockRequest, ScreenPrintingBlockResponse } from '@/types/Machine'
import {
  defaultScreenPrintingBlock,
  hydrateScreenPrintingBlock,
  validateScreenPrinting,
} from '@/utils/machineCatalog'

/**
 * Bloco SERIGRAFIA (SCREEN_PRINTING): matriz de formato (dois pontos com dimensões numéricas),
 * setup de esquadros, setup de tela, lavagem por cor e quebra por cor. Máquina manual.
 */

/** Bloco bem preenchido (exemplo do enunciado: 15×22→500 / 66×96→1000). */
function validBlock(): ScreenPrintingBlockRequest {
  return {
    automatic: false,
    squareSetupMinutes: 12,
    screenSetupMinutes: 5,
    washMinutesPerColor: 10,
    wasteSheetsPerColor: 3,
    minFormat: { widthMm: 150, lengthMm: 220, sheetsPerHour: 500 },
    maxFormat: { widthMm: 660, lengthMm: 960, sheetsPerHour: 1000 },
    belowMinSpeedReducerPercent: '10',
    aboveMaxSpeedReducerPercent: '20',
  }
}

describe('Cadastro SERIGRAFIA — catálogo', () => {
  it('o bloco default é manual e com matriz zerada', () => {
    const block = defaultScreenPrintingBlock()
    expect(block.automatic).toBe(false)
    expect(block.minFormat.widthMm).toBe(0)
  })

  it('um bloco bem preenchido não tem erros', () => {
    expect(validateScreenPrinting(validBlock())).toEqual({})
  })

  it('exige velocidade ≥ 1 em cada ponto da matriz', () => {
    const block = validBlock()
    block.minFormat.sheetsPerHour = 0
    expect(validateScreenPrinting(block)['minFormat.sheetsPerHour']).toBeTruthy()
  })

  it('exige dimensões ≥ 1 em cada ponto da matriz', () => {
    const block = validBlock()
    block.minFormat.widthMm = 0
    block.maxFormat.lengthMm = 0
    const errors = validateScreenPrinting(block)
    expect(errors['minFormat.widthMm']).toBeTruthy()
    expect(errors['maxFormat.lengthMm']).toBeTruthy()
  })

  it('exige setups e quebra por cor ≥ 0', () => {
    const block = validBlock()
    block.washMinutesPerColor = -1
    expect(validateScreenPrinting(block)['washMinutesPerColor']).toBeTruthy()
  })

  it('hidrata a response (dimensões em mm + strings)', () => {
    const fromApi: ScreenPrintingBlockResponse = {
      automatic: false,
      squareSetupMinutes: 12,
      screenSetupMinutes: 5,
      washMinutesPerColor: 10,
      wasteSheetsPerColor: 3,
      minFormat: {
        width: { value: 15, unit: 'CENTIMETER', millimeters: 150 },
        length: { value: 22, unit: 'CENTIMETER', millimeters: 220 },
        sheetsPerHour: 500,
      },
      maxFormat: {
        width: { value: 66, unit: 'CENTIMETER', millimeters: 660 },
        length: { value: 96, unit: 'CENTIMETER', millimeters: 960 },
        sheetsPerHour: 1000,
      },
      belowMinSpeedReducerPercent: 10,
      aboveMaxSpeedReducerPercent: 20,
    }
    const hydrated = hydrateScreenPrintingBlock(fromApi)
    expect(hydrated.minFormat.widthMm).toBe(150)
    expect(hydrated.minFormat.lengthMm).toBe(220)
    expect(hydrated.maxFormat.widthMm).toBe(660)
    expect(hydrated.washMinutesPerColor).toBe(10)
    expect(hydrated.wasteSheetsPerColor).toBe(3)
    expect(hydrated.belowMinSpeedReducerPercent).toBe('10')
  })
})
