import type { FetchOptions } from 'ofetch'

type ClientApi = (request: string, options?: FetchOptions) => Promise<unknown>

export function createTenantBoundClientApi(
  api: ClientApi,
  getActiveCustomerId: () => number | null,
) {
  return async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const customerId = getActiveCustomerId()
    if (!customerId) throw new Error('Selecione uma empresa antes de acessar os clientes.')

    const headers = new Headers(options.headers as HeadersInit | undefined)
    headers.set('X-Customer-Id', String(customerId))
    return await api(path, { ...options, headers }) as T
  }
}
