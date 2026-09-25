/**
 * Estado da busca de cliente do orçamento (atividade 037): o termo digitado vira uma consulta com
 * debounce, e só a resposta da ÚLTIMA consulta vale — digitar rápido dispara várias, e uma lenta
 * que chegasse depois apagaria o resultado certo.
 */
import { ref } from 'vue'
import type { ClientSearchItem } from '@/types/Client'
import { useClients } from '@/composables/useClients'
import { extractApiError } from '@/utils/apiError'

export function useClientSearch(delay = 250) {
  const clients = useClients()
  const results = ref<ClientSearchItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null
  let sequence = 0

  const run = async (term: string) => {
    const mine = ++sequence
    loading.value = true
    error.value = null
    try {
      const found = await clients.search(term)
      if (mine === sequence) results.value = found
    } catch (err) {
      if (mine === sequence) error.value = extractApiError(err, 'Não foi possível buscar os clientes.')
    } finally {
      if (mine === sequence) loading.value = false
    }
  }

  const search = (term: string) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => run(term), delay)
  }

  return { results, loading, error, search, searchNow: run }
}
