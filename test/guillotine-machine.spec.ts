import { describe, it, expect } from 'vitest'
import type { GuillotineBlock } from '@/types/Machine'
import {
  defaultGuillotineBlock,
  hydrateGuillotineBlock,
  validateGuillotine,
} from '@/utils/machineCatalog'

/**
 * Bloco GUILHOTINA: além dos tempos de corte, a guilhotina passou a ter
 * alimentação de papel (igual à Offset) — tempo por alimentação (segundos) e
 * altura de cada leva (mm; default 40 mm = 4 cm).
 */
describe('Cadastro GUILHOTINA — alimentação de papel', () => {
  it('o bloco default traz altura de alimentação de 40 mm (4 cm)', () => {
    const block = defaultGuillotineBlock()
    expect(block.feedTimeSecondsPerLoad).toBe(0)
    expect(block.feedLoadIncrementMm).toBe(40)
  })

  it('hidrata os campos de alimentação vindos da API', () => {
    const fromApi: GuillotineBlock = {
      bladeDescentTimeSeconds: 3,
      paperMovementTimeSeconds: 5,
      measureSetupTimeSeconds: 20,
      feedTimeSecondsPerLoad: 7,
      feedLoadIncrementMm: 50,
    }
    expect(hydrateGuillotineBlock(fromApi)).toEqual(fromApi)
  })

  it('um bloco bem preenchido não tem erros de validação', () => {
    expect(validateGuillotine(defaultGuillotineBlock())).toEqual({})
  })

  it('exige altura de alimentação ≥ 1 mm', () => {
    const block = { ...defaultGuillotineBlock(), feedLoadIncrementMm: 0 }
    expect(validateGuillotine(block)['feedLoadIncrementMm']).toBeTruthy()
  })

  it('rejeita tempo por alimentação negativo', () => {
    const block = { ...defaultGuillotineBlock(), feedTimeSecondsPerLoad: -1 }
    expect(validateGuillotine(block)['feedTimeSecondsPerLoad']).toBeTruthy()
  })
})
