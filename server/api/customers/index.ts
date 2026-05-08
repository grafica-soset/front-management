import { forwardToBackend } from '../../utils/forwardToBackend'

/** Atende `/api/customers` sem subcaminho. */
export default defineEventHandler((event) => forwardToBackend(event, { path: '/customers' }))
