/**
 * Catálogo do TIPO e do SUBTIPO da tinta — atividade 032 (ajuste 0001).
 * Compartilhado pelo insumo Tinta e pelas impressoras (Offset, Digital e Serigrafia), que
 * declaram quais tipos aceitam e qual subtipo usam.
 *
 * Os dois eixos são independentes: existe toner Pantone e existe tinta offset CMYK.
 *
 * A TINTA SERIGRÁFICA (atividade 032 — ajuste 0003) é mais um subtipo no cadastro de insumo,
 * mas é exclusiva da máquina serigráfica — daí as listas por máquina abaixo.
 */
import type { InkColorType, InkSubtype } from '@/types/Supply'

export const INK_COLOR_TYPES: InkColorType[] = ['CMYK', 'PANTONE']

export const INK_COLOR_TYPE_LABELS: Record<InkColorType, string> = {
  CMYK: 'CMYK (seleção de cores)',
  PANTONE: 'Pantone (cor especial)',
}

/** Rótulo curto, para grids e chips. */
export const INK_COLOR_TYPE_SHORT: Record<InkColorType, string> = {
  CMYK: 'CMYK',
  PANTONE: 'Pantone',
}

export const INK_SUBTYPES: InkSubtype[] = ['TONER', 'OFFSET_INK', 'SCREEN_PRINTING_INK']

export const INK_SUBTYPE_LABELS: Record<InkSubtype, string> = {
  TONER: 'Toner',
  OFFSET_INK: 'Tinta Offset',
  SCREEN_PRINTING_INK: 'Tinta Serigráfica',
}

/** Subtipos exclusivos da serigrafia. */
export const SCREEN_PRINTING_INK_SUBTYPES: InkSubtype[] = ['SCREEN_PRINTING_INK']

/** Subtipos das impressoras convencionais (Offset e Digital). */
export const CONVENTIONAL_INK_SUBTYPES: InkSubtype[] = INK_SUBTYPES.filter(
  (s) => !SCREEN_PRINTING_INK_SUBTYPES.includes(s),
)
