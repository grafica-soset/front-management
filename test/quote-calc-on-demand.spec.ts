import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseProductSegment, parseQuoteSegment, productPath, quotePath } from '@/utils/quoteRoutes'

/**
 * Atividade 047: o cálculo é só no botão, e o orçamento e o produto ficam na URL.
 */
const calculate = vi.fn()
vi.mock('@/composables/useQuotes', () => ({ useQuotes: () => ({ calculate }) }))
vi.mock('@/composables/useQuoteCatalogs', () => ({ useQuoteCatalogs: () => ({}) }))

const { useQuoteDraftStore } = await import('@/stores/quoteDraft')

describe('cálculo sob demanda', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    calculate.mockReset()
  })

  it('produto novo nasce sem cálculo — desatualizado até clicar em Calcular', async () => {
    const store = useQuoteDraftStore()
    store.startNew()
    expect(store.draftStale).toBe(true)

    calculate.mockResolvedValueOnce({ products: [{ name: 'Lâmina', totalCost: 90 }] })
    await store.calculateDraft()

    expect(store.draftStale).toBe(false)
    expect(calculate).toHaveBeenCalledTimes(1)
  })

  it('mexer depois de calcular deixa desatualizado sem chamar o motor', async () => {
    const store = useQuoteDraftStore()
    store.startNew()
    calculate.mockResolvedValueOnce({ products: [{ name: 'Lâmina', totalCost: 90 }] })
    await store.calculateDraft()

    store.draft!.quantity = 5000

    expect(store.draftStale).toBe(true)
    expect(calculate).toHaveBeenCalledTimes(1)
    // O preço anterior continua à vista, marcado como velho.
    expect(store.draftCost?.totalCost).toBe(90)
  })

  it('mexer durante o cálculo: a resposta vale para a configuração enviada, e fica desatualizada', async () => {
    const store = useQuoteDraftStore()
    store.startNew()
    let resolve!: (v: unknown) => void
    calculate.mockReturnValueOnce(new Promise((r) => (resolve = r)))

    const running = store.calculateDraft()
    store.draft!.quantity = 700
    resolve({ products: [{ name: 'Lâmina', totalCost: 90 }] })
    await running

    expect(store.draftCost?.totalCost).toBe(90)
    expect(store.draftStale).toBe(true)
  })
})

describe('rotas do orçamento', () => {
  it('orçamento salvo e novo', () => {
    expect(quotePath(6)).toBe('/orcamentos/6')
    expect(quotePath(null)).toBe('/orcamentos/novo')
    expect(productPath(6, 1)).toBe('/orcamentos/6/produto/1')
    expect(productPath(null, 'novo')).toBe('/orcamentos/novo/produto/novo')
  })

  it('lê os segmentos da URL', () => {
    expect(parseQuoteSegment('6')).toBe(6)
    expect(parseQuoteSegment('novo')).toBeNull()
    expect(parseProductSegment('2')).toBe(2)
    expect(parseProductSegment('0')).toBeNull()
    expect(parseProductSegment('novo')).toBeNull()
  })
})
