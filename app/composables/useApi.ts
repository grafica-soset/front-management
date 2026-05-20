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
  const router = useRouter()

  return $fetch.create({
    // Sempre via /api: o Nitro (routeRules em nuxt.config) faz o proxy reverso
    // para NUXT_API_BASE_URL. Mantém o navegador na mesma origem e evita CORS.
    baseURL: '/api',

    onRequest({ request, options }) {
      // Log da URL chamada no backend (método + baseURL + path + query).
      const query = options.query && Object.keys(options.query).length ? options.query : undefined
      console.log(`[useApi] ${options.method?.toUpperCase() ?? 'GET'} ${options.baseURL ?? ''}${request}`, query ?? '')

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
      // 401 → token expirou/foi revogado: força logoff e manda para o login
      // preservando a rota atual para retorno após autenticar.
      if (response.status === 401) {
        auth.clear()
        const current = router.currentRoute.value.fullPath
        if (current.startsWith('/auth/login')) {
          navigateTo('/auth/login')
        } else {
          navigateTo({ path: '/auth/login', query: { redirect: current } })
        }
      }
    },
  })
}
