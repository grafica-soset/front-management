import { getRouterParam } from 'h3'
import { forwardToBackend } from '../../utils/forwardToBackend'

/**
 * Catch-all do recurso de máquinas. Repassa qualquer requisição
 * `/api/machines/...` para `{backend}/machines/...`.
 *
 * Cobre `/page`, `/{id}` e qualquer outra rota futura sem precisar de
 * arquivo dedicado por ação. O DELETE no backend é soft (apenas marca
 * `active = false`), mas o proxy é agnóstico a isso.
 */
export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const suffix = slug ? `/${slug}` : ''
  return forwardToBackend(event, { path: `/machines${suffix}` })
})
