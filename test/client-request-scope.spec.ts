import { describe, expect, it, vi } from 'vitest'
import { createTenantBoundClientApi } from '@/utils/clientRequestScope'

describe('createTenantBoundClientApi', () => {
  it('fixa a empresa da chamada mesmo se a seleção mudar depois', async () => {
    let activeCustomerId: number | null = 41
    const api = vi.fn(async (_request: string, options?: { headers?: HeadersInit }) => {
      activeCustomerId = 99
      return new Headers(options?.headers).get('X-Customer-Id')
    })
    const request = createTenantBoundClientApi(api, () => activeCustomerId)

    const customerHeader = await request<string>('/clients/7', { method: 'PUT' })

    expect(customerHeader).toBe('41')
    expect(new Headers(api.mock.calls[0]?.[1]?.headers).get('X-Customer-Id')).toBe('41')
  })

  it('recusa chamada de clientes sem empresa ativa', async () => {
    const api = vi.fn()
    const request = createTenantBoundClientApi(api, () => null)

    await expect(request('/clients')).rejects.toThrow('Selecione uma empresa')
    expect(api).not.toHaveBeenCalled()
  })
})
