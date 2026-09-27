import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import { defaultConditions, optionsOfKind } from '@/utils/quoteTermOptions'
import type { QuoteTermOptionKeyValue } from '@/types/QuoteTermOption'
import type { SavedQuote } from '@/types/SavedQuote'

/**
 * Condições de fornecimento com as opções da empresa (atividade 038, Orçamento > Configurações).
 *
 * O orçamento NOVO já vem com a padrão de cada campo ("5 dias", "15 dias", "15 ddl"); o que o
 * usuário mudar depois é dele — voltar do assistente de produto não pode repreencher nada, e o
 * orçamento aberto nunca é sobrescrito.
 */
const options: QuoteTermOptionKeyValue[] = [
  { id: 1, kind: 'DELIVERY_TERMS', value: '5 dias', defaultOption: true },
  { id: 2, kind: 'DELIVERY_TERMS', value: '10 dias úteis', defaultOption: false },
  { id: 3, kind: 'PROPOSAL_VALIDITY', value: '15 dias', defaultOption: true },
  { id: 4, kind: 'PAYMENT_TERMS', value: '15 ddl', defaultOption: true },
  { id: 5, kind: 'BANK_DETAILS', value: 'Bradesco, Ag.: 1965-8, C/C: 1355-2', defaultOption: false },
  { id: 6, kind: 'BANK_DETAILS', value: 'Sicredi, Ag.: 0716, C/C: 38291-4', defaultOption: false },
]

describe('opções das condições de fornecimento', () => {
  it('as padrões preenchem cada campo; tipo sem padrão fica vazio', () => {
    expect(defaultConditions(options)).toEqual({
      proposalValidity: '15 dias',
      deliveryTerms: '5 dias',
      paymentTerms: '15 ddl',
      bankDetails: null,
    })
  })

  it('sem opções cadastradas, tudo vazio como antes', () => {
    expect(defaultConditions([])).toEqual({ proposalValidity: null, deliveryTerms: null, paymentTerms: null, bankDetails: null })
  })

  it('o popup de cada campo mostra só as opções do tipo', () => {
    expect(optionsOfKind(options, 'BANK_DETAILS').map((o) => o.id)).toEqual([5, 6])
  })
})

describe('orçamento novo com as condições padrão', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('aplica as padrões no orçamento novo, uma vez só', () => {
    const store = useQuoteDraftStore()
    store.clearQuote()

    store.applyConditionDefaults(options)
    expect(store.conditions.deliveryTerms).toBe('5 dias')
    expect(store.conditions.paymentTerms).toBe('15 ddl')

    // O usuário apaga/edita; ao voltar do assistente o editor monta de novo e chama outra vez.
    store.conditions.deliveryTerms = 'Entrega em 48 h — condição exclusiva'
    store.conditions.paymentTerms = null
    store.applyConditionDefaults(options)
    expect(store.conditions.deliveryTerms).toBe('Entrega em 48 h — condição exclusiva')
    expect(store.conditions.paymentTerms).toBeNull()
  })

  it('não mexe no orçamento salvo aberto', () => {
    const store = useQuoteDraftStore()
    store.clearQuote()
    store.loadSaved({
      id: 9, number: 120, status: 'PENDING_APPROVAL', clientId: 3, agencyCommissionPercent: 0, notes: null,
      conditions: { proposalValidity: '30 dias', deliveryTerms: null, paymentTerms: 'À vista', bankDetails: null },
      products: [],
    } as unknown as SavedQuote)

    store.applyConditionDefaults(options)

    expect(store.conditions).toEqual({ proposalValidity: '30 dias', deliveryTerms: null, paymentTerms: 'À vista', bankDetails: null })
  })
})
