import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClientPageItem } from '@/types/Client'
import {
  createClientListSearch,
  type ClientListSearchState,
} from '@/utils/clientListSearch'

const marina: ClientPageItem = {
  id: 7,
  name: 'Marina Alves',
  document: '52998224725',
  primaryContact: null,
  primaryCity: 'Campinas',
  active: true,
}

const papelaria: ClientPageItem = {
  id: 9,
  name: 'Papelaria Horizonte',
  document: '04252011000110',
  primaryContact: 'Carla Mendes',
  primaryCity: 'Campinas',
  active: true,
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('busca automática de clientes', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('não consulta a API antes do terceiro caractere', async () => {
    const search = vi.fn<(term: string) => Promise<ClientPageItem[]>>()
    let state: ClientListSearchState = { results: [], loading: false, error: null }
    const controller = createClientListSearch({
      search,
      onStateChange: (next) => { state = next },
    })

    controller.schedule('ma')
    await vi.advanceTimersByTimeAsync(500)

    expect(search).not.toHaveBeenCalled()
    expect(state).toEqual({ results: [], loading: false, error: null })
  })

  it('aguarda 300 ms e consulta somente o último termo digitado', async () => {
    const search = vi.fn<(term: string) => Promise<ClientPageItem[]>>()
      .mockResolvedValue([marina])
    let state: ClientListSearchState = { results: [], loading: false, error: null }
    const controller = createClientListSearch({
      search,
      onStateChange: (next) => { state = next },
    })

    controller.schedule('mar')
    await vi.advanceTimersByTimeAsync(200)
    controller.schedule('mari')
    await vi.advanceTimersByTimeAsync(299)
    expect(search).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(search).toHaveBeenCalledOnce()
    expect(search).toHaveBeenCalledWith('mari')
    expect(state.results).toEqual([marina])
  })

  it('ignora uma resposta antiga que termina depois da busca mais recente', async () => {
    const first = deferred<ClientPageItem[]>()
    const second = deferred<ClientPageItem[]>()
    const search = vi.fn<(term: string) => Promise<ClientPageItem[]>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    let state: ClientListSearchState = { results: [], loading: false, error: null }
    const controller = createClientListSearch({
      search,
      onStateChange: (next) => { state = next },
    })

    controller.schedule('mar')
    await vi.advanceTimersByTimeAsync(300)
    controller.schedule('pape')
    await vi.advanceTimersByTimeAsync(300)

    second.resolve([papelaria])
    await Promise.resolve()
    expect(state.results).toEqual([papelaria])

    first.resolve([marina])
    await Promise.resolve()
    expect(state.results).toEqual([papelaria])
  })

  it('invalida a requisição atual assim que um novo termo é digitado', async () => {
    const first = deferred<ClientPageItem[]>()
    let pageVersion = 0
    let visibleResults: ClientPageItem[] = []
    const search = vi.fn(async () => {
      const version = ++pageVersion
      const results = await first.promise
      if (version === pageVersion) visibleResults = results
      return results
    })
    const controller = createClientListSearch({
      search,
      invalidate: () => { pageVersion += 1 },
      onStateChange: () => undefined,
    })

    controller.schedule('mar')
    await vi.advanceTimersByTimeAsync(300)
    controller.schedule('pape')
    first.resolve([marina])
    await Promise.resolve()

    expect(visibleResults).toEqual([])
  })

  it('restaura a listagem completa ao voltar para menos de três caracteres', async () => {
    const search = vi.fn<(term: string) => Promise<ClientPageItem[]>>()
      .mockResolvedValue([marina])
    const controller = createClientListSearch({
      search,
      onStateChange: () => undefined,
    })

    controller.schedule('mar')
    await vi.advanceTimersByTimeAsync(300)
    controller.schedule('ma')
    await vi.advanceTimersByTimeAsync(300)

    expect(search).toHaveBeenNthCalledWith(1, 'mar')
    expect(search).toHaveBeenNthCalledWith(2, '')
  })

  it('mantém o filtro ativo após uma recarga externa da listagem', async () => {
    const search = vi.fn<(term: string) => Promise<ClientPageItem[]>>()
      .mockResolvedValue([marina])
    const controller = createClientListSearch({
      search,
      onStateChange: () => undefined,
    })

    controller.cancel('marina')
    controller.schedule('ma')
    await Promise.resolve()

    expect(search).toHaveBeenCalledOnce()
    expect(search).toHaveBeenCalledWith('')
  })
})
