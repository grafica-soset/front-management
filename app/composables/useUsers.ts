import type {
  CreateUserRequest,
  KeyValueDto,
  PageResponse,
  UpdateUserRequest,
  UserListQuery,
  UserResponse,
} from '~/types'

/**
 * Repositório do módulo de usuários. Sempre passa pelo proxy `/api/users/*`,
 * que repassa a chamada para o backend Quarkus.
 */
export const useUsers = () => {
  /** GET /users — KeyValueDto[] (id + nome). */
  const getAll = (filters: { name?: string, active?: boolean } = {}) =>
    $fetch<KeyValueDto[]>('/api/users', {
      query: {
        ...(filters.name ? { name: filters.name } : {}),
        ...(filters.active !== undefined ? { active: filters.active } : {}),
      },
    })

  /** GET /users/page — PageResponse<UserResponse>. */
  const getPage = (query: UserListQuery = {}) => {
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

  /** GET /users/{id}. */
  const getById = (id: number) =>
    $fetch<UserResponse>(`/api/users/${id}`)

  /** POST /users. Backend retorna 201 + UserResponse + header Location. */
  const create = (payload: CreateUserRequest) =>
    $fetch<UserResponse>('/api/users', {
      method: 'POST',
      body: payload,
    })

  /** PUT /users/{id}. */
  const update = (id: number, payload: UpdateUserRequest) =>
    $fetch<UserResponse>(`/api/users/${id}`, {
      method: 'PUT',
      body: payload,
    })

  /** DELETE /users/{id}. Backend responde 204 No Content. */
  const remove = (id: number) =>
    $fetch<void>(`/api/users/${id}`, { method: 'DELETE' })

  return { getAll, getPage, getById, create, update, remove }
}
