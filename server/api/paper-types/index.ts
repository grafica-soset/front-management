import { forwardToBackend } from '../../utils/forwardToBackend'

/** Atende `/api/paper-types` sem subcaminho. */
export default defineEventHandler((event) => forwardToBackend(event, { path: '/paper-types' }))
