/**
 * Wrapper de $fetch já configurado com baseURL e Authorization automático
 * (quando há JWT na store).
 *
 * Uso típico:
 *   const api = useApi()
 *   const res = await api<MyType>('/customers', { method: 'POST', body })
 */
import { useAuthStore } from '@/stores/auth'

export function useApi() {
  const auth = useAuthStore()

  return $fetch.create({
    // Sempre via /api: o Nitro (routeRules em nuxt.config) faz o proxy reverso
    // para NUXT_API_BASE_URL. Mantém o navegador na mesma origem e evita CORS.
    baseURL: '/api',

    onRequest({ options }) {
      const headers = new Headers(options.headers as HeadersInit | undefined)
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
      if (auth.token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${auth.token}`)
      }
      // Define o tenant ativo para a camada OUT (ex.: /papers usa este header
      // para resolver a unidade de medida nas dimensões). Apenas quando há
      // empresa ativa selecionada — o chamador pode sobrescrever explicitamente.
      if (auth.activeCompanyId && !headers.has('X-Customer-Id')) {
        headers.set('X-Customer-Id', String(auth.activeCompanyId))
      }
      options.headers = headers
    },

    onResponseError({ response }) {
      // 401 com sessão ativa → token expirou ou foi revogado: limpa store.
      if (response.status === 401 && auth.isAuthenticated) {
        auth.clear()
      }
    },
  })
}
