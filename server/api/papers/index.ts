import { forwardToBackend } from '../../utils/forwardToBackend'

/** Atende `/api/papers` sem subcaminho. */
export default defineEventHandler((event) => forwardToBackend(event, { path: '/papers' }))
