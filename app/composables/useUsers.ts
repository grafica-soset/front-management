import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserListQuery,
  UserResponse,
} from '~/types/user'
import type { PageResponse } from '~/types/page'

/**
 * Composable que centraliza as chamadas HTTP para o módulo de usuários.
 * Sempre passa pelo proxy do Nuxt (/api/users), nunca pelo backend direto.
 */
export const useUsers = () => {
  const list = (query: UserListQuery = {}) => {
    const { page = 0, size = 20, nameFilter } = query
    return $fetch<PageResponse<UserResponse>>('/api/users/page', {
      query: {
        page,
        size,
        ...(nameFilter ? { nameFilter } : {}),
      },
    })
  }

  const getById = (id: number) =>
    $fetch<UserResponse>(`/api/users/${id}`)

  const create = (payload: CreateUserRequest) =>
    $fetch<UserResponse>('/api/users', {
      method: 'POST',
      body: payload,
    })

  const update = (id: number, payload: UpdateUserRequest) =>
    $fetch<UserResponse>(`/api/users/${id}`, {
      method: 'PUT',
      body: payload,
    })

  const remove = (id: number) =>
    $fetch<void>(`/api/users/${id}`, {
      method: 'DELETE',
    })

  return { list, getById, create, update, remove }
}
