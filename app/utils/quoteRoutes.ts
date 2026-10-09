/**
 * Rotas do orçamento (atividade 047).
 *
 * O orçamento e o produto em edição ficam na URL — `/orcamentos/6` e `/orcamentos/6/produto/1` —
 * para o usuário saber onde está e poder voltar. Orçamento ainda não salvo é `novo`; produto ainda
 * não adicionado, também.
 */

/** O segmento do orçamento na URL: o id salvo ou `novo`. */
export function quoteSegment(quoteId: number | null | undefined): string {
  return quoteId ? String(quoteId) : 'novo'
}

/** O editor do orçamento. */
export function quotePath(quoteId: number | null | undefined): string {
  return `/orcamentos/${quoteSegment(quoteId)}`
}

/** O assistente de um produto: a posição dele no orçamento (1, 2...) ou `novo`. */
export function productPath(quoteId: number | null | undefined, position: number | 'novo'): string {
  return `${quotePath(quoteId)}/produto/${position}`
}

/** Lê o id do orçamento do segmento da URL — nulo para `novo` ou valor inválido. */
export function parseQuoteSegment(segment: unknown): number | null {
  const id = Number(segment)
  return Number.isInteger(id) && id > 0 ? id : null
}

/** Lê a posição do produto (1-based) do segmento da URL — nula para `novo` ou valor inválido. */
export function parseProductSegment(segment: unknown): number | null {
  const position = Number(segment)
  return Number.isInteger(position) && position > 0 ? position : null
}
