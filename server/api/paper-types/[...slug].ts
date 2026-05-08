import { getRouterParam } from 'h3'
import { forwardToBackend } from '../../utils/forwardToBackend'

/**
 * Catch-all do recurso de tipos de papel. Repassa qualquer requisição
 * `/api/paper-types/...` para `{backend}/paper-types/...`.
 */
export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const suffix = slug ? `/${slug}` : ''
  return forwardToBackend(event, { path: `/paper-types${suffix}` })
})
