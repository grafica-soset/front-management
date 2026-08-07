import { describe, it, expect } from 'vitest'
import type { ActivityFinishingSubtype, ActivityType, PrintingInkKind } from '@/types/Activity'
import {
  ACTIVITY_FINISHING_SUBTYPES,
  ACTIVITY_FINISHING_SUBTYPE_HINTS,
  ACTIVITY_FINISHING_SUBTYPE_LABELS,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_HINTS,
  ACTIVITY_TYPE_LABELS,
  PRINTING_INK_KINDS,
  PRINTING_INK_KIND_LABELS,
} from '@/utils/activityCatalog'

/**
 * Catálogo do cadastro de Atividades (032 — ajuste 0004).
 *
 * O TIPO é o que decide o que o orçamento pergunta: só existe pergunta de tinta quando há uma
 * atividade de Impressão. Um valor de enum sem rótulo aparece como opção vazia no select — daí a
 * checagem de cobertura.
 */
describe('Catálogo de atividades — tipos', () => {
  it('tem os cinco tipos, na ordem do cadastro', () => {
    expect(ACTIVITY_TYPES).toEqual<ActivityType[]>([
      'MANUAL',
      'PRINTING',
      'CUTTING',
      'FINISHING',
      'PACKAGING',
    ])
  })

  it('todo tipo tem rótulo e explicação não vazios', () => {
    for (const type of ACTIVITY_TYPES) {
      expect(ACTIVITY_TYPE_LABELS[type]?.trim()).toBeTruthy()
      expect(ACTIVITY_TYPE_HINTS[type]?.trim()).toBeTruthy()
    }
  })

  it('usa a linguagem do usuário nos rótulos', () => {
    expect(ACTIVITY_TYPE_LABELS.PRINTING).toBe('Impressão')
    expect(ACTIVITY_TYPE_LABELS.CUTTING).toBe('Corte')
    expect(ACTIVITY_TYPE_LABELS.PACKAGING).toBe('Empacotamento')
  })

  // O antigo "tipo" (Manual/Automatizada/Acabamento) virou o SUBTIPO do acabamento.
  it('o subtipo do acabamento tem as três opções', () => {
    expect(ACTIVITY_FINISHING_SUBTYPES).toEqual<ActivityFinishingSubtype[]>([
      'MANUAL',
      'FINISHING_TASK',
      'AUTOMATED',
    ])
    for (const subtype of ACTIVITY_FINISHING_SUBTYPES) {
      expect(ACTIVITY_FINISHING_SUBTYPE_LABELS[subtype]?.trim()).toBeTruthy()
      expect(ACTIVITY_FINISHING_SUBTYPE_HINTS[subtype]?.trim()).toBeTruthy()
    }
    expect(ACTIVITY_FINISHING_SUBTYPE_LABELS.FINISHING_TASK).toBe('Atividade de acabamento')
  })

  it('a tinta da impressão tem CMYK, Pantone e Serigrafia', () => {
    expect(PRINTING_INK_KINDS).toEqual<PrintingInkKind[]>(['CMYK', 'PANTONE', 'SCREEN_PRINTING'])
    for (const kind of PRINTING_INK_KINDS) {
      expect(PRINTING_INK_KIND_LABELS[kind]?.trim()).toBeTruthy()
    }
    expect(PRINTING_INK_KIND_LABELS.SCREEN_PRINTING).toBe('Serigrafia')
  })
})
