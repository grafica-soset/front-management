/**
 * OPÇÃO DE CONDIÇÃO DE FORNECIMENTO (atividade 038, Orçamento > Configurações).
 *
 * Cada empresa cadastra as opções de validade, prazo, pagamento e dados bancários; no máximo uma
 * por tipo é a PADRÃO, que entra no orçamento novo. O orçamento copia o texto e continua editável.
 */
export type QuoteTermKind = 'PROPOSAL_VALIDITY' | 'DELIVERY_TERMS' | 'PAYMENT_TERMS' | 'BANK_DETAILS'

export interface QuoteTermOption {
  id: number
  customerId: number
  kind: QuoteTermKind
  text: string
  defaultOption: boolean
}

/** Item KeyValue da listagem: `value` é o texto. */
export interface QuoteTermOptionKeyValue {
  id: number
  value: string
  kind: QuoteTermKind
  defaultOption: boolean
}

export interface CreateQuoteTermOptionRequest {
  customerId: number
  kind: QuoteTermKind
  text: string
  defaultOption: boolean
}

/** O tipo não muda na edição. */
export interface UpdateQuoteTermOptionRequest {
  customerId: number
  text: string
  defaultOption: boolean
}

/** O que o formulário da opção emite: o tipo vem de quem abriu o form. */
export interface QuoteTermOptionFormValue {
  text: string
  defaultOption: boolean
}
