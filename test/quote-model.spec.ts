import { describe, it, expect } from 'vitest'
import type { PrintingSheetSetup, QuoteProduct, QuoteSheet, QuoteStep } from '@/types/QuoteDraft'
import {
  colorsLabel,
  coverageIssues,
  inkIssues,
  isSheetPrinted,
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
