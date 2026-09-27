/**
 * Composable das opções das condições de fornecimento (/quote-term-options) — validade, prazo,
 * pagamento e dados bancários (atividade 038, Orçamento > Configurações). GET/DELETE usam
 * X-Customer-Id; POST/PUT preenchem customerId quando ausente.
 */
import type {
  CreateQuoteTermOptionRequest,
  QuoteTermKind,
  QuoteTermOption,
  QuoteTermOptionKeyValue,
  UpdateQuoteTermOptionRequest,
} from '@/types/QuoteTermOption'
import { useAuthStore } from '@/stores/auth'

export function useQuoteTermOptions() {
  const api = useApi()
  const auth = useAuthStore()

  function withCustomer<T extends { customerId: number }>(payload: T): T {
    if (!payload.customerId && auth.activeCompanyId) {
      return { ...payload, customerId: auth.activeCompanyId }
    }
    return payload
  }

  /** Sem `kind`, todas — é o que o orçamento carrega de uma vez. */
  async function listKeyValues(kind?: QuoteTermKind): Promise<QuoteTermOptionKeyValue[]> {
    return await api<QuoteTermOptionKeyValue[]>('/quote-term-options', { query: kind ? { kind } : {} })
  }

  async function getById(id: number): Promise<QuoteTermOption> {
    return await api<QuoteTermOption>(`/quote-term-options/${id}`)
  }

  async function create(payload: CreateQuoteTermOptionRequest): Promise<QuoteTermOption> {
    return await api<QuoteTermOption>('/quote-term-options', { method: 'POST', body: withCustomer(payload) })
  }

  async function update(id: number, payload: UpdateQuoteTermOptionRequest): Promise<QuoteTermOption> {
    return await api<QuoteTermOption>(`/quote-term-options/${id}`, { method: 'PUT', body: withCustomer(payload) })
  }

  async function remove(id: number): Promise<void> {
    await api(`/quote-term-options/${id}`, { method: 'DELETE' })
  }

  return { listKeyValues, getById, create, update, remove }
}
