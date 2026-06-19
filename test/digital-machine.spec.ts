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
    paperFeedSetupMinutes: 6,
    feedTimeSecondsPerLoad: 45,
    feedLoadIncrementMm: 40,
    minSpeedSheetsPerHour: 4000,
    maxSpeedSheetsPerHour: 10000,
    minFormat: { widthMm: 150, lengthMm: 220, sheetsPerHour: 5000 },
    maxFormat: { widthMm: 660, lengthMm: 960, sheetsPerHour: 9000 },
    belowMinFormatReducerPercent: '10',
    aboveMaxFormatReducerPercent: '20',
    minWeightGsm: 60,
    maxWeightGsm: 300,
    maxThicknessMicrons: 400,
    wasteSheets: 4,
    lineCoverage: { tonerGramsPerSquareMeterAt100: '4', speedReducerPercentAt100: '10' },
    imageCoverage: { tonerGramsPerSquareMeterAt100: '20', speedReducerPercentAt100: '50' },
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

  it('rejeita consumo de toner / percentual inválido na cobertura', () => {
    const block = validBlock()
    block.imageCoverage = { tonerGramsPerSquareMeterAt100: 'abc', speedReducerPercentAt100: '50' }
    expect(validateDigital(block)['imageCoverage.tonerGramsPerSquareMeterAt100']).toBeTruthy()
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
      lineCoverage: { tonerGramsPerSquareMeterAt100: 4, speedReducerPercentAt100: 10 },
      imageCoverage: { tonerGramsPerSquareMeterAt100: 20, speedReducerPercentAt100: 50 },
    }
    const hydrated = hydrateDigitalBlock(fromApi)
    expect(hydrated.colorMode).toBe('MONOCOLOR')
    expect(hydrated.minFormat.widthMm).toBe(150)
    expect(hydrated.maxFormat.sheetsPerHour).toBe(9000)
    expect(hydrated.imageCoverage.speedReducerPercentAt100).toBe('50')
  })
})
