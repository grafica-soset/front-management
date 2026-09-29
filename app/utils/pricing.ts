/**
 * PREÇO DE VENDA DO PRODUTO (atividade 037).
 *
 * O preço sai do custo por DIVISÃO:
 *
 *     preço = custo / (100% − (comissão de vendas + impostos + markup))
 *
 * Custo R$ 100 com 10% de comissão + 10% de impostos + 35% de markup = 55% → sobram 45% →
 * 100 / 0,45 = R$ 222,22. Dos R$ 222,22, 10% é a comissão, 10% os impostos, 35% o markup, e o que
 * sobra é exatamente o custo. A mesma conta roda no servidor ao salvar; aqui ela serve para o
 * usuário ver o preço enquanto mexe nos percentuais.
 */
import type { PricingTerms, ProductTaxes, TaxRate, TaxRateKey } from '@/types/ProductTaxes'

/** Uma alíquota do formulário: rótulo, nome na Webmania e se nasce compondo o preço. */
export interface TaxRateField {
  key: TaxRateKey
  label: string
  /** Nome do campo na API da Webmania, quando existe. */
  webmania: string | null
  hint: string
  /**
   * Marcação inicial de "compõe o preço". É só o ponto de partida: quem decide é o contador da
   * gráfica. O IPI é por fora e INSS/IR/CSLL/CP costumam ser retenções — nascem desmarcados.
   */
  composesByDefault: boolean
}

export const TAX_RATE_FIELDS: TaxRateField[] = [
  { key: 'iss', label: 'ISS', webmania: 'iss', hint: 'Alíquota do ISS. Não é enviada no Padrão Nacional.', composesByDefault: true },
  { key: 'issSimplesNacional', label: 'ISSQN Simples Nacional', webmania: 'iss_simples_nacional', hint: 'Simples Nacional / isenção parcial — só provedor CONAM.', composesByDefault: true },
  { key: 'pis', label: 'PIS', webmania: 'pis', hint: '', composesByDefault: true },
  { key: 'cofins', label: 'COFINS', webmania: 'cofins', hint: '', composesByDefault: true },
  { key: 'inss', label: 'INSS', webmania: 'inss', hint: 'Em geral retido pelo tomador.', composesByDefault: false },
  { key: 'ir', label: 'IR', webmania: 'ir', hint: 'Em geral retido pelo tomador.', composesByDefault: false },
  { key: 'csll', label: 'CSLL', webmania: 'csll', hint: 'Em geral retido pelo tomador.', composesByDefault: false },
  { key: 'cp', label: 'CP (Contribuição Patronal)', webmania: 'cp', hint: 'Só no Padrão Nacional.', composesByDefault: false },
  { key: 'ipi', label: 'IPI', webmania: null, hint: 'Cobrado por fora do preço.', composesByDefault: false },
  { key: 'icms', label: 'ICMS', webmania: null, hint: '', composesByDefault: true },
  { key: 'ibsState', label: 'IBS estadual', webmania: 'ibs_cbs', hint: 'Reforma tributária.', composesByDefault: true },
  { key: 'ibsMunicipal', label: 'IBS municipal', webmania: 'ibs_cbs', hint: 'Reforma tributária.', composesByDefault: true },
  { key: 'cbs', label: 'CBS', webmania: 'ibs_cbs', hint: 'Reforma tributária.', composesByDefault: true },
]

/** CST do PIS/COFINS aceitos pela Webmania (Padrão Nacional). */
export const CST_PIS_COFINS_OPTIONS: { code: string; label: string }[] = [
  { code: '00', label: 'Nenhum' },
  { code: '01', label: 'Operação Tributável com Alíquota Básica' },
  { code: '02', label: 'Operação Tributável com Alíquota Diferenciada' },
  { code: '03', label: 'Operação Tributável com Alíquota por Unidade de Medida de Produto' },
  { code: '04', label: 'Operação Tributável monofásica - Revenda a Alíquota Zero' },
  { code: '05', label: 'Operação Tributável por Substituição Tributária' },
  { code: '06', label: 'Operação Tributável a Alíquota Zero' },
  { code: '07', label: 'Operação Isenta da Contribuição' },
  { code: '08', label: 'Operação sem Incidência da Contribuição' },
  { code: '09', label: 'Operação com Suspensão da Contribuição' },
  { code: '49', label: 'Outras Operações de Saída' },
  { code: '50', label: 'Crédito - Vinculada Exclusivamente a Receita Tributada no Mercado Interno' },
  { code: '51', label: 'Crédito - Vinculada Exclusivamente a Receita Não-Tributada no Mercado Interno' },
  { code: '52', label: 'Crédito - Vinculada Exclusivamente a Receita de Exportação' },
  { code: '53', label: 'Crédito - Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno' },
  { code: '54', label: 'Crédito - Vinculada a Receitas Tributadas no Mercado Interno e de Exportação' },
  { code: '55', label: 'Crédito - Vinculada a Receitas Não Tributadas no Mercado Interno e de Exportação' },
  { code: '56', label: 'Crédito - Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno e de Exportação' },
  { code: '60', label: 'Crédito Presumido - Aquisição Vinculada Exclusivamente a Receita Tributada no Mercado Interno' },
  { code: '61', label: 'Crédito Presumido - Aquisição Vinculada Exclusivamente a Receita Não-Tributada no Mercado Interno' },
  { code: '62', label: 'Crédito Presumido - Aquisição Vinculada Exclusivamente a Receita de Exportação' },
  { code: '63', label: 'Crédito Presumido - Aquisição Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno' },
  { code: '64', label: 'Crédito Presumido - Aquisição Vinculada a Receitas Tributadas no Mercado Interno e de Exportação' },
  { code: '65', label: 'Crédito Presumido - Aquisição Vinculada a Receitas Não-Tributadas no Mercado Interno e de Exportação' },
  { code: '66', label: 'Crédito Presumido - Aquisição Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno e de Exportação' },
  { code: '67', label: 'Crédito Presumido - Outras Operações' },
  { code: '70', label: 'Operação de Aquisição sem Direito a Crédito' },
  { code: '71', label: 'Operação de Aquisição com Isenção' },
  { code: '72', label: 'Operação de Aquisição com Suspensão' },
  { code: '73', label: 'Operação de Aquisição a Alíquota Zero' },
  { code: '74', label: 'Operação de Aquisição sem Incidência da Contribuição' },
  { code: '75', label: 'Operação de Aquisição por Substituição Tributária' },
  { code: '98', label: 'Outras Operações de Entrada' },
  { code: '99', label: 'Outras Operações' },
]

/** CSOSN do Simples Nacional. */
export const CSOSN_OPTIONS: { code: string; label: string }[] = [
  { code: '101', label: 'Tributada com permissão de crédito' },
  { code: '102', label: 'Tributada sem permissão de crédito' },
  { code: '103', label: 'Isenção do ICMS para faixa de receita bruta' },
  { code: '201', label: 'Com permissão de crédito e cobrança do ICMS por ST' },
  { code: '202', label: 'Sem permissão de crédito e com cobrança do ICMS por ST' },
  { code: '203', label: 'Isenção para faixa de receita bruta e cobrança por ST' },
  { code: '300', label: 'Imune' },
  { code: '400', label: 'Não tributada pelo Simples Nacional' },
  { code: '500', label: 'ICMS cobrado anteriormente por ST ou antecipação' },
  { code: '900', label: 'Outros' },
]

/** Impostos zerados, com a marcação inicial de "compõe o preço" de cada alíquota. */
export function emptyTaxes(): ProductTaxes {
  const rates = Object.fromEntries(
    TAX_RATE_FIELDS.map((f) => [f.key, { percent: 0, composesPrice: f.composesByDefault }]),
  ) as Record<TaxRateKey, TaxRate>
  return {
    ...rates,
    webmaniaTaxClass: null,
    baseReductionPercent: 0,
    municipalBenefitId: null,
    cstPisCofins: null,
    ncm: null,
    csosn: null,
  }
}

export function emptyPricing(): PricingTerms {
  return { deliveryCommissionPercent: 0, receiptCommissionPercent: 0, markupPercent: 0 }
}

/**
 * Completa impostos vindos de fora (API, rascunho antigo) com o que faltar. Um orçamento salvo antes
 * de uma alíquota existir não pode derrubar a tela.
 */
export function normalizeTaxes(taxes: Partial<ProductTaxes> | null | undefined): ProductTaxes {
  const base = emptyTaxes()
  if (!taxes) return base
  const merged = { ...base, ...taxes } as ProductTaxes
  for (const f of TAX_RATE_FIELDS) {
    const rate = taxes[f.key]
    merged[f.key] = rate
      ? { percent: Number(rate.percent) || 0, composesPrice: !!rate.composesPrice }
      : { percent: 0, composesPrice: false }
  }
  merged.baseReductionPercent = Number(merged.baseReductionPercent) || 0
  return merged
}

export function normalizePricing(pricing: Partial<PricingTerms> | null | undefined): PricingTerms {
  return {
    deliveryCommissionPercent: Number(pricing?.deliveryCommissionPercent) || 0,
    receiptCommissionPercent: Number(pricing?.receiptCommissionPercent) || 0,
    markupPercent: Number(pricing?.markupPercent) || 0,
  }
}

/** Arredonda na casa dos centavos (meio para cima), como o servidor. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Soma das alíquotas marcadas como "compõe o preço". */
export function taxPricePercent(taxes: ProductTaxes): number {
  return TAX_RATE_FIELDS.reduce(
    (sum, f) => sum + (taxes[f.key]?.composesPrice ? Number(taxes[f.key].percent) || 0 : 0),
    0,
  )
}

/** Percentual de comissão de vendas: entrega + recebimento. */
export function salesCommissionPercent(pricing: PricingTerms): number {
  return (Number(pricing.deliveryCommissionPercent) || 0) + (Number(pricing.receiptCommissionPercent) || 0)
}

export interface PriceBreakdown {
  cost: number
  commissionPercent: number
  taxPercent: number
  markupPercent: number
  /** Soma dos três — o que sai do preço antes de sobrar o custo. */
  totalPercent: number
  /** Nulo quando a soma chega a 100%: não existe preço que pague tudo isso. */
  price: number | null
  commissionAmount: number
  taxAmount: number
  markupAmount: number
}

export function priceFromCost(cost: number, pricing: PricingTerms, taxes: ProductTaxes): PriceBreakdown {
  const commissionPercent = salesCommissionPercent(pricing)
  const taxPercent = taxPricePercent(taxes)
  const markupPercent = Number(pricing.markupPercent) || 0
  const totalPercent = commissionPercent + taxPercent + markupPercent
  const price = totalPercent < 100 ? round2(cost / ((100 - totalPercent) / 100)) : null
  const part = (percent: number) => (price == null ? 0 : round2((price * percent) / 100))
  return {
    cost: round2(cost),
    commissionPercent,
    taxPercent,
    markupPercent,
    totalPercent,
    price,
    commissionAmount: part(commissionPercent),
    taxAmount: part(taxPercent),
    markupAmount: part(markupPercent),
  }
}

/** Comissão de agência: um percentual SOBRE o total dos produtos. */
export function agencyCommissionAmount(productsTotal: number, percent: number): number {
  return round2((productsTotal * (Number(percent) || 0)) / 100)
}

/** O que impede os impostos/percentuais de serem salvos — as mesmas regras do servidor. */
export function pricingIssues(pricing: PricingTerms, taxes: ProductTaxes): string[] {
  const issues: string[] = []
  const outOfRange = (v: number) => !(Number(v) >= 0 && Number(v) <= 100)
  for (const f of TAX_RATE_FIELDS) {
    if (outOfRange(taxes[f.key]?.percent ?? 0)) issues.push(`${f.label}: a alíquota vai de 0 a 100%`)
  }
  if (outOfRange(taxes.baseReductionPercent)) issues.push('Redução da base: vai de 0 a 100%')
  if ((Number(taxes.baseReductionPercent) || 0) > 0 && !taxes.municipalBenefitId?.trim()) {
    issues.push('Com redução da base de cálculo, informe o identificador do benefício municipal')
  }
  const ncm = taxes.ncm?.replace(/\D/g, '') ?? ''
  if (taxes.ncm?.trim() && ncm.length !== 8) issues.push('O NCM tem 8 dígitos')
  if (outOfRange(pricing.deliveryCommissionPercent)) issues.push('Comissão na entrega: vai de 0 a 100%')
  if (outOfRange(pricing.receiptCommissionPercent)) issues.push('Comissão no recebimento: vai de 0 a 100%')
  if (outOfRange(pricing.markupPercent)) issues.push('Markup: vai de 0 a 100%')
  const total = salesCommissionPercent(pricing) + taxPricePercent(taxes) + (Number(pricing.markupPercent) || 0)
  if (total >= 100) {
    issues.push(`Comissão + impostos + markup somam ${formatPercent(total)} — precisam ficar abaixo de 100%`)
  }
  return issues
}

/** "12,5%". */
export function formatPercent(value: number): string {
  return `${(Number(value) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%`
}

export const QUOTE_STATUS_LABELS = {
  PENDING_APPROVAL: 'Pendente de aprovação',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
} as const
