/**
 * IMPOSTOS, COMISSÕES E MARKUP DO PRODUTO (atividade 037).
 *
 * Os nomes seguem a API de NFS-e da Webmania, por onde as notas serão emitidas quando o orçamento
 * for aprovado. Cada alíquota diz também se COMPÕE O PREÇO — o IPI é cobrado por fora e
 * INSS/IR/CSLL costumam ser retenções: estão na nota, mas não no divisor do preço.
 */

/** Alíquota em % (0 a 100) e se ela entra no divisor do preço. */
export interface TaxRate {
  percent: number
  composesPrice: boolean
}

/** Chaves das alíquotas — as que têm `TaxRate`. */
export type TaxRateKey =
  | 'iss'
  | 'issSimplesNacional'
  | 'pis'
  | 'cofins'
  | 'inss'
  | 'ir'
  | 'csll'
  | 'cp'
  | 'ipi'
  | 'icms'
  | 'ibsState'
  | 'ibsMunicipal'
  | 'cbs'

export interface ProductTaxes extends Record<TaxRateKey, TaxRate> {
  /** `classe_imposto` da Webmania (ex.: REF4471023). */
  webmaniaTaxClass: string | null
  /** `reducao` — % de redução da base (Padrão Nacional). Não é alíquota. */
  baseReductionPercent: number
  /** `identificador_beneficio_municipal` — obrigatório quando há redução. */
  municipalBenefitId: string | null
  /** CST do PIS/COFINS. */
  cstPisCofins: string | null
  /** NCM — 8 dígitos. */
  ncm: string | null
  /** CSOSN do Simples Nacional. */
  csosn: string | null
}

/** Comissões do vendedor (entrega + recebimento) e markup. */
export interface PricingTerms {
  deliveryCommissionPercent: number
  receiptCommissionPercent: number
  markupPercent: number
}
