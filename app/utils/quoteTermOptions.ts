/**
 * Opções das condições de fornecimento (atividade 038, Orçamento > Configurações): o que cada tipo
 * preenche no orçamento e as padrões que entram no orçamento novo.
 */
import type { SupplyConditions } from '@/types/SavedQuote'
import type { QuoteTermKind, QuoteTermOptionKeyValue } from '@/types/QuoteTermOption'

export interface QuoteTermKindInfo {
  kind: QuoteTermKind
  label: string
  /** O campo do orçamento que a opção preenche. */
  field: keyof SupplyConditions
  /** Mesmo limite da coluna do orçamento: a opção tem que caber nele. */
  maxLength: number
  placeholder: string
}

/** Na ordem em que aparecem no orçamento e nas configurações. */
export const QUOTE_TERM_KINDS: QuoteTermKindInfo[] = [
  { kind: 'PROPOSAL_VALIDITY', label: 'Validade da proposta', field: 'proposalValidity', maxLength: 200, placeholder: 'Ex.: 15 dias' },
  { kind: 'PAYMENT_TERMS', label: 'Condições de pagamento', field: 'paymentTerms', maxLength: 500, placeholder: 'Ex.: 15 ddl' },
  { kind: 'DELIVERY_TERMS', label: 'Prazo de entrega', field: 'deliveryTerms', maxLength: 500, placeholder: 'Ex.: 5 dias úteis, após confirmação do pedido' },
  { kind: 'BANK_DETAILS', label: 'Dados bancários', field: 'bankDetails', maxLength: 500, placeholder: 'Ex.: Banco Bradesco, Ag.: 1965-8, C/C: 1355-2' },
]

export function quoteTermKindInfo(kind: QuoteTermKind): QuoteTermKindInfo {
  return QUOTE_TERM_KINDS.find((k) => k.kind === kind)!
}

export function optionsOfKind(options: QuoteTermOptionKeyValue[], kind: QuoteTermKind): QuoteTermOptionKeyValue[] {
  return options.filter((o) => o.kind === kind)
}

/**
 * Condições do orçamento NOVO: a opção padrão de cada tipo. Tipo sem padrão fica vazio (nulo), como
 * antes das configurações existirem.
 */
export function defaultConditions(options: QuoteTermOptionKeyValue[]): SupplyConditions {
  const conditions: SupplyConditions = { proposalValidity: null, deliveryTerms: null, paymentTerms: null, bankDetails: null }
  for (const info of QUOTE_TERM_KINDS) {
    const option = options.find((o) => o.kind === info.kind && o.defaultOption)
    if (option) conditions[info.field] = option.value
  }
  return conditions
}
