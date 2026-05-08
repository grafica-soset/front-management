import {
  createError,
  getMethod,
  getQuery,
  getRequestHeaders,
  readRawBody,
  setResponseHeader,
  setResponseStatus,
  type H3Event,
} from 'h3'

/**
 * Repassa a requisição atual do Nuxt para o backend (Quarkus) configurado em
 * `NUXT_API_BASE_URL`, mantendo método, headers, query string e body.
 *
 * Os handlers em `/server/api/{recurso}/[...].ts` invocam esta função com o
 * resto do caminho (`/users`, `/users/page`, `/users/42`, ...).
 */

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

const filterHeaders = (headers: Record<string, string | undefined>) => {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (!value) continue
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue
    out[key] = value
  }
  return out
}

const safeJsonParse = (text: string): unknown => {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * Extrai uma mensagem amigável do payload de erro retornado pelo backend.
 * Cobre o formato de Bean Validation do Quarkus (`violations`) e os campos
 * comuns (`message`, `detail`, `error`, `title`).
 */
const extractMessage = (payload: unknown, fallback: string): string => {
  if (!payload) return fallback
  if (typeof payload === 'string') return payload || fallback
  if (typeof payload !== 'object') return fallback

  const obj = payload as Record<string, unknown>
  if (typeof obj.message === 'string' && obj.message) return obj.message
  if (typeof obj.detail === 'string' && obj.detail) return obj.detail
  if (typeof obj.error === 'string' && obj.error) return obj.error
  if (typeof obj.title === 'string' && obj.title) return obj.title

  if (Array.isArray(obj.violations)) {
    const messages = obj.violations
      .map((v) => {
        if (v && typeof v === 'object') {
          const violation = v as Record<string, unknown>
          const field = typeof violation.field === 'string' ? violation.field : null
          const msg = typeof violation.message === 'string' ? violation.message : null
          if (field && msg) return `${field}: ${msg}`
          return msg
        }
        return null
      })
      .filter(Boolean)
    if (messages.length) return messages.join('; ')
  }

  return fallback
}

const buildSearch = (event: H3Event): string => {
  const query = getQuery(event)
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v === undefined || v === null || v === '') continue
        params.append(key, String(v))
      }
      continue
    }
    params.append(key, String(value))
  }
  const str = params.toString()
  return str ? `?${str}` : ''
}

export interface ForwardOptions {
  /** Caminho a ser anexado ao backend, começando com `/` (ex.: `/users/42`). */
  path: string
}

export const forwardToBackend = async (event: H3Event, options: ForwardOptions) => {
  const config = useRuntimeConfig()
  const baseUrl = config.apiBaseUrl

  if (!baseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_API_BASE_URL não configurada',
    })
  }

  const method = getMethod(event)
  const cleanPath = options.path.startsWith('/') ? options.path : `/${options.path}`
  const search = buildSearch(event)
  const target = `${baseUrl.replace(/\/+$/, '')}${cleanPath}${search}`

  const incomingHeaders = filterHeaders(getRequestHeaders(event))
  const body = ['GET', 'HEAD'].includes(method) ? undefined : await readRawBody(event)

  let response: Response
  try {
    response = await fetch(target, {
      method,
      headers: incomingHeaders,
      body: body ?? undefined,
    })
  } catch (err) {
    console.error(`[soset] Falha de rede em ${method} ${cleanPath}`, err)
    throw createError({
      statusCode: 502,
      statusMessage: 'Backend indisponível',
      data: {
        message:
          'Não foi possível contatar o servidor. Verifique se o backend está disponível.',
        target,
      },
    })
  }

  if (response.ok) {
    response.headers.forEach((value, key) => {
      if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return
      setResponseHeader(event, key, value)
    })
    setResponseStatus(event, response.status)
    const buffer = await response.arrayBuffer()
    return new Uint8Array(buffer)
  }

  const errorText = await response.text()
  const errorPayload = safeJsonParse(errorText)
  const friendlyMessage = extractMessage(
    errorPayload,
    `Backend respondeu ${response.status} ${response.statusText || ''}`.trim(),
  )

  console.error(
    `[soset] Erro do backend ${response.status} em ${method} ${cleanPath}: ${friendlyMessage}`,
  )

  throw createError({
    statusCode: response.status,
    statusMessage: friendlyMessage,
    data: {
      message: friendlyMessage,
      status: response.status,
      path: cleanPath,
      backend: errorPayload,
    },
  })
}
