/**
 * Composable do catálogo global de papéis (/papers).
 *
 * Nota: o header `X-Customer-Id` é injetado automaticamente pelo `useApi`
 * quando há empresa ativa — por isso as dimensões já vêm na unidade certa.
 */
import type { CreatePaperRequest, Paper, UpdatePaperRequest } from '@/types/Paper'
import type { CreatePaperResponse } from '@/types/CustomerPaper'
import { usePapersStore } from '@/stores/papers'
import { useAuthStore } from '@/stores/auth'

interface ListPapersOptions {
  paperTypeId?: number
}

export function usePapers() {
  const api = useApi()
  const store = usePapersStore()
  const auth = useAuthStore()

  async function listPapers(options: ListPapersOptions = {}): Promise<Paper[]> {
    const query: Record<string, string | number> = {}
    if (options.paperTypeId) query.paperTypeId = options.paperTypeId
    const papers = await api<Paper[]>('/papers', { query })
    store.setPapers(papers)
    return papers
  }

  /**
   * POST /papers — quando o caller é CUSTOMER (sem ADMIN), `customerId` é
   * preenchido automaticamente a partir da empresa ativa. Devolve também o
   * `customerPaper` resultante do auto-link.
   */
  async function createPaper(payload: CreatePaperRequest): Promise<CreatePaperResponse> {
    const body: CreatePaperRequest = { ...payload }
    if (auth.hasCustomer && !auth.isAdmin && !body.customerId && auth.activeCompanyId) {
      body.customerId = auth.activeCompanyId
    }
    const response = await api<CreatePaperResponse>('/papers', { method: 'POST', body })
    store.upsertPaper(response.paper)
    if (response.customerPaper) store.upsertCustomerPaper(response.customerPaper)
    return response
  }

  async function updatePaper(id: number, payload: UpdatePaperRequest): Promise<Paper> {
    const body: UpdatePaperRequest = { ...payload }
    if (auth.hasCustomer && !auth.isAdmin && !body.customerId && auth.activeCompanyId) {
      body.customerId = auth.activeCompanyId
    }
    const updated = await api<Paper>(`/papers/${id}`, { method: 'PUT', body })
    store.upsertPaper(updated)
    return updated
  }

  async function deletePaper(id: number): Promise<void> {
    await api(`/papers/${id}`, { method: 'DELETE' })
    store.removePaper(id)
  }

  return { listPapers, createPaper, updatePaper, deletePaper }
}
