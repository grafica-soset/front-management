/**
 * Composable do ORÇAMENTO.
 *
 * `calculate` (atividade 034) é o cálculo stateless que a tela chama a cada mexida — quem consome
 * trata o erro de configuração (400), que é informação útil: diz qual cadastro não sustenta o
 * cálculo.
 *
 * O resto (atividade 037) grava o orçamento: número, cliente, status e preço. O custo não viaja
 * daqui — o servidor recalcula ao salvar.
 */
import type { CalculateQuoteRequest, QuoteCostingResponse } from '@/types/Quote'
import type {
  QuoteStatus,
  SaveQuoteRequest,
  SavedQuote,
  SavedQuotePage,
} from '@/types/SavedQuote'
import { useAuthStore } from '@/stores/auth'

interface PageOptions {
  status?: QuoteStatus | null
  clientId?: number | null
  page?: number
  size?: number
}

export function useQuotes() {
  const api = useApi()
  const auth = useAuthStore()
  const customerId = () => auth.activeCompanyId ?? 0

  async function calculate(payload: Omit<CalculateQuoteRequest, 'customerId'>) {
    const body: CalculateQuoteRequest = { ...payload, customerId: customerId() }
    return await api<QuoteCostingResponse>('/quotes/calculate', { method: 'POST', body })
  }

  async function listPage(options: PageOptions = {}): Promise<SavedQuotePage> {
    const query: Record<string, string | number> = {
      page: options.page ?? 0,
      size: options.size ?? 20,
    }
    if (options.status) query.status = options.status
    if (options.clientId) query.clientId = options.clientId
    return await api<SavedQuotePage>('/quotes/page', { query })
  }

  async function getById(id: number): Promise<SavedQuote> {
    return await api<SavedQuote>(`/quotes/${id}`)
  }

  async function create(payload: Omit<SaveQuoteRequest, 'customerId'>): Promise<SavedQuote> {
    return await api<SavedQuote>('/quotes', { method: 'POST', body: { ...payload, customerId: customerId() } })
  }

  async function update(id: number, payload: Omit<SaveQuoteRequest, 'customerId'>): Promise<SavedQuote> {
    return await api<SavedQuote>(`/quotes/${id}`, { method: 'PUT', body: { ...payload, customerId: customerId() } })
  }

  async function changeStatus(id: number, status: QuoteStatus): Promise<SavedQuote> {
    return await api<SavedQuote>(`/quotes/${id}/status`, {
      method: 'PATCH',
      body: { customerId: customerId(), status },
    })
  }

  async function remove(id: number): Promise<void> {
    await api(`/quotes/${id}`, { method: 'DELETE' })
  }

  return { calculate, listPage, getById, create, update, changeStatus, remove }
}
