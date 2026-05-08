import type { FetchError } from 'ofetch'

/**
 * Extrai uma mensagem amigável de um erro vindo do `$fetch`.
 *
 * O proxy Nitro (`server/utils/forwardToBackend.ts`) propaga `data.message`
 * com a causa real devolvida pelo backend. Esta função tenta primeiro esse
 * caminho e cai em fallbacks progressivos quando o erro não veio do backend
 * (ex.: rede caiu antes de chegar lá).
 */
export const extractApiErrorMessage = (err: unknown, fallback: string): string => {
  if (!err) return fallback

  const fetchErr = err as FetchError<{
    message?: string
    backend?: { message?: string }
  }>

  const fromData = fetchErr?.data?.message ?? fetchErr?.data?.backend?.message
  if (typeof fromData === 'string' && fromData.trim()) return fromData

  const statusMessage = fetchErr?.statusMessage
  if (typeof statusMessage === 'string' && statusMessage.trim()) return statusMessage

  if (err instanceof Error && err.message) return err.message

  return fallback
}

/**
 * Loga o erro no console do browser com o máximo de detalhes possível
 * (status + corpo). Útil para depurar via DevTools.
 */
export const logApiError = (context: string, err: unknown) => {
  const fetchErr = err as FetchError<unknown>
  console.error(`[soset] ${context}`, {
    status: fetchErr?.status ?? fetchErr?.statusCode,
    statusMessage: fetchErr?.statusMessage,
    data: fetchErr?.data,
    error: err,
  })
}
