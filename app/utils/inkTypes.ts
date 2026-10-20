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

// ---- Pré-seleção das cores no orçamento (atividade 050) ---------------------------------------

/** Uma cor da seleção (quadricromia). */
export type ProcessColor = 'C' | 'M' | 'Y' | 'K'

/**
 * Palavras que dizem qual cor da seleção a tinta é. É pelo NOME e não pelo tipo do cadastro: o preto
 * offset costuma estar cadastrado como Pantone, porque também imprime sozinho, e mesmo assim é o K
 * de uma quadricromia. É a mesma regra da descrição da proposta no backend (atividade 049).
 */
const PROCESS_COLOR_WORDS: Record<ProcessColor, string[]> = {
  C: ['cyan', 'ciano'],
  M: ['magenta'],
  Y: ['amarelo', 'yellow'],
  K: ['preto', 'black'],
}

/** A cor da seleção que a tinta é, pelo nome ("Toner Cyan" → C, "Tinta Offset Preto" → K). */
export function processColorOf(name: string): ProcessColor | null {
  const words = new Set(name.toLowerCase().split(/[^\p{L}]+/u))
  const hit = (Object.keys(PROCESS_COLOR_WORDS) as ProcessColor[]).find((color) =>
    PROCESS_COLOR_WORDS[color].some((word) => words.has(word)),
  )
  return hit ?? null
}

/**
 * As tintas que já vêm marcadas quando o orçamentista informa as CORES de uma face: 1 cor é quase
 * sempre o preto; 4 cores, a seleção CMYK. Outra quantidade não tem padrão e volta vazia — e também
 * volta vazia quando a impressora não tem todas as cores que o padrão pede, para não marcar meia
 * seleção. Com mais de uma tinta da mesma cor (ex.: dois pretos), vale a CMYK do cadastro, depois a
 * primeira da lista.
 */
export function presetInkIds(
  colors: number,
  inks: { id: number; value: string; inkColorType?: InkColorType | null }[],
): number[] {
  const wanted: ProcessColor[] = colors === 1 ? ['K'] : colors === 4 ? ['C', 'M', 'Y', 'K'] : []
  const ids: number[] = []
  for (const color of wanted) {
    const matches = inks.filter((ink) => processColorOf(ink.value) === color)
    const ink = matches.find((i) => i.inkColorType === 'CMYK') ?? matches[0]
    if (!ink) return []
    ids.push(ink.id)
  }
  return ids
}

/** A seleção atual é só de cores da seleção (ou está vazia)? Então a pré-seleção pode trocá-la. */
export function isProcessOnlySelection(selected: number[], inks: { id: number; value: string }[]): boolean {
  return selected.every((id) => {
    const ink = inks.find((i) => i.id === id)
    return !!ink && processColorOf(ink.value) !== null
  })
}
