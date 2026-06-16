import { describe, it, expect } from 'vitest'
import type { LaminatingBlock, LaminatingBlockResponse } from '@/types/Machine'
import {
  defaultLaminatingBlock,
  hydrateLaminatingBlock,
  validateLaminating,
} from '@/utils/machineCatalog'

/**
 * Bloco PLASTIFICADORA (LAMINATING): tempo de setup e velocidade em metros/minuto. Máquina
 * de rolo (1 folha por vez), manual.
 */

function validBlock(): LaminatingBlock {
  return {
    setupMinutes: 12,
    speedMetersPerMinute: '1',
  }
}

describe('Cadastro PLASTIFICADORA — catálogo', () => {
  it('o bloco default tem velocidade de 1 m/min', () => {
    expect(defaultLaminatingBlock().speedMetersPerMinute).toBe('1')
  })

  it('um bloco bem preenchido não tem erros', () => {
    expect(validateLaminating(validBlock())).toEqual({})
  })

  it('exige velocidade maior que zero', () => {
    expect(validateLaminating({ ...validBlock(), speedMetersPerMinute: '0' })['speedMetersPerMinute']).toBeTruthy()
    expect(validateLaminating({ ...validBlock(), speedMetersPerMinute: '-1' })['speedMetersPerMinute']).toBeTruthy()
    expect(validateLaminating({ ...validBlock(), speedMetersPerMinute: '' })['speedMetersPerMinute']).toBeTruthy()
  })

  it('exige setup ≥ 0', () => {
    expect(validateLaminating({ ...validBlock(), setupMinutes: -1 })['setupMinutes']).toBeTruthy()
  })

  it('hidrata a response (velocidade como string)', () => {
    const fromApi: LaminatingBlockResponse = { setupMinutes: 12, speedMetersPerMinute: 1.5 }
    const hydrated = hydrateLaminatingBlock(fromApi)
    expect(hydrated.setupMinutes).toBe(12)
    expect(hydrated.speedMetersPerMinute).toBe('1.5')
  })

  it('hidrata um bloco nulo para o default', () => {
    expect(hydrateLaminatingBlock(null)).toEqual(defaultLaminatingBlock())
  })
})
