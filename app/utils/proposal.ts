/**
 * Regras de apresentação da PROPOSTA DE FORNECIMENTO (atividade 038).
 *
 * Funções puras: a página só as chama. Seguem o jeito que a gráfica já escreve a proposta —
 * "Iguape, 15.02.2022", "Valor R$: 145,00", e "Idem acima ..." quando o produto se repete com outra
 * quantidade.
 */
import type { ProposalAddress, ProposalItem } from '@/types/QuoteProposal'

/** "Iguape, 25.09.2026" — sem cidade, só a data. */
export function proposalPlaceAndDate(city: string | null | undefined, iso: string | null | undefined, now = new Date()): string {
  const date = iso ? new Date(iso) : now
  const pad = (n: number) => String(n).padStart(2, '0')
  const text = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`
  return city?.trim() ? `${city.trim()}, ${text}` : text
}

/** "145,00" — o "R$" fica no rótulo ("Valor R$:"), como na proposta da gráfica. */
export function proposalMoney(value: number): string {
  return (Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Endereço em até duas linhas: "Rua X, 88 - Centro" / "Iguape - SP". */
export function addressLines(address: ProposalAddress | null | undefined): string[] {
  if (!address) return []
  const street = [
    [address.street, address.number].filter(Boolean).join(', '),
    address.complement,
    address.neighborhood,
  ].filter((part) => part && String(part).trim()).join(' - ')
  const city = [address.city, address.state].filter(Boolean).join(' - ')
  return [street, city].filter((line) => line.trim())
}

export interface PrintedItem extends ProposalItem {
  /** A descrição a imprimir: igual à do item anterior vira "Idem acima ...". */
  printedDescription: string
}

/**
 * O mesmo produto em outra quantidade é a forma mais comum de proposta ("10 blocos por tanto,
 * 20 por tanto"). A gráfica escreve "Idem acima ..." em vez de repetir o parágrafo inteiro.
 */
export function itemsForPrint(items: ProposalItem[]): PrintedItem[] {
  return [...items]
    .sort((a, b) => a.position - b.position)
    .map((item, index, sorted) => ({
      ...item,
      printedDescription: index > 0 && sorted[index - 1]!.description === item.description ? 'Idem acima ...' : item.description,
    }))
}

/** O que há de errado com a URL da logo — as mesmas regras do servidor. Vazia é válida (sem logo). */
export function logoUrlIssue(value: string | null | undefined): string | null {
  const url = value?.trim() ?? ''
  if (!url) return null
  if (url.length > 1000) return 'A URL tem no máximo 1000 caracteres.'
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
      return 'Informe um endereço http:// ou https://.'
    }
    return null
  } catch {
    return 'Informe um endereço http:// ou https://.'
  }
}
