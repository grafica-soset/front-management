import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserListQuery,
  UserResponse,
} from '~/types/user'
import type { KeyValueDto, PageResponse } from '~/types/shared'

/**
 * Repositório do módulo de usuários. Sempre passa pelo proxy /api/users.
 */
export const useUsers = () => {
  const list = (query: UserListQuery = {}) => {
    const { page = 0, size = 20, name, active } = query
    return $fetch<PageResponse<UserResponse>>('/api/users/page', {
      query: {
        page,
        size,
        ...(name ? { name } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    })
  }

  const listKeyValue = () =>
    $fetch<KeyValueDto[]>('/api/users')

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

  return { list, listKeyValue, getById, create, update, remove }
}
