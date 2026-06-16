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
    feedLoadIncrementMm: 40,
  }
}

describe('Cadastro FURADEIRA — catálogo', () => {
  it('o bloco default tem leva de alimentação de 40 mm', () => {
    expect(defaultHolePunchingBlock().feedLoadIncrementMm).toBe(40)
  })

  it('um bloco bem preenchido não tem erros', () => {
    expect(validateHolePunching(validBlock())).toEqual({})
  })

  it('exige tempos ≥ 0', () => {
    const block = { ...validBlock(), drillDescentTimeSeconds: -1 }
    expect(validateHolePunching(block)['drillDescentTimeSeconds']).toBeTruthy()
  })

  it('exige altura de alimentação ≥ 1', () => {
    const block = { ...validBlock(), feedLoadIncrementMm: 0 }
    expect(validateHolePunching(block)['feedLoadIncrementMm']).toBeTruthy()
  })

  it('hidrata a response garantindo todos os campos', () => {
    const fromApi: HolePunchingBlock = {
      squareSetupMinutes: 12,
      drillDescentTimeSeconds: 10,
      paperMovementTimeSeconds: 45,
      feedTimeSecondsPerLoad: 7,
      feedLoadIncrementMm: 40,
    }
    const hydrated = hydrateHolePunchingBlock(fromApi)
    expect(hydrated.squareSetupMinutes).toBe(12)
    expect(hydrated.drillDescentTimeSeconds).toBe(10)
    expect(hydrated.paperMovementTimeSeconds).toBe(45)
    expect(hydrated.feedLoadIncrementMm).toBe(40)
  })

  it('hidrata um bloco nulo para o default', () => {
    expect(hydrateHolePunchingBlock(null)).toEqual(defaultHolePunchingBlock())
  })
})
