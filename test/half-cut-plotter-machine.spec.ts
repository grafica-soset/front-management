import { describe, it, expect } from 'vitest'
import type { HalfCutPlotterBlock } from '@/types/Machine'
import {
  MACHINE_TYPE_LABELS,
  defaultHalfCutPlotterBlock,
  hydrateHalfCutPlotterBlock,
  validateHalfCutPlotter,
} from '@/utils/machineCatalog'

/**
 * Ploter de Meio Corte (HALF_CUT_PLOTTER — atividade 046): setup de arquivo, velocidade linear da
 * lâmina (mm/s) e tempo por alimentação.
 */
function validBlock(): HalfCutPlotterBlock {
  return { fileSetupMinutes: 5, cuttingSpeedMmPerSecond: 500, feedTimeSecondsPerLoad: 40 }
}

describe('Cadastro PLOTER DE MEIO CORTE — catálogo', () => {
  it('tem rótulo próprio', () => {
    expect(MACHINE_TYPE_LABELS.HALF_CUT_PLOTTER).toBe('Ploter de Meio Corte')
  })

  it('um bloco bem preenchido não tem erros', () => {
    expect(validateHalfCutPlotter(validBlock())).toEqual({})
  })

  it('o bloco default não passa: a velocidade é obrigatória', () => {
    expect(validateHalfCutPlotter(defaultHalfCutPlotterBlock())['cuttingSpeedMmPerSecond']).toBeTruthy()
  })

  it('exige tempos ≥ 0', () => {
    expect(validateHalfCutPlotter({ ...validBlock(), feedTimeSecondsPerLoad: -1 })['feedTimeSecondsPerLoad']).toBeTruthy()
  })

  it('hidrata a response e um bloco nulo', () => {
    expect(hydrateHalfCutPlotterBlock(validBlock())).toEqual(validBlock())
    expect(hydrateHalfCutPlotterBlock(null)).toEqual(defaultHalfCutPlotterBlock())
  })
})
