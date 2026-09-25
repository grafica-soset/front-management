import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductCostingResponse } from '@/types/Quote'
import type { ProductTemplate } from '@/types/ProductTemplate'
import type { SavedQuote } from '@/types/SavedQuote'
import { emptyPricing, emptyTaxes } from '@/utils/pricing'

// A atividade 27 é de impressão: é o catálogo que diz, e é por ele que a etapa nasce com a
// configuração por folha.
vi.mock('@/composables/useQuoteCatalogs', () => ({
  useQuoteCatalogs: () => ({
    findActivity: (id: number) => ({ id, value: `Atividade ${id}`, type: id === 27 ? 'PRINTING' : 'MANUAL' }),
  }),
}))

const { templateRequestFromProduct, useQuoteDraftStore } = await import('@/stores/quoteDraft')

/**
 * Modelos de produto e orçamento salvo (atividade 037): o que vai para o catálogo, o que volta
 * dele, e a conta do preço no orçamento.
 */
describe('modelo de produto no rascunho', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const template: ProductTemplate = {
    id: 17,
    customerId: 42,
    productModelId: 9,
    productModelName: 'Talões',
    typeName: 'Pedido 2 vias',
    label: 'Talões > Pedido 2 vias',
    structure: 'BLOCK',
    blades: 1,
    vias: 2,
    hasCovers: true,
    coverCount: 1,
    identicalArtwork: false,
    distinctArtworks: 2,
    activityIds: [31, 27, 35, 31],
    taxes: { ...emptyTaxes(), iss: { percent: 5, composesPrice: true } },
    pricing: { deliveryCommissionPercent: 2, receiptCommissionPercent: 3, markupPercent: 30 },
    totalPricePercent: 40,
    active: true,
  }

  it('abre o assistente com a estrutura, as etapas na ordem e os impostos do modelo', () => {
    const store = useQuoteDraftStore()
    store.startFromTemplate(template)
    const draft = store.draft!

    expect(draft.productTemplateId).toBe(17)
    expect(draft.productModelName).toBe('Talões')
    expect(draft.typeName).toBe('Pedido 2 vias')
    expect(draft.sheets.map((s) => `${s.kind}${s.index}`)).toEqual(['VIA1', 'VIA2', 'COVER1'])
    expect(draft.identicalArtwork).toBe(false)
    expect(draft.distinctArtworks).toBe(2)
    expect(draft.steps.map((s) => s.activityId)).toEqual([31, 27, 35, 31])
    // A impressão nasce com a configuração de cada folha — as cores são do pedido.
    expect(Object.keys(draft.steps[1]!.printing!.bySheet)).toHaveLength(3)
    expect(draft.pricing.markupPercent).toBe(30)
    // O que é do pedido fica vazio.
    expect(draft.name).toBe('')
    expect(draft.quantity).toBeNull()
  })

  it('o que vai para o catálogo é só o que se repete entre pedidos', () => {
    const store = useQuoteDraftStore()
    store.startFromTemplate(template)
    const draft = store.draft!
    draft.name = 'Talão da Papelaria Central'
    draft.quantity = 20
    draft.sheets[0]!.paperTypeId = 3

    const request = templateRequestFromProduct(draft, 42)

    expect(request).toMatchObject({
      productModelId: 9,
      typeName: 'Pedido 2 vias',
      structure: 'BLOCK',
      vias: 2,
      hasCovers: true,
      coverCount: 1,
      identicalArtwork: false,
      distinctArtworks: 2,
      activityIds: [31, 27, 35, 31],
    })
    expect(request).not.toHaveProperty('name')
    expect(request).not.toHaveProperty('quantity')
    expect(request).not.toHaveProperty('sheets')
  })

  it('com uma lâmina só, "são iguais?" não vai para o catálogo', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    store.draft!.identicalArtwork = true
    expect(templateRequestFromProduct(store.draft!, 42).identicalArtwork).toBeNull()
  })
})

describe('orçamento com preço', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const custo = (total: number) => ({ totalCost: total } as unknown as ProductCostingResponse)

  it('preço por produto, total e comissão de agência sobre o total', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    store.draft!.pricing = { deliveryCommissionPercent: 2, receiptCommissionPercent: 3, markupPercent: 30 }
    store.draft!.taxes = { ...emptyTaxes(), iss: { percent: 5, composesPrice: true } }
    store.draftCost = custo(520)
    store.commit()
    store.agencyCommissionPercent = 10

    // 520 / (1 − 40%) = 866,67; agência 10% = 86,67.
    expect(store.productsTotal).toBe(866.67)
    expect(store.agencyCommission).toBe(86.67)
    expect(store.grandTotal).toBe(953.34)
  })

  it('sem custo em algum produto o total não aparece — zero pareceria preço', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    store.commit()
    expect(store.productsTotal).toBeNull()
  })

  it('o corpo do salvar leva a configuração do motor e o rascunho, sem custo', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    store.draft!.name = 'Folder A4'
    store.draft!.typeName = '  Institucional '
    store.commit()
    store.clientId = 318
    store.notes = '  '

    const body = store.toSaveRequest()

    expect(body.clientId).toBe(318)
    expect(body.notes).toBeNull()
    expect(body.products[0]!.configuration.name).toBe('Folder A4')
    expect(body.products[0]!.editorState.name).toBe('Folder A4')
    expect(body.products[0]!.typeName).toBe('Institucional')
    expect(body.products[0]).not.toHaveProperty('totalCost')
  })

  it('reabre um orçamento salvo, inclusive um gravado antes dos impostos existirem', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    const legacy = { ...store.draft!, name: 'Bloco antigo' } as Record<string, unknown>
    delete legacy.taxes
    delete legacy.pricing
    store.discard()

    const saved = {
      id: 1204,
      number: 118,
      clientId: 318,
      status: 'APPROVED',
      agencyCommissionPercent: 10,
      notes: 'Entrega em duas remessas',
      products: [
        {
          productModelId: 8,
          productModelName: 'Blocos',
          typeName: 'Anotações',
          productTemplateId: null,
          editorState: legacy,
          taxes: { ...emptyTaxes(), iss: { percent: 5, composesPrice: true } },
          pricing: { ...emptyPricing(), markupPercent: 30 },
        },
      ],
    } as unknown as SavedQuote

    store.loadSaved(saved)

    expect(store.quoteNumber).toBe(118)
    expect(store.readOnly).toBe(true)
    expect(store.products[0]!.name).toBe('Bloco antigo')
    expect(store.products[0]!.productModelName).toBe('Blocos')
    expect(store.products[0]!.pricing.markupPercent).toBe(30)
    expect(store.products[0]!.taxes.cbs).toBeDefined()
  })
})

describe('condições de fornecimento e alteração pendente (atividade 038)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const saved = {
    id: 1204,
    number: 118,
    clientId: 318,
    status: 'PENDING_APPROVAL',
    agencyCommissionPercent: 0,
    notes: null,
    conditions: { proposalValidity: '2 semanas', deliveryTerms: null, paymentTerms: '15 d.d.', bankDetails: null },
    products: [],
  } as unknown as SavedQuote

  it('abre sem alteração pendente e acusa a primeira mexida', () => {
    const store = useQuoteDraftStore()
    store.loadSaved(saved)
    expect(store.conditions.proposalValidity).toBe('2 semanas')
    expect(store.dirty).toBe(false)

    store.conditions.deliveryTerms = '5 dias úteis'
    expect(store.dirty).toBe(true)
  })

  it('campo apagado vai como vazio, não como texto em branco', () => {
    const store = useQuoteDraftStore()
    store.loadSaved(saved)
    store.conditions.paymentTerms = '   '
    expect(store.toSaveRequest().conditions.paymentTerms).toBeNull()
  })

  it('orçamento novo com produto é alteração pendente', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    store.commit()
    expect(store.dirty).toBe(true)
  })
})

