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
