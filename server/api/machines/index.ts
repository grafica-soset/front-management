import { forwardToBackend } from '../../utils/forwardToBackend'

/** Atende `/api/machines` sem subcaminho. */
export default defineEventHandler((event) => forwardToBackend(event, { path: '/machines' }))
