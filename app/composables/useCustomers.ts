import type {
  CreateCustomerRequest,
  CustomerListQuery,
  CustomerResponse,
  KeyValueDto,
  PageResponse,
  UpdateCustomerRequest,
} from '~/types'

/**
 * Repositório do módulo de clientes. Passa pelo proxy `/api/customers/*`.
 */
export const useCustomers = () => {
  const getAll = (filters: { name?: string, active?: boolean } = {}) =>
    $fetch<KeyValueDto[]>('/api/customers', {
      query: {
        ...(filters.name ? { name: filters.name } : {}),
        ...(filters.active !== undefined ? { active: filters.active } : {}),
      },
    })

  const getPage = (query: CustomerListQuery = {}) => {
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
    $fetch<void>(`/api/customers/${id}`, { method: 'DELETE' })

  return { getAll, getPage, getById, create, update, remove }
}
