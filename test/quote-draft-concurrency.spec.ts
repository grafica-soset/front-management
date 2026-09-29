import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Cálculo e salvar com o servidor lento (atividade 038, performance).
 *
 * Em produção o cálculo chegou a 13 s e a instância chegou a cair depois de gravar. A tela não pode
 * empilhar cálculos nem mostrar a resposta velha, e salvar de novo depois de um erro não pode criar
 * um segundo orçamento.
 */
const calculate = vi.fn()
const create = vi.fn()
const update = vi.fn()
vi.mock('@/composables/useQuotes', () => ({ useQuotes: () => ({ calculate, create, update }) }))
vi.mock('@/composables/useQuoteCatalogs', () => ({ useQuoteCatalogs: () => ({}) }))

const { useQuoteDraftStore } = await import('@/stores/quoteDraft')

/** Promessa que a gente resolve na mão — o "servidor lento". */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}
const costing = (total: number) => ({ products: [{ name: 'Bloco', totalCost: total }] })

describe('cálculo com o servidor lento', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    calculate.mockReset()
  })

  it('não empilha chamadas e fica com a resposta da configuração mais nova', async () => {
    const store = useQuoteDraftStore()
    store.startNew()
    const slow = deferred<unknown>()
    calculate.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(costing(250))

    const running = store.calculateDraft()
    // Três mexidas enquanto o primeiro cálculo roda: nenhuma chamada nova agora.
    store.draft!.quantity = 500
    await store.calculateDraft()
    store.draft!.quantity = 1000
    await store.calculateDraft()
    await store.calculateDraft()
    expect(calculate).toHaveBeenCalledTimes(1)

    // A resposta velha chega e é descartada; roda UMA nova, com a quantidade atual.
    slow.resolve(costing(100))
    await running
    expect(calculate).toHaveBeenCalledTimes(2)
    expect(calculate.mock.calls[1]![0].products[0].quantity).toBe(1000)
    expect(store.draftCost?.totalCost).toBe(250)
    expect(store.calculating).toBe(false)
  })

  it('sem mexida no meio, uma chamada só', async () => {
    const store = useQuoteDraftStore()
    store.startNew()
    calculate.mockResolvedValueOnce(costing(120))

    await store.calculateDraft()

    expect(calculate).toHaveBeenCalledTimes(1)
    expect(store.draftCost?.totalCost).toBe(120)
  })
})

describe('salvar depois de um erro', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    create.mockReset()
  })

  const saved = { id: 77, number: 12, status: 'PENDING_APPROVAL' }

  it('repete a mesma chave de tentativa, para o servidor devolver o que já gravou', async () => {
    const store = useQuoteDraftStore()
    store.clearQuote()
    store.clientId = 5
    create.mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce(saved)

    await expect(store.saveQuote()).rejects.toThrow('503')
    await store.saveQuote()

    const first = create.mock.calls[0]![0].requestId
    expect(first).toBeTruthy()
    expect(create.mock.calls[1]![0].requestId).toBe(first)
    expect(store.quoteId).toBe(77)
  })

  it('orçamento novo, chave nova', async () => {
    const store = useQuoteDraftStore()
    store.clearQuote()
    store.clientId = 5
    create.mockResolvedValue(saved)
    await store.saveQuote()
    const first = create.mock.calls[0]![0].requestId

    store.clearQuote()
    store.clientId = 5
    await store.saveQuote()

    expect(create.mock.calls[1]![0].requestId).not.toBe(first)
  })
})
