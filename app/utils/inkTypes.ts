/**
 * Catálogo do TIPO e do SUBTIPO da tinta — atividade 032 (ajuste 0001).
 * Compartilhado pelo insumo Tinta e pelas impressoras (Offset e Digital), que declaram
 * quais tipos aceitam e qual subtipo usam.
 *
 * Os dois eixos são independentes: existe toner Pantone e existe tinta offset CMYK.
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

export const INK_SUBTYPES: InkSubtype[] = ['TONER', 'OFFSET_INK']

export const INK_SUBTYPE_LABELS: Record<InkSubtype, string> = {
  TONER: 'Toner',
  OFFSET_INK: 'Tinta Offset',
}
