/**
 * Wrapper de $fetch já configurado com baseURL e Authorization automático
 * (quando há JWT na store).
 *
 * Além disso, implementa o fluxo de refresh token: quando uma requisição
 * protegida recebe 401 (access token expirado), troca o refresh token por um
 * novo par em POST /auth/refresh e refaz a requisição original uma única vez.
 *
 * Uso típico:
 *   const api = useApi()
 *   const res = await api<MyType>('/customers', { method: 'POST', body })
 */
import type { FetchOptions } from 'ofetch'
import type { LoginResponse } from '@/types/LoginResponse'
import { useAuthStore } from '@/stores/auth'

/**
 * Promise de refresh compartilhada entre chamadas concorrentes (single-flight):
 * se várias requisições tomarem 401 ao mesmo tempo, apenas uma chama
 * /auth/refresh e as demais aguardam o mesmo resultado, evitando rotacionar o
 * refresh token mais de uma vez (o que invalidaria as outras tentativas).
 */
let refreshPromise: Promise<RefreshOutcome> | null = null

/**
 * TEMPO-LIMITE das chamadas (fix de /modelos, atividade 051). Sem ele, uma requisição que cai numa
 * instância da API sendo derrubada (Cloud Run reciclando por memória) nunca termina, e a tela fica em
 * "Carregando..." para sempre. Com ele, a chamada falha, o `$fetch` repete uma vez (GET) e, se ainda
 * assim falhar, a tela mostra o erro com "Tentar novamente".
 */
const REQUEST_TIMEOUT_MS = 30_000
/** Gravações e o cálculo do orçamento podem demorar mais que uma listagem. */
const WRITE_TIMEOUT_MS = 120_000

function withTimeout(options: FetchOptions): FetchOptions {
  if (options.timeout != null) return options
  const method = (options.method ?? 'GET').toUpperCase()
  return { ...options, timeout: method === 'GET' ? REQUEST_TIMEOUT_MS : WRITE_TIMEOUT_MS }
}

/**
 * Resultado da troca do refresh token: `ok`; `invalid` (o servidor RECUSOU o refresh — sessão perdida);
 * `unavailable` (o servidor não respondeu — a sessão continua valendo, só não deu agora).
 */
type RefreshOutcome = 'ok' | 'invalid' | 'unavailable'

/** Endpoints de autenticação não devem disparar refresh/redirect automático. */
function isAuthEndpoint(request: unknown): boolean {
  return typeof request === 'string' && request.startsWith('/auth/')
}

/**
 * Troca o refresh token atual por um novo par e atualiza a sessão.
 * Retorna `true` em caso de sucesso; em falha, limpa a sessão e retorna `false`.
 */
async function runRefresh(): Promise<RefreshOutcome> {
  const auth = useAuthStore()
  const currentRefresh = auth.refreshToken
  if (!currentRefresh) return 'invalid'

  try {
    const response = await $fetch<LoginResponse>('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { refreshToken: currentRefresh },
      timeout: REQUEST_TIMEOUT_MS,
    })
    auth.setSession(response)
    return 'ok'
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status
    // Sem resposta, ou erro do servidor: a API está fora do ar/reiniciando. Não é motivo para
    // derrubar a sessão — o refresh token continua válido.
    if (status === undefined || status >= 500) return 'unavailable'
    // Refresh inválido/expirado/rotacionado → sessão não recuperável.
    auth.clear()
    return 'invalid'
  }
}

/** Garante uma única chamada de refresh em voo, compartilhada entre chamadas. */
function ensureRefreshed(): Promise<RefreshOutcome> {
  if (!refreshPromise) {
    refreshPromise = runRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export function useApi() {
  const auth = useAuthStore()
  const router = useRouter()

  const baseFetch = $fetch.create({
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
  })

  /** Redireciona ao login preservando a rota atual para retorno pós-autenticação. */
  function redirectToLogin() {
    const current = router.currentRoute.value.fullPath
    if (current.startsWith('/auth/login')) {
      navigateTo('/auth/login')
    } else {
      navigateTo({ path: '/auth/login', query: { redirect: current } })
    }
  }

  /**
   * Executa a requisição e, em caso de 401 num endpoint protegido, tenta um
   * refresh transparente e refaz a requisição uma única vez. Se o refresh
   * falhar (ou não houver refresh token), limpa a sessão e manda ao login.
   */
  async function api<T>(request: string, rawOptions: FetchOptions = {}): Promise<T> {
    const options = withTimeout(rawOptions)
    try {
      return await baseFetch<T>(request, options as never)
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status !== 401 || isAuthEndpoint(request)) throw err

      // Sem refresh token disponível → não há como recuperar a sessão.
      if (!auth.refreshToken) {
        auth.clear()
        redirectToLogin()
        throw err
      }

      const refreshed = await ensureRefreshed()
      // API fora do ar: a tela mostra o erro e o usuário tenta de novo, ainda logado.
      if (refreshed === 'unavailable') throw err
      if (refreshed === 'invalid') {
        redirectToLogin()
        throw err
      }

      // Refaz a requisição original com o novo access token (injetado no
      // onRequest a partir da store já atualizada).
      return await baseFetch<T>(request, options as never)
    }
  }

  return api
}
