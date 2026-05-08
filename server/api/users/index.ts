import { forwardToBackend } from '../../utils/forwardToBackend'

/**
 * Atende `/api/users` sem subcaminho. Necessário porque o catch-all
 * `[...slug].ts` só cobre rotas com pelo menos um segmento adicional.
 */
export default defineEventHandler((event) => forwardToBackend(event, { path: '/users' }))
