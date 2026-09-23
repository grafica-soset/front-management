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

  // ---- Vias/lâminas iguais: a pergunta que decide quantas chapas o trabalho paga ----

  it('a pergunta nasce sem resposta — nenhum dos dois lados pode ser assumido', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    store.setStructure('BLOCK')

    expect(store.draft!.identicalArtwork).toBeNull()
    expect(store.toPayload(store.draft!).identicalArtwork).toBe(false)
    expect(store.toPayload(store.draft!).distinctArtworkCount).toBeNull()
  })

  it('responder NÃO parte do pior caso: todas diferentes', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    store.setStructure('BLOCK')
    store.draft!.vias = 4
    store.syncSheets()

    store.setIdenticalArtwork(false)

    expect(store.draft!.distinctArtworks).toBe(4)
    store.setDistinctArtworks(2)
    expect(store.toPayload(store.draft!).distinctArtworkCount).toBe(2)
  })

  it('vias iguais mandam só a resposta — o motor recusa os dois campos juntos', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    store.setStructure('BLOCK')

    store.setIdenticalArtwork(true)

    const payload = store.toPayload(store.draft!)
    expect(payload.identicalArtwork).toBe(true)
    expect(payload.distinctArtworkCount).toBeNull()
  })

  it('diminuir as vias não deixa para trás mais desenhos do que folhas', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    store.setStructure('BLOCK')
    store.draft!.vias = 4
    store.syncSheets()
    store.setIdenticalArtwork(false)

    store.draft!.vias = 2
    store.syncSheets()

    expect(store.draft!.distinctArtworks).toBe(2)
  })

  it('via única não tem o que comparar: a resposta é esquecida', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    store.setStructure('BLOCK')
    store.setIdenticalArtwork(true)

    store.draft!.vias = 1
    store.syncSheets()

    expect(store.draft!.identicalArtwork).toBeNull()
  })

  // ---- Numeração (atividade 036): a pergunta que decide quais impressoras podem fazer ----

  it('a numeração nasce sem resposta, como a das vias iguais', () => {
    const store = useQuoteDraftStore()
    store.startNew()

    // Assumir "não" escolheria uma impressora que talvez nem numere.
    expect(store.draft!.hasNumbering).toBeNull()
    expect(store.toPayload(store.draft!).numbering).toBeNull()
  })

  it('o NÃO não manda numeração nenhuma — nenhuma impressora é descartada por isso', () => {
    const store = useQuoteDraftStore()
    store.startNew()

    store.setHasNumbering(false)

    expect(store.toPayload(store.draft!).numbering).toBeNull()
  })

  it('o SIM manda numeradores, número inicial e dígitos', () => {
    const store = useQuoteDraftStore()
    store.startNew()

    store.setHasNumbering(true)
    store.setNumberingUnits(2)
    store.setNumberingStart(1001)
    store.setNumberingDigits(6)

    expect(store.toPayload(store.draft!).numbering).toEqual({
      units: 2,
      startNumber: 1001,
      digits: 6,
    })
  })

  it('a numeração parte de um numerador, a partir de 1, com 6 dígitos', () => {
    const store = useQuoteDraftStore()
    store.startNew()

    store.setHasNumbering(true)

    expect(store.toPayload(store.draft!).numbering).toEqual({
      units: 1,
      startNumber: 1,
      digits: 6,
    })
  })

  it('numerador zero não existe, e os dígitos param em 12', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    store.setHasNumbering(true)

    store.setNumberingUnits(0)
    store.setNumberingDigits(99)

    expect(store.draft!.numberingUnits).toBe(1)
    expect(store.draft!.numberingDigits).toBe(12)
  })

  it('trocar a estrutura não apaga a numeração — o talão vira lâmina e continua numerado', () => {
    const store = useQuoteDraftStore()
    store.startNew()
    store.setHasNumbering(true)
    store.setNumberingUnits(4)

    store.setStructure('BLOCK')

    expect(store.draft!.hasNumbering).toBe(true)
    expect(store.draft!.numberingUnits).toBe(4)
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
