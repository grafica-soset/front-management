import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClientSearchItem } from '@/types/Client'

/**
 * Busca de cliente do orçamento (atividade 037): com debounce, e só a resposta da ÚLTIMA busca
 * vale — uma consulta lenta que chegasse depois apagaria o resultado do termo atual.
 */
const pending = new Map<string, (items: ClientSearchItem[]) => void>()
const search = vi.fn((term: string) => new Promise<ClientSearchItem[]>((resolve) => pending.set(term, resolve)))

vi.mock('@/composables/useClients', () => ({ useClients: () => ({ search }) }))

const { useClientSearch } = await import('@/composables/useClientSearch')

const client = (id: number, name: string): ClientSearchItem => ({
  id,
  personType: 'LEGAL',
  name,
  corporateName: null,
  email: `compras${id}@exemplo.com.br`,
  document: '11222333000181',
})

describe('busca de cliente', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    search.mockClear()
    pending.clear()
  })
  afterEach(() => vi.useRealTimers())

  it('espera o usuário parar de digitar', () => {
    const s = useClientSearch(250)
    s.search('p')
    s.search('pa')
    s.search('pap')
    vi.advanceTimersByTime(250)
    expect(search).toHaveBeenCalledTimes(1)
    expect(search).toHaveBeenCalledWith('pap')
  })

  it('a resposta atrasada de um termo antigo não apaga a do termo atual', async () => {
    const s = useClientSearch(0)
    void s.searchNow('pap')
    void s.searchNow('papelaria central')

    pending.get('papelaria central')!([client(1, 'Papelaria Central')])
    await Promise.resolve()
    pending.get('pap')!([client(2, 'Papelaria Antiga'), client(3, 'Papelão & Cia')])
    await Promise.resolve()
    await Promise.resolve()

    expect(s.results.value.map((c) => c.name)).toEqual(['Papelaria Central'])
    expect(s.loading.value).toBe(false)
  })
})
