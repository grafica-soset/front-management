import { getRouterParam } from 'h3'
import { forwardToBackend } from '../../utils/forwardToBackend'

/**
 * Catch-all do recurso de papéis. Repassa qualquer requisição
 * `/api/papers/...` para `{backend}/papers/...`.
 */
export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const suffix = slug ? `/${slug}` : ''
  return forwardToBackend(event, { path: `/papers${suffix}` })
})
