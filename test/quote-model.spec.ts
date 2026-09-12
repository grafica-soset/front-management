import { describe, it, expect } from 'vitest'
import type { PrintingSheetSetup, QuoteProduct, QuoteSheet, QuoteStep } from '@/types/QuoteDraft'
import type { ProductCostingResponse } from '@/types/Quote'
import type { MachineKeyValue } from '@/types/Machine'
import type { SupplyKeyValue } from '@/types/Supply'
import {
  colorsLabel,
  coverageIssues,
  formatLabel,
  inkIssues,
  isSheetPrinted,
  plateLabel,
  platesForMachine,
  printRun,
  printedSides,
  setupFor,
  sheetLabel,
  sheetsForSheet,
  sheetsPerUnit,
} from '@/utils/quoteModel'

/**
 * Estrutura do rascunho no cliente (atividade 034).
 *
 * O preço vem do motor; o que se testa aqui é o que a tela monta e manda — a conta de folhas e as
 * regras de "esta folha entra nesta impressão?". Casos do enunciado: 100 blocos com 10 jogos de 4
 * vias = 40 folhas por bloco, e a TELA 01 (10 blocos, 50 jogos, 2 vias).
 */

function sheet(kind: QuoteSheet['kind'], index: number): QuoteSheet {
  return { uid: `${kind}-${index}`, kind, index, paperTypeId: 1, printFormatNumber: null }
}

function setup(front: number, back = 0, frontCoverage: number | null = 30, backCoverage: number | null = 30): PrintingSheetSetup {
  return {
    frontColors: front,
    backColors: back,
    frontInkIds: [11, 12, 13, 14].slice(0, front),
    backInkIds: [11, 12, 13, 14].slice(0, back),
    frontCoverage,
    backCoverage,
  }
}

function product(overrides: Partial<QuoteProduct> = {}): QuoteProduct {
  return {
    uid: 'p1', name: 'Bloco de Pedidos', widthMm: 105, heightMm: 155, quantity: 10,
    structure: 'BLOCK', blades: 1, sets: 50, vias: 2, hasCovers: false, coverCount: 1,
    identicalArtwork: null, distinctArtworks: null,
    sheets: [sheet('VIA', 1), sheet('VIA', 2)], steps: [],
    ...overrides,
  }
}

describe('estrutura do produto — jogos × vias', () => {
  it('bloco de 10 jogos com 4 vias tem 40 folhas por bloco', () => {
    const p = product({ quantity: 100, sets: 10, vias: 4, sheets: [1, 2, 3, 4].map((i) => sheet('VIA', i)) })
    expect(sheetsPerUnit(p)).toBe(40)
    expect(sheetsForSheet(p, p.sheets[0]!)).toBe(1000)
  })

  it('TELA 01 — 10 blocos de 50 jogos com 2 vias', () => {
    const p = product()
    expect(sheetsPerUnit(p)).toBe(100)
    expect(sheetsForSheet(p, p.sheets[0]!)).toBe(500)
  })

  it('lâmina e capa entram uma vez por unidade', () => {
    const lamina = product({ structure: 'BLADE', blades: 1, quantity: 1000, sheets: [sheet('BLADE', 1)] })
    expect(sheetsForSheet(lamina, lamina.sheets[0]!)).toBe(1000)

    const comCapa = product({ hasCovers: true, coverCount: 2, sheets: [sheet('VIA', 1), sheet('COVER', 1)] })
    expect(sheetsForSheet(comCapa, comCapa.sheets[1]!)).toBe(10)
  })
})

describe('folha dentro (ou fora) de uma impressão', () => {
  it('zero cores nas duas faces tira a folha da impressão', () => {
    expect(isSheetPrinted(sheet('VIA', 2), setup(0, 0))).toBe(false)
    expect(isSheetPrinted(sheet('VIA', 1), setup(4))).toBe(true)
  })

  it('conta as faces pelas cores e rotula no vocabulário da gráfica', () => {
    expect(printedSides(setup(4, 1))).toBe(2)
    expect(printedSides(setup(4, 0))).toBe(1)
    expect(colorsLabel(setup(4, 1))).toBe('4x1')
    expect(sheetLabel(sheet('COVER', 2))).toBe('Capa 2')
  })

  it('cada etapa de impressão tem a sua configuração por folha', () => {
    const folha = sheet('VIA', 1)
    const primeira: QuoteStep = {
      uid: 'i1', activityId: 1, parameters: {},
      printing: {
        bySheet: { [folha.uid]: setup(4) }, machineId: null, perSheet: false,
        machineIdBySheet: {}, separateCovers: false, coverMachineId: null,
      },
    }
    const segunda: QuoteStep = { uid: 'i2', activityId: 2, parameters: {} }

    expect(setupFor(primeira, folha).frontColors).toBe(4)
    expect(isSheetPrinted(folha, setupFor(segunda, folha))).toBe(false)
  })
})

describe('pendências que seguram o cálculo', () => {
  it('cobra uma tinta para cada cor, em cada face', () => {
    expect(inkIssues(setup(4, 1))).toEqual([])
    expect(inkIssues({ frontColors: 4, backColors: 0, frontInkIds: [11, 12], backInkIds: [], frontCoverage: 30, backCoverage: 30 }))
      .toEqual(['frente: 2 de 4 tinta(s)'])
  })

  it('a cobertura é obrigatória em toda face impressa', () => {
    expect(coverageIssues(setup(4, 0, null))).toEqual(['frente'])
    expect(coverageIssues(setup(4, 4, 50, null))).toEqual(['verso'])
    expect(coverageIssues(setup(4, 0, 50, null))).toEqual([])
  })
})

describe('tiragem', () => {
  const plan = (printSheetsNet: number) => ({ chosen: { printSheetsNet } })
  const costWith = (...nets: number[]) =>
    ({ sheets: nets.map(plan) } as unknown as ProductCostingResponse)

  it('soma as folhas impressas de todas as vias', () => {
    // 10 blocos × 50 jogos = 500 folhas por via; 4 aplicações por folha => 125 de tiragem em cada.
    expect(printRun(costWith(125, 125))).toBe(250)
  })

  it('é zero enquanto não há cálculo', () => {
    expect(printRun(null)).toBe(0)
  })
})

describe('rótulo de formato', () => {
  it('mostra o número do formato junto do tamanho', () => {
    expect(formatLabel('32x22', 9)).toBe('32x22 (F9)')
    expect(formatLabel('33x32', 6)).toBe('33x32 (F6)')
  })

  it('a folha inteira é o formato 1 — uma parte, nenhum corte', () => {
    expect(formatLabel('66x96', 1)).toBe('66x96 (F1)')
  })
})

describe('Chapas da impressora no orçamento (atividade 034)', () => {
  const chapaCtp: SupplyKeyValue = {
    id: 100,
    value: 'Chapa CTP 66x96',
    type: 'PLATE',
    unitOfMeasure: 'UNIT',
    plateType: 'CTP',
    unitCost: 40,
    active: true,
  }
  const chapaFilm: SupplyKeyValue = { ...chapaCtp, id: 101, value: 'Chapa Laser Film', plateType: 'LASER_FILM', unitCost: 29.89 }
  const deOutraMaquina: SupplyKeyValue = { ...chapaCtp, id: 102, value: 'Chapa CTP da Heidelberg', unitCost: 1 }
  const estoque = [chapaCtp, chapaFilm, deOutraMaquina]

  const sakurai: MachineKeyValue = {
    id: 1,
    value: 'Sakurai 58',
    machineType: 'OFFSET',
    active: true,
    plateSupplyIds: [100, 101],
  }

  it('oferece só as chapas que a impressora declara', () => {
    expect(platesForMachine(sakurai, estoque).map((c) => c.id)).toEqual([100, 101])
  })

  it('a chapa barata de outra máquina não entra na escolha', () => {
    expect(platesForMachine(sakurai, estoque).some((c) => c.id === 102)).toBe(false)
  })

  it('impressora sem chapa cadastrada não oferece nenhuma — o orçamento sai sem matriz', () => {
    expect(platesForMachine({ ...sakurai, plateSupplyIds: [] }, estoque)).toEqual([])
  })

  it('digital não usa matriz: nem pergunta', () => {
    const digital: MachineKeyValue = { ...sakurai, machineType: 'DIGITAL', plateSupplyIds: [100] }
    expect(platesForMachine(digital, estoque)).toEqual([])
  })

  it('o rótulo traz o preço, que é o que decide a escolha', () => {
    expect(plateLabel(chapaCtp)).toContain('Chapa CTP 66x96')
    expect(plateLabel(chapaCtp)).toContain('40,00')
  })

  it('sem preço no catálogo, o rótulo fica só com o nome — nunca "R$ NaN"', () => {
    expect(plateLabel({ ...chapaCtp, unitCost: undefined })).toBe('Chapa CTP 66x96')
  })
})
