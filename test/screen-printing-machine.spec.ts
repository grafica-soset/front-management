import { describe, it, expect } from 'vitest'
import type { ScreenPrintingBlockRequest, ScreenPrintingBlockResponse } from '@/types/Machine'
import {
  MACHINE_TYPE_LABELS,
  defaultScreenPrintingBlock,
  hydrateScreenPrintingBlock,
  validateScreenPrinting,
} from '@/utils/machineCatalog'

/**
 * Bloco SERIGRAFIA (SCREEN_PRINTING): matriz de formato (dois pontos com dimensões numéricas),
 * setup de esquadros, setup de tela, lavagem por cor e quebra por cor. Máquina manual.
 *
 * Atividade 032 (ajuste 0003): a máquina também declara a Matriz Fotográfica (só a Tela de
 * Nylon), os tipos de tinta aceitos e o subtipo (só Tinta Serigráfica).
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
    acceptedPlateTypes: ['NYLON_SCREEN'],
    acceptedInkColorTypes: ['CMYK', 'PANTONE'],
    inkSubtype: 'SCREEN_PRINTING_INK',
  }
}

describe('Cadastro SERIGRAFIA — catálogo', () => {
  it('o tipo de máquina se chama Impressora Serigráfica', () => {
    expect(MACHINE_TYPE_LABELS.SCREEN_PRINTING).toBe('Impressora Serigráfica')
  })

  it('o bloco default é manual, com matriz zerada e já com tela + tinta serigráfica', () => {
    const block = defaultScreenPrintingBlock()
    expect(block.automatic).toBe(false)
    expect(block.minFormat.widthMm).toBe(0)
    expect(block.acceptedPlateTypes).toEqual(['NYLON_SCREEN'])
    expect(block.inkSubtype).toBe('SCREEN_PRINTING_INK')
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

  // Campo esvaziado no formulário vira string vazia: sem a guarda numérica ele passava pela
  // validação e o backend recusava o salvamento com um 400 genérico.
  it('acusa campo numérico apagado em vez de deixar salvar', () => {
    const block = validBlock()
    block.squareSetupMinutes = '' as unknown as number
    block.maxFormat.sheetsPerHour = '' as unknown as number
    block.aboveMaxSpeedReducerPercent = ''
    const errors = validateScreenPrinting(block)
    expect(errors['squareSetupMinutes']).toBeTruthy()
    expect(errors['maxFormat.sheetsPerHour']).toBeTruthy()
    expect(errors['aboveMaxSpeedReducerPercent']).toBeTruthy()
  })

  it('exige ao menos um tipo de tinta', () => {
    const block = validBlock()
    block.acceptedInkColorTypes = []
    expect(validateScreenPrinting(block)['acceptedInkColorTypes']).toBeTruthy()
  })

  it('recusa matriz e tinta que não sejam de serigrafia', () => {
    const withOffsetPlate = validBlock()
    withOffsetPlate.acceptedPlateTypes = ['CTP']
    expect(validateScreenPrinting(withOffsetPlate)['acceptedPlateTypes']).toBeTruthy()

    const withOffsetInk = validBlock()
    withOffsetInk.inkSubtype = 'OFFSET_INK'
    expect(validateScreenPrinting(withOffsetInk)['inkSubtype']).toBeTruthy()
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
      acceptedPlateTypes: ['NYLON_SCREEN'],
      acceptedInkColorTypes: ['PANTONE'],
      inkSubtype: 'SCREEN_PRINTING_INK',
    }
    const hydrated = hydrateScreenPrintingBlock(fromApi)
    expect(hydrated.minFormat.widthMm).toBe(150)
    expect(hydrated.minFormat.lengthMm).toBe(220)
    expect(hydrated.maxFormat.widthMm).toBe(660)
    expect(hydrated.washMinutesPerColor).toBe(10)
    expect(hydrated.wasteSheetsPerColor).toBe(3)
    expect(hydrated.belowMinSpeedReducerPercent).toBe('10')
    expect(hydrated.acceptedInkColorTypes).toEqual(['PANTONE'])
    expect(hydrated.inkSubtype).toBe('SCREEN_PRINTING_INK')
  })

  // Máquina cadastrada antes do ajuste 0003: a API não devolve matriz/tinta e a edição não pode
  // quebrar — a tela e a tinta serigráfica (únicas possíveis) entram por default.
  it('hidrata bloco legado sem matriz e sem tinta', () => {
    const legacy = {
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
    } as ScreenPrintingBlockResponse

    const hydrated = hydrateScreenPrintingBlock(legacy)
    expect(hydrated.acceptedPlateTypes).toEqual(['NYLON_SCREEN'])
    expect(hydrated.inkSubtype).toBe('SCREEN_PRINTING_INK')
    // Sem tipos de tinta: o formulário obriga o usuário a marcar antes de salvar.
    expect(hydrated.acceptedInkColorTypes).toEqual([])
    expect(validateScreenPrinting(hydrated)['acceptedInkColorTypes']).toBeTruthy()
  })
})
