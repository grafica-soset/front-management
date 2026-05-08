import { getRouterParam } from 'h3'
import { forwardToBackend } from '../../utils/forwardToBackend'

/**
 * Catch-all do recurso de clientes. Repassa qualquer requisição
 * `/api/customers/...` para `{backend}/customers/...`.
 */
export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const suffix = slug ? `/${slug}` : ''
  return forwardToBackend(event, { path: `/customers${suffix}` })
})
