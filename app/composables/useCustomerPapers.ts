/**
 * Composable dos papéis vinculados a uma empresa (/customers/{id}/papers).
 *
 * - `listCustomerPapers` popula o cache da store com todos os vínculos
 *   (active + inactive quando `onlyActive=false`), permitindo ao Catálogo
 *   pintar os toggles e à página "Meus Papéis" filtrar localmente.
 * - `toggleCustomerPaper` faz o upsert do vínculo via PUT.
 */
import type { CustomerPaper, CustomerPaperEntry, ToggleCustomerPaperRequest } from '@/types/CustomerPaper'
import { usePapersStore } from '@/stores/papers'
import { useAuthStore } from '@/stores/auth'

interface ListCustomerPapersOptions {
  paperTypeId?: number
  /** Default = false aqui para o frontend manter mapa completo e poder togglar. */
  onlyActive?: boolean
}

export function useCustomerPapers() {
  const api = useApi()
  const store = usePapersStore()
  const auth = useAuthStore()

  function requireActiveCompany(): number {
    if (!auth.activeCompanyId) {
      throw new Error('Nenhuma empresa ativa selecionada.')
    }
    return auth.activeCompanyId
  }

  async function listCustomerPapers(
    options: ListCustomerPapersOptions = {},
  ): Promise<CustomerPaperEntry[]> {
    const customerId = requireActiveCompany()
    const query: Record<string, string | number | boolean> = {
      onlyActive: options.onlyActive ?? false,
    }
    if (options.paperTypeId) query.paperTypeId = options.paperTypeId

    const entries = await api<CustomerPaperEntry[]>(`/customers/${customerId}/papers`, { query })
    store.setCustomerPapers(entries)
    return entries
  }

  async function toggleCustomerPaper(paperId: number, active: boolean): Promise<CustomerPaper> {
    const customerId = requireActiveCompany()
    const body: ToggleCustomerPaperRequest = { active }
    const result = await api<CustomerPaper>(`/customers/${customerId}/papers/${paperId}`, {
      method: 'PUT',
      body,
    })
    store.upsertCustomerPaper(result)
    return result
  }

  return { listCustomerPapers, toggleCustomerPaper }
}
