import { describe, it, expect } from 'vitest'
import type { HolePunchingBlock } from '@/types/Machine'
import {
  defaultHolePunchingBlock,
  hydrateHolePunchingBlock,
  validateHolePunching,
} from '@/utils/machineCatalog'

/**
 * Bloco FURADEIRA (HOLE_PUNCHING): tempos unitários (setup do esquadro por furo, descida da
 * broca e movimento de papel por descida) + alimentação. Espelha a guilhotina.
 */

/** Bloco bem preenchido (exemplo do enunciado). */
function validBlock(): HolePunchingBlock {
  return {
    squareSetupMinutes: 12,
    drillDescentTimeSeconds: 10,
    paperMovementTimeSeconds: 45,
    feedTimeSecondsPerLoad: 7,
  }
}

describe('Cadastro FURADEIRA — catálogo', () => {
  it('o bloco default zera os tempos (sem altura de alimentação)', () => {
    const block = defaultHolePunchingBlock()
    expect(block.feedTimeSecondsPerLoad).toBe(0)
    expect('feedLoadIncrementMm' in block).toBe(false)
  })

  it('um bloco bem preenchido não tem erros', () => {
    expect(validateHolePunching(validBlock())).toEqual({})
  })

  it('exige tempos ≥ 0', () => {
    const block = { ...validBlock(), drillDescentTimeSeconds: -1 }
    expect(validateHolePunching(block)['drillDescentTimeSeconds']).toBeTruthy()
  })

  it('hidrata a response garantindo todos os campos', () => {
    const fromApi: HolePunchingBlock = {
      squareSetupMinutes: 12,
      drillDescentTimeSeconds: 10,
      paperMovementTimeSeconds: 45,
      feedTimeSecondsPerLoad: 7,
    }
    const hydrated = hydrateHolePunchingBlock(fromApi)
    expect(hydrated.squareSetupMinutes).toBe(12)
    expect(hydrated.drillDescentTimeSeconds).toBe(10)
    expect(hydrated.paperMovementTimeSeconds).toBe(45)
    expect(hydrated.feedTimeSecondsPerLoad).toBe(7)
  })

  it('hidrata um bloco nulo para o default', () => {
    expect(hydrateHolePunchingBlock(null)).toEqual(defaultHolePunchingBlock())
  })
})
