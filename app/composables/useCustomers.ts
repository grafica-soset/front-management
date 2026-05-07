import type {
  CreateCustomerRequest,
  CustomerListQuery,
  CustomerResponse,
  UpdateCustomerRequest,
} from '~/types/customer'
import type { KeyValueDto, PageResponse } from '~/types/shared'

/**
 * Repositório do módulo de clientes. Sempre passa pelo proxy /api/customers.
 */
export const useCustomers = () => {
  const list = (query: CustomerListQuery = {}) => {
    const { page = 0, size = 20, name, active } = query
    return $fetch<PageResponse<CustomerResponse>>('/api/customers/page', {
      query: {
        page,
        size,
        ...(name ? { name } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    })
  }

  const listKeyValue = () =>
    $fetch<KeyValueDto[]>('/api/customers')

  const getById = (id: number) =>
    $fetch<CustomerResponse>(`/api/customers/${id}`)

  const create = (payload: CreateCustomerRequest) =>
    $fetch<CustomerResponse>('/api/customers', {
      method: 'POST',
      body: payload,
    })

  const update = (id: number, payload: UpdateCustomerRequest) =>
    $fetch<CustomerResponse>(`/api/customers/${id}`, {
      method: 'PUT',
      body: payload,
    })

  const remove = (id: number) =>
    $fetch<void>(`/api/customers/${id}`, {
      method: 'DELETE',
    })

  return { list, listKeyValue, getById, create, update, remove }
}
