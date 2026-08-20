import { describe, it, expect } from 'vitest'
import type { PrintingSheetSetup, QuoteProduct, QuoteSheet, QuoteStep } from '@/types/QuoteDraft'
import {
  DEMO_MACHINES,
  coverageIssues,
  estimateProductCost,
  inkCostForFace,
  inkGramsForFace,
  inkIssues,
  isSheetPrinted,
  machineOptions,
  piecesPerSheet,
  printedSides,
  setupFor,
  sheetsForSheet,
  sheetsPerUnit,
} from '@/utils/quoteDemoData'

/**
 * Estrutura do produto e configuração de impressão no orçamento (atividade 034).
 *
 * Duas contas sustentam todo o preço, e são as que precisam estar certas antes de qualquer tela:
 *
 *   1. LÂMINAS × JOGOS × VIAS — cada via entra uma vez por jogo, e a tiragem multiplica o bloco.
 *      Casos do enunciado: "100 blocos com 10 jogos de 4 vias = 40 folhas por bloco" e a TELA 01
 *      (10 blocos, 50 jogos, 2 vias).
 *
 *   2. IMPRESSÕES SE SOMAM — cada etapa de impressão é um acerto próprio, com as suas cores,
 *      tintas e máquina. O papel da folha, porém, é comprado uma vez só: duas passadas na mesma
 *      via acrescentam quebra, não a tiragem inteira de novo.
 */

const CMYK = [11, 12, 13, 14]

function sheet(kind: QuoteSheet['kind'], index: number): QuoteSheet {
  return { uid: `${kind}-${index}`, kind, index, paperTypeId: 1 }
}

function setup(front: number, back = 0, frontCoverage: number | null = 30, backCoverage: number | null = 30): PrintingSheetSetup {
  return {
    frontColors: front,
    backColors: back,
    frontInkIds: CMYK.slice(0, front),
    backInkIds: CMYK.slice(0, back),
    frontCoverage,
    backCoverage,
  }
}

/** Etapa de impressão configurando as folhas informadas; as demais ficam fora dela. */
function printing(uid: string, bySheet: Record<string, PrintingSheetSetup>, machineId: number | null = 101): QuoteStep {
  return {
    uid,
    activityId: 3,
    parameters: {},
    printing: { bySheet, machineId, perSheet: false, machineIdBySheet: {}, separateCovers: false, coverMachineId: null },
  }
}

function product(overrides: Partial<QuoteProduct> = {}): QuoteProduct {
  const sheets = overrides.sheets ?? [sheet('VIA', 1), sheet('VIA', 2)]
  return {
    uid: 'p1',
    name: 'Bloco de Pedidos',
    widthMm: 100,
    heightMm: 150,
    quantity: 10,
    structure: 'BLOCK',
    blades: 1,
    sets: 50,
    vias: 2,
    hasCovers: false,
    coverCount: 1,
    steps: [],
    ...overrides,
    sheets,
  }
}

describe('estrutura do produto — jogos × vias', () => {
  it('bloco de 10 jogos com 4 vias tem 40 folhas por bloco', () => {
    const p = product({ quantity: 100, sets: 10, vias: 4, sheets: [1, 2, 3, 4].map((i) => sheet('VIA', i)) })
    expect(sheetsPerUnit(p)).toBe(40)
  })

  it('cada via consome uma folha por jogo, multiplicada pela tiragem', () => {
    const p = product({ quantity: 100, sets: 10, vias: 4, sheets: [1, 2, 3, 4].map((i) => sheet('VIA', i)) })
    // 100 blocos × 10 jogos = 1.000 folhas de cada via; 4.000 no total.
    expect(sheetsForSheet(p, p.sheets[0]!)).toBe(1000)
    expect(p.sheets.reduce((sum, s) => sum + sheetsForSheet(p, s), 0)).toBe(4000)
  })

  it('TELA 01 — 10 blocos de 50 jogos com 2 vias', () => {
    const p = product()
    expect(sheetsPerUnit(p)).toBe(100)
    expect(sheetsForSheet(p, p.sheets[0]!)).toBe(500)
  })

  it('lâmina não multiplica por jogos: uma folha por peça da tiragem', () => {
    const p = product({ structure: 'BLADE', blades: 1, quantity: 1000, sheets: [sheet('BLADE', 1)] })
    expect(sheetsPerUnit(p)).toBe(1)
    expect(sheetsForSheet(p, p.sheets[0]!)).toBe(1000)
  })

  it('cada capa é uma folha própria e não se repete por jogo', () => {
    const p = product({
      hasCovers: true,
      coverCount: 2,
      sheets: [sheet('VIA', 1), sheet('VIA', 2), sheet('COVER', 1), sheet('COVER', 2)],
    })
    // 50 jogos × 2 vias + 2 capas.
    expect(sheetsPerUnit(p)).toBe(102)
    // Cada capa entra uma vez por bloco: 10 blocos = 10 folhas de cada capa.
    expect(sheetsForSheet(p, p.sheets[2]!)).toBe(10)
    expect(sheetsForSheet(p, p.sheets[3]!)).toBe(10)
  })
})

describe('folha fora da impressão', () => {
  it('zero cores nas duas faces = folha não impressa nesta etapa', () => {
    expect(isSheetPrinted(sheet('VIA', 2), setup(0, 0))).toBe(false)
    expect(isSheetPrinted(sheet('VIA', 1), setup(4, 0))).toBe(true)
  })

  it('capa pode ficar de fora enquanto a outra imprime', () => {
    expect(isSheetPrinted(sheet('COVER', 1), setup(4, 4))).toBe(true)
    expect(isSheetPrinted(sheet('COVER', 2), setup(0, 0))).toBe(false)
  })

  it('conta as faces pelas cores: 4x0 roda uma face, 4x1 roda duas', () => {
    expect(printedSides(setup(4, 0))).toBe(1)
    expect(printedSides(setup(4, 1))).toBe(2)
    expect(printedSides(setup(0, 0))).toBe(0)
  })

  it('folha fora da etapa não entra na comparação de impressoras', () => {
    const sheets = [sheet('VIA', 1), sheet('VIA', 2)]
    const p = product({ sheets })
    const comAs2 = printing('i1', { 'VIA-1': setup(4), 'VIA-2': setup(0, 0) })
    const so1 = printing('i2', { 'VIA-1': setup(4) })
    expect(machineOptions(p, comAs2, sheets)[0]!.total).toBeCloseTo(machineOptions(p, so1, [sheets[0]!])[0]!.total, 5)
  })

  it('sem nenhuma folha impressa, não há impressora a escolher', () => {
    const sheets = [sheet('VIA', 1), sheet('VIA', 2)]
    const p = product({ sheets })
    const nenhuma = printing('i1', { 'VIA-1': setup(0, 0), 'VIA-2': setup(0, 0) })
    expect(machineOptions(p, nenhuma, sheets)).toHaveLength(0)
  })

  it('mas o papel da via não impressa continua sendo comprado', () => {
    const umaVia = [sheet('VIA', 1)]
    const duasVias = [sheet('VIA', 1), sheet('VIA', 2)]
    const so1 = product({ sheets: umaVia, steps: [printing('i1', { 'VIA-1': setup(4) })] })
    const com2 = product({ sheets: duasVias, steps: [printing('i1', { 'VIA-1': setup(4), 'VIA-2': setup(0, 0) })] })

    const papel = (p: QuoteProduct) => estimateProductCost(p).lines.find((l) => l.label === 'Papel')!.value
    const chapas = (p: QuoteProduct) => estimateProductCost(p).lines.find((l) => l.label === 'Chapas')!.value

    expect(papel(com2)).toBeGreaterThan(papel(so1))
    expect(chapas(com2)).toBeCloseTo(chapas(so1), 5)
  })
})

describe('múltiplas impressões no mesmo produto', () => {
  const sheets = [sheet('VIA', 1), sheet('VIA', 2)]

  it('cada etapa tem a sua configuração, sem contaminar a outra', () => {
    const primeira = printing('i1', { 'VIA-1': setup(4), 'VIA-2': setup(4) })
    const segunda = printing('i2', { 'VIA-1': setup(1), 'VIA-2': setup(0, 0) })
    expect(setupFor(primeira, sheets[1]!).frontColors).toBe(4)
    expect(setupFor(segunda, sheets[1]!).frontColors).toBe(0)
  })

  it('a segunda impressão soma custo de máquina e chapa', () => {
    const uma = product({ sheets, steps: [printing('i1', { 'VIA-1': setup(4), 'VIA-2': setup(4) })] })
    const duas = product({
      sheets,
      steps: [
        printing('i1', { 'VIA-1': setup(4), 'VIA-2': setup(4) }),
        printing('i2', { 'VIA-1': setup(1), 'VIA-2': setup(0, 0) }),
      ],
    })
    const linha = (p: QuoteProduct, label: string) => estimateProductCost(p).lines.find((l) => l.label === label)!.value

    expect(linha(duas, 'Impressão')).toBeGreaterThan(linha(uma, 'Impressão'))
    expect(linha(duas, 'Chapas')).toBeGreaterThan(linha(uma, 'Chapas'))
    expect(estimateProductCost(duas).total).toBeGreaterThan(estimateProductCost(uma).total)
  })

  it('a folha é comprada uma vez: a segunda impressão acrescenta só a quebra', () => {
    const uma = product({ sheets, steps: [printing('i1', { 'VIA-1': setup(4), 'VIA-2': setup(4) })] })
    const duas = product({
      sheets,
      steps: [
        printing('i1', { 'VIA-1': setup(4), 'VIA-2': setup(4) }),
        printing('i2', { 'VIA-1': setup(1), 'VIA-2': setup(0, 0) }),
      ],
    })
    const folhas = (p: QuoteProduct) => estimateProductCost(p).totalSheets
    const maquina = DEMO_MACHINES.find((m) => m.id === 101)!
    // A 2ª impressão é 1 cor numa via só: 1 passada de acerto na monocolor.
    expect(folhas(duas) - folhas(uma)).toBe(maquina.wastePerPass)
  })
})

describe('taxa de cobertura e custo de tinta', () => {
  const sheets = [sheet('VIA', 1)]
  const tinta = (p: QuoteProduct) => estimateProductCost(p).lines.find((l) => l.label === 'Tinta')!.value

  it('dobrar a cobertura dobra o consumo de tinta', () => {
    const a = product({ sheets, steps: [printing('i1', { 'VIA-1': setup(4, 0, 25) })] })
    const b = product({ sheets, steps: [printing('i1', { 'VIA-1': setup(4, 0, 50) })] })
    expect(tinta(b)).toBeCloseTo(tinta(a) * 2, 4)
  })

  it('as cores DIVIDEM a gramatura, em vez de multiplicá-la', () => {
    // Numa 4 cores cada tinta leva 25% do que o papel absorve: o total depositado é o mesmo de
    // uma cor só. Errar isso quadruplica a tinta do orçamento.
    const maquina = DEMO_MACHINES.find((m) => m.id === 101)!
    const p = product({ sheets })
    const umaCor = inkGramsForFace(p, sheets[0]!, maquina, 1, 40, 500)
    const quatroCores = inkGramsForFace(p, sheets[0]!, maquina, 4, 40, 500)
    expect(quatroCores).toBeCloseTo(umaCor, 6)
  })

  it('o que muda com as cores é o preço, não a gramatura', () => {
    const maquina = DEMO_MACHINES.find((m) => m.id === 101)!
    const p = product({ sheets })
    const gramas = inkGramsForFace(p, sheets[0]!, maquina, 4, 40, 500)
    // 4 cores de processo (média R$ 74/kg) contra 4 pantones (R$ 145 e R$ 152).
    const processo = inkCostForFace(gramas, 4, [11, 12, 13, 14])
    const pantone = inkCostForFace(gramas, 4, [16, 17, 16, 17])
    expect(pantone).toBeGreaterThan(processo)
  })

  it('cada cor leva uma fração igual da gramatura', () => {
    const maquina = DEMO_MACHINES.find((m) => m.id === 101)!
    const p = product({ sheets })
    const gramas = inkGramsForFace(p, sheets[0]!, maquina, 4, 40, 500)
    // Uma cor de preto sozinha custa 1/4 do que custariam 4 pretos.
    const umaDeQuatro = inkCostForFace(gramas, 4, [14])
    const quatroPretos = inkCostForFace(gramas, 4, [14, 14, 14, 14])
    expect(quatroPretos).toBeCloseTo(umaDeQuatro * 4, 6)
  })

  it('a cobertura é sobre a área da PEÇA FINAL, não da folha da máquina', () => {
    const maquina = DEMO_MACHINES.find((m) => m.id === 101)!
    const pequena = product({ sheets, widthMm: 100, heightMm: 150 })
    const grande = product({ sheets, widthMm: 200, heightMm: 150 })
    // Mesmas folhas rodadas e mesma grade forçada: o dobro de área na peça é o dobro de tinta.
    const a = inkGramsForFace(pequena, sheets[0]!, maquina, 4, 50, 100) / piecesPerSheet(pequena, maquina)
    const b = inkGramsForFace(grande, sheets[0]!, maquina, 4, 50, 100) / piecesPerSheet(grande, maquina)
    expect(b).toBeCloseTo(a * 2, 6)
  })

  it('a absorção depende do tipo de tinta da máquina', () => {
    // O mesmo papel bebe offset e toner de formas diferentes (1,08 contra 0,50 no Off-set).
    const p = product({ sheets })
    const offset = DEMO_MACHINES.find((m) => m.id === 101)!
    const digital = DEMO_MACHINES.find((m) => m.id === 104)!
    const naOffset = inkGramsForFace(p, sheets[0]!, offset, 4, 50, 100)
    const naDigital = inkGramsForFace(p, sheets[0]!, digital, 4, 50, 100)
    expect(naOffset).toBeGreaterThan(naDigital)
  })

  it('papel com absorção maior bebe mais tinta', () => {
    const p = product({ sheets })
    const maquina = DEMO_MACHINES.find((m) => m.id === 101)!
    const couche = inkGramsForFace(p, { ...sheet('VIA', 1), paperTypeId: 5 }, maquina, 4, 50, 100)
    const offsetPapel = inkGramsForFace(p, { ...sheet('VIA', 1), paperTypeId: 1 }, maquina, 4, 50, 100)
    expect(offsetPapel).toBeGreaterThan(couche)
  })

  it('sem cobertura informada não há como dimensionar a tinta', () => {
    // A cobertura é obrigatória: enquanto falta, a tinta fica zerada e o trilho segura o cálculo.
    const semCobertura = product({ sheets, steps: [printing('i1', { 'VIA-1': setup(4, 0, null) })] })
    expect(tinta(semCobertura)).toBe(0)
    expect(coverageIssues(setup(4, 0, null))).toEqual(['frente'])
    expect(coverageIssues(setup(4, 4, 50, null))).toEqual(['verso'])
    expect(coverageIssues(setup(4, 4, 50, 20))).toEqual([])
  })

  it('face sem cor não cobra cobertura', () => {
    // Só a frente imprime: a cobertura do verso não faz falta.
    expect(coverageIssues(setup(4, 0, 50, null))).toEqual([])
  })

  it('folha fora da impressão não gasta tinta', () => {
    const muda = product({ sheets, steps: [printing('i1', { 'VIA-1': setup(0, 0) })] })
    expect(tinta(muda)).toBe(0)
  })

  it('a segunda impressão soma o seu próprio consumo de tinta', () => {
    const uma = product({ sheets, steps: [printing('i1', { 'VIA-1': setup(4) })] })
    const duas = product({
      sheets,
      steps: [printing('i1', { 'VIA-1': setup(4) }), printing('i2', { 'VIA-1': setup(1) })],
    })
    expect(tinta(duas)).toBeGreaterThan(tinta(uma))
  })
})

describe('tintas por face', () => {
  it('cobra uma tinta para cada cor, em cada face', () => {
    expect(inkIssues(setup(4, 1))).toEqual([])
    expect(
      inkIssues({ frontColors: 4, backColors: 0, frontInkIds: [11, 12], backInkIds: [], frontCoverage: 30, backCoverage: 30 }),
    ).toEqual(['frente: 2 de 4 tinta(s)'])
    expect(
      inkIssues({ frontColors: 1, backColors: 2, frontInkIds: [15], backInkIds: [], frontCoverage: 30, backCoverage: 30 }),
    ).toEqual(['verso: 0 de 2 tinta(s)'])
  })
})

describe('encaixe e escolha de impressora', () => {
  it('conta as peças que cabem na folha testando as duas orientações', () => {
    const p = product({ widthMm: 100, heightMm: 150 })
    const sakurai = DEMO_MACHINES.find((m) => m.id === 101)!
    // Folha 470×660: em pé 4×4 = 16; girada 6×3 = 18 — vale a maior.
    expect(piecesPerSheet(p, sakurai)).toBe(18)
  })

  it('não oferece impressora que não comporta o formato final', () => {
    const sheets = [sheet('VIA', 1)]
    const p = product({ widthMm: 900, heightMm: 1200, sheets })
    expect(machineOptions(p, printing('i1', { 'VIA-1': setup(4) }), sheets)).toHaveLength(0)
  })

  it('devolve as opções da mais barata para a mais cara', () => {
    const sheets = [sheet('VIA', 1), sheet('VIA', 2)]
    const p = product({ sheets })
    const options = machineOptions(p, printing('i1', { 'VIA-1': setup(4), 'VIA-2': setup(4) }), sheets)
    expect(options.length).toBeGreaterThan(1)
    const totals = options.map((o) => o.total)
    expect([...totals].sort((a, b) => a - b)).toEqual(totals)
  })
})
