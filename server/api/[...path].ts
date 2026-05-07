import { proxyRequest, getRequestURL, createError } from 'h3'

/**
 * Proxy genérico (BFF): repassa qualquer requisição feita ao Nuxt em /api/*
 * para a API backend definida em NUXT_API_BASE_URL.
 *
 * Ex.: GET /api/users/page?page=0  ->  GET ${NUXT_API_BASE_URL}/users/page?page=0
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const baseUrl = config.apiBaseUrl

  if (!baseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_API_BASE_URL não configurada',
    })
  }

  const params = event.context.params as { path?: string | string[] } | undefined
  const rawPath = params?.path
  const path = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath ?? '')
  const search = getRequestURL(event).search

  const target = `${baseUrl.replace(/\/+$/, '')}/${path}${search}`

  return proxyRequest(event, target, {
    // Repassa cookies/headers de autenticação quando o backend for integrado.
    sendStream: true,
  })
})
