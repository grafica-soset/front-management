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

/** Valor unitário com 3 casas (atividade 044): 0,283 — é o unitário que fecha o total. */
export function proposalUnitMoney(value: number): string {
  return (Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
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

// ---- Cabeçalho da proposta configurado pela gráfica ----

/** Um pedaço de linha do cabeçalho, com o estilo que os marcadores pediram. */
export interface HeaderSegment {
  text: string
  bold: boolean
  italic: boolean
}

/** No máximo — as mesmas regras do servidor. */
export const PROPOSAL_HEADER_MAX_LINES = 12
export const PROPOSAL_HEADER_MAX_LENGTH = 1000

const HEADER_MARKER = /(\*\*\*[^*]+?\*\*\*|\*\*[^*]+?\*\*|\*[^*]+?\*)/g

/**
 * "CNPJ ***49.204.274/0001-91***" → [CNPJ ] [49.204.274/0001-91 em negrito itálico].
 * `**negrito**`, `*itálico*`, `***os dois***`. Asterisco sem par fica como texto.
 */
export function headerSegments(line: string): HeaderSegment[] {
  const segments: HeaderSegment[] = []
  for (const part of line.split(HEADER_MARKER)) {
    if (!part) continue
    const stars = part.length > 2 && part.startsWith('*') && part.endsWith('*')
      ? Math.min(part.match(/^\*+/)![0].length, part.match(/\*+$/)![0].length, 3)
      : 0
    if (stars === 0) {
      segments.push({ text: part, bold: false, italic: false })
      continue
    }
    segments.push({ text: part.slice(stars, -stars), bold: stars >= 2, italic: stars !== 2 })
  }
  return segments
}

/** As linhas do texto do cabeçalho; as em branco do meio ficam (são o espaçamento da gráfica). */
export function headerLines(text: string | null | undefined): HeaderSegment[][] {
  const lines = (text ?? '').replace(/\r\n?/g, '\n').split('\n').map((line) => line.trimEnd())
  while (lines.length && !lines[0]!.trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1]!.trim()) lines.pop()
  return lines.map(headerSegments)
}

/** O que há de errado com o texto do cabeçalho — as mesmas regras do servidor. Vazio é válido. */
export function proposalHeaderIssue(text: string | null | undefined): string | null {
  const lines = headerLines(text)
  if (lines.length > PROPOSAL_HEADER_MAX_LINES) return `No máximo ${PROPOSAL_HEADER_MAX_LINES} linhas.`
  const normalized = (text ?? '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').trim()
  if (normalized.length > PROPOSAL_HEADER_MAX_LENGTH) return `No máximo ${PROPOSAL_HEADER_MAX_LENGTH} caracteres.`
  return null
}

/** Os dados do cadastro que servem de ponto de partida para o texto do cabeçalho. */
export interface HeaderCompanyData {
  name: string
  corporateName: string | null
  document: string
  email: string | null
  phone: string | null
  address?: ProposalAddress | null
}

/**
 * O cabeçalho montado do cadastro, já no formato do texto: é o que a proposta imprime quando a
 * gráfica não escreveu o dela, e o ponto de partida do "Preencher com o cadastro".
 */
export function defaultProposalHeader(
  company: HeaderCompanyData,
  format: { document: (v: string) => string; phone: (v: string) => string },
): string {
  return [
    `**${company.corporateName || company.name}**`,
    ...addressLines(company.address),
    company.phone ? `Fone: ${format.phone(company.phone)}` : '',
    company.email ? `E-mail: ${company.email}` : '',
    `CNPJ ***${format.document(company.document)}***`,
  ].filter((line) => line.trim()).join('\n')
}
