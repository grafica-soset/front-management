import { getRouterParam } from 'h3'
import { forwardToBackend } from '../../utils/forwardToBackend'

/**
 * Catch-all do recurso de usuários. Captura todas as variantes de método
 * (GET/POST/PUT/DELETE) e qualquer subcaminho (`/page`, `/{id}`) e repassa
 * para o backend mantendo método, query string e body.
 *
 * Mapeamentos atendidos:
 * - GET    /api/users        -> GET    {backend}/users
 * - GET    /api/users/page   -> GET    {backend}/users/page
 * - GET    /api/users/{id}   -> GET    {backend}/users/{id}
 * - POST   /api/users        -> POST   {backend}/users
 * - PUT    /api/users/{id}   -> PUT    {backend}/users/{id}
 * - DELETE /api/users/{id}   -> DELETE {backend}/users/{id}
 */
export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const suffix = slug ? `/${slug}` : ''
  return forwardToBackend(event, { path: `/users${suffix}` })
})
