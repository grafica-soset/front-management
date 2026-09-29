import { describe, it, expect } from 'vitest'
import {
  agencyCommissionAmount,
  emptyPricing,
  emptyTaxes,
  normalizeTaxes,
  priceFromCost,
  pricingIssues,
  taxPricePercent,
  TAX_RATE_FIELDS,
} from '@/utils/pricing'

/**
 * Preço de venda (atividade 037): custo / (100% − comissão − impostos − markup).
 * É a mesma conta do servidor — a tela mostra o preço antes de salvar.
 */
describe('Preço pelo divisor', () => {
  it('o exemplo do pedido: custo 100 com 10% + 10% + 35% vira 222,22', () => {
    const taxes = emptyTaxes()
    taxes.icms = { percent: 10, composesPrice: true }
    const result = priceFromCost(100, { deliveryCommissionPercent: 4, receiptCommissionPercent: 6, markupPercent: 35 }, taxes)
    expect(result.totalPercent).toBe(55)
    expect(result.price).toBe(222.22)
    // As parcelas saem do PREÇO, não do custo — e o que sobra é o custo.
    expect(result.commissionAmount).toBe(22.22)
    expect(result.markupAmount).toBe(77.78)
  })

  it('só as alíquotas marcadas entram', () => {
    const taxes = emptyTaxes()
    taxes.iss = { percent: 5, composesPrice: true }
    taxes.ipi = { percent: 10, composesPrice: false }
    taxes.ir = { percent: 1.5, composesPrice: false }
    expect(taxPricePercent(taxes)).toBe(5)
  })

  it('sem percentual nenhum o preço é o custo', () => {
    expect(priceFromCost(1234.567, emptyPricing(), emptyTaxes()).price).toBe(1234.57)
  })

  it('100% ou mais não tem preço, e a tela diz por quê', () => {
    const pricing = { deliveryCommissionPercent: 30, receiptCommissionPercent: 30, markupPercent: 40 }
    expect(priceFromCost(100, pricing, emptyTaxes()).price).toBeNull()
    expect(pricingIssues(pricing, emptyTaxes()).join()).toContain('abaixo de 100%')
  })

  it('a comissão de agência é aplicada sobre o total dos produtos', () => {
    expect(agencyCommissionAmount(866.67, 10)).toBe(86.67)
  })
})

describe('Impostos', () => {
  it('nascem com IPI, INSS, IR, CSLL e CP fora do preço', () => {
    const taxes = emptyTaxes()
    const outside = TAX_RATE_FIELDS.filter((f) => !taxes[f.key].composesPrice).map((f) => f.key)
    expect(outside).toEqual(['inss', 'ir', 'csll', 'cp', 'ipi'])
  })

  it('redução da base exige o benefício municipal', () => {
    const taxes = emptyTaxes()
    taxes.baseReductionPercent = 40
    expect(pricingIssues(emptyPricing(), taxes)).toContain(
      'Com redução da base de cálculo, informe o identificador do benefício municipal',
    )
  })

  it('NCM com pontos é aceito se tiver 8 dígitos', () => {
    const taxes = emptyTaxes()
    taxes.ncm = '4820.10.00'
    expect(pricingIssues(emptyPricing(), taxes)).toEqual([])
    taxes.ncm = '4820'
    expect(pricingIssues(emptyPricing(), taxes)).toContain('O NCM tem 8 dígitos')
  })

  it('completa impostos incompletos vindos de fora', () => {
    const taxes = normalizeTaxes({ iss: { percent: 5, composesPrice: true } })
    expect(taxes.cbs).toEqual({ percent: 0, composesPrice: false })
    expect(taxes.iss.percent).toBe(5)
  })
})
