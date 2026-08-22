import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import type { ProductCostingResponse } from '@/types/Quote'

/**
 * Rascunho do orçamento: o que o assistente guarda entre uma edição e outra.
 *
 * O custo calculado é parte do estado do produto, não um detalhe de exibição: as opções de
 * impressora do passo de parâmetros saem do CÁLCULO (papel × formato × máquina), não do cadastro.
 * Reabrir um produto sem o custo deixa esse passo vazio — inclusive a máquina já escolhida, que
 * fica sem card para exibir.
 */
describe('store do rascunho de orçamento', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const custo = (total: number) => ({ name: 'Bloco', totalCost: total } as unknown as ProductCostingResponse)

  it('guarda o custo do produto ao salvar', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    const uid = store.draft!.uid
    store.draftCost = custo(120)

    store.commit()

    expect(store.costs[uid]?.totalCost).toBe(120)
    expect(store.draftCost).toBeNull()
  })

  it('devolve o custo calculado ao reabrir um produto salvo', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    const uid = store.draft!.uid
    store.draftCost = custo(120)
    store.commit()

    store.edit(uid)

    expect(store.draftCost?.totalCost).toBe(120)
  })

  it('reabrir um produto sem custo calculado não herda o custo de outro', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    const comCusto = store.draft!.uid
    store.draftCost = custo(120)
    store.commit()

    store.startNew()
    const semCusto = store.draft!.uid
    store.commit()

    store.edit(semCusto)

    expect(store.draftCost).toBeNull()
    expect(comCusto).not.toBe(semCusto)
  })

  it('remover o produto leva junto o custo guardado', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    const uid = store.draft!.uid
    store.draftCost = custo(120)
    store.commit()

    store.remove(uid)

    expect(store.costs[uid]).toBeUndefined()
  })
})
