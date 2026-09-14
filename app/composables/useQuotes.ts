/**
 * Composable do ORÇAMENTO (`POST /quotes/calculate`) — atividade 034.
 *
 * O endpoint é stateless: manda-se a configuração inteira e recebe-se o custo. Como a tela
 * recalcula a cada mexida do usuário, este é o ponto único de chamada — quem consome trata o erro
 * de configuração (400), que é informação útil: diz qual cadastro não sustenta o cálculo.
 */
import type { CalculateQuoteRequest, QuoteCostingResponse } from '@/types/Quote'
import { useAuthStore } from '@/stores/auth'

export function useQuotes() {
  const api = useApi()
  const auth = useAuthStore()

  async function calculate(payload: Omit<CalculateQuoteRequest, 'customerId'>) {
    const body: CalculateQuoteRequest = {
      ...payload,
      customerId: auth.activeCompanyId ?? 0,
    }
    return await api<QuoteCostingResponse>('/quotes/calculate', { method: 'POST', body })
  }

  return { calculate }
}
