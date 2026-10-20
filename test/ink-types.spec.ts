import { describe, it, expect } from 'vitest'
import type { InkColorType, InkSubtype } from '@/types/Supply'
import {
  CONVENTIONAL_INK_SUBTYPES,
  INK_COLOR_TYPES,
  INK_COLOR_TYPE_LABELS,
  INK_COLOR_TYPE_SHORT,
  INK_SUBTYPES,
  INK_SUBTYPE_LABELS,
  SCREEN_PRINTING_INK_SUBTYPES,
  isProcessOnlySelection,
  presetInkIds,
  processColorOf,
} from '@/utils/inkTypes'

/**
 * Catálogo de TIPO e SUBTIPO da tinta (atividade 032 — ajuste 0001).
 *
 * É o contrato compartilhado por três telas: o cadastro de Insumo (tinta), o bloco da impressora
 * Offset e o da Impressora Digital. Um valor de enum sem rótulo aparece como campo vazio no
 * select — daí a checagem de cobertura dos labels.
 */
describe('Catálogo de tintas — tipo e subtipo', () => {
  it('o TIPO tem exatamente CMYK e Pantone, nessa ordem', () => {
    expect(INK_COLOR_TYPES).toEqual<InkColorType[]>(['CMYK', 'PANTONE'])
  })

  it('o SUBTIPO tem Toner, Tinta Offset e Tinta Serigráfica, nessa ordem', () => {
    expect(INK_SUBTYPES).toEqual<InkSubtype[]>(['TONER', 'OFFSET_INK', 'SCREEN_PRINTING_INK'])
  })

  // A tinta serigráfica é exclusiva da serigrafia: aparece no cadastro de insumo (INK_SUBTYPES),
  // mas as impressoras convencionais só podem escolher entre toner e tinta offset.
  it('separa os subtipos da serigrafia dos das impressoras convencionais', () => {
    expect(SCREEN_PRINTING_INK_SUBTYPES).toEqual<InkSubtype[]>(['SCREEN_PRINTING_INK'])
    expect(CONVENTIONAL_INK_SUBTYPES).toEqual<InkSubtype[]>(['TONER', 'OFFSET_INK'])
  })

  it('todo tipo tem rótulo longo e curto não vazios', () => {
    for (const color of INK_COLOR_TYPES) {
      expect(INK_COLOR_TYPE_LABELS[color]?.trim()).toBeTruthy()
      expect(INK_COLOR_TYPE_SHORT[color]?.trim()).toBeTruthy()
    }
  })

  it('todo subtipo tem rótulo não vazio', () => {
    for (const subtype of INK_SUBTYPES) {
      expect(INK_SUBTYPE_LABELS[subtype]?.trim()).toBeTruthy()
    }
  })

  it('os rótulos usam a linguagem do usuário (PT-BR), não o nome do enum', () => {
    expect(INK_SUBTYPE_LABELS.OFFSET_INK).toBe('Tinta Offset')
    expect(INK_SUBTYPE_LABELS.TONER).toBe('Toner')
    expect(INK_SUBTYPE_LABELS.SCREEN_PRINTING_INK).toBe('Tinta Serigráfica')
    expect(INK_COLOR_TYPE_LABELS.PANTONE).toContain('Pantone')
  })
})

/**
 * Pré-seleção das cores no orçamento (atividade 050): 1 cor marca o preto, 4 cores a seleção CMYK.
 * As tintas são reconhecidas pelo NOME — o preto offset da gráfica está cadastrado como Pantone.
 */
describe('Pré-seleção das cores', () => {
  const offset = [
    { id: 11, value: 'Tinta Offset Ciano', inkColorType: 'CMYK' as const },
    { id: 12, value: 'Tinta Offset Magenta', inkColorType: 'CMYK' as const },
    { id: 13, value: 'Tinta Offset Amarelo', inkColorType: 'CMYK' as const },
    { id: 14, value: 'Preto', inkColorType: 'PANTONE' as const },
    { id: 15, value: 'Ouro Metálico 871', inkColorType: 'PANTONE' as const },
  ]

  it('reconhece a cor da seleção pelo nome, em português ou inglês', () => {
    expect(processColorOf('Toner Cyan')).toBe('C')
    expect(processColorOf('Tinta Offset Preto')).toBe('K')
    expect(processColorOf('AMARELO')).toBe('Y')
    expect(processColorOf('Ouro Metálico 871')).toBeNull()
    // Palavra inteira: "pretoria" não é preto.
    expect(processColorOf('Pretoria Azul')).toBeNull()
  })

  it('1 cor marca o preto, mesmo cadastrado como Pantone', () => {
    expect(presetInkIds(1, offset)).toEqual([14])
  })

  it('4 cores marcam ciano, magenta, amarelo e preto', () => {
    expect(presetInkIds(4, offset)).toEqual([11, 12, 13, 14])
  })

  it('outras quantidades não têm padrão', () => {
    expect(presetInkIds(0, offset)).toEqual([])
    expect(presetInkIds(2, offset)).toEqual([])
    expect(presetInkIds(5, offset)).toEqual([])
  })

  it('sem todas as cores da seleção na impressora, não marca meia seleção', () => {
    expect(presetInkIds(4, offset.filter((i) => i.id !== 13))).toEqual([])
    expect(presetInkIds(1, offset.filter((i) => i.id !== 14))).toEqual([])
  })

  it('com dois pretos, vale o cadastrado como CMYK', () => {
    const dois = [...offset, { id: 16, value: 'Preto Seleção', inkColorType: 'CMYK' as const }]
    expect(presetInkIds(1, dois)).toEqual([16])
  })

  it('só troca a seleção quando ela não tem cor especial', () => {
    expect(isProcessOnlySelection([], offset)).toBe(true)
    expect(isProcessOnlySelection([14], offset)).toBe(true)
    expect(isProcessOnlySelection([14, 15], offset)).toBe(false)
  })
})
