import { describe, it, expect } from 'vitest'
import type { PlateType } from '@/types/PlateType'
import {
  OFFSET_PLATE_TYPES,
  PLATE_TYPES,
  PLATE_TYPE_LABELS,
  SCREEN_PRINTING_PLATE_TYPES,
} from '@/utils/plateTypes'

/**
 * Catálogo da Matriz Fotográfica (atividade 027 + ajuste 0003 da 032).
 *
 * A Tela de Nylon é cadastrada como CHAPA (aparece no insumo, junto das demais), mas só a
 * máquina serigráfica pode aceitá-la — e a serigrafia não aceita nenhuma outra.
 */
describe('Catálogo de matrizes fotográficas', () => {
  it('o cadastro de insumo oferece as chapas e também a tela', () => {
    expect(PLATE_TYPES).toEqual<PlateType[]>(['FOTOLITO', 'LASER_FILM', 'CTP', 'NYLON_SCREEN'])
  })

  it('separa a matriz da serigrafia das matrizes da offset', () => {
    expect(SCREEN_PRINTING_PLATE_TYPES).toEqual<PlateType[]>(['NYLON_SCREEN'])
    expect(OFFSET_PLATE_TYPES).toEqual<PlateType[]>(['FOTOLITO', 'LASER_FILM', 'CTP'])
  })

  it('todo tipo tem rótulo em PT-BR não vazio', () => {
    for (const plate of PLATE_TYPES) {
      expect(PLATE_TYPE_LABELS[plate]?.trim()).toBeTruthy()
    }
    expect(PLATE_TYPE_LABELS.NYLON_SCREEN).toBe('Tela de Nylon')
  })
})
