import type {
  CreateMachineRequest,
  KeyValueDto,
  MachineListQuery,
  MachineResponse,
  PageResponse,
  UpdateMachineRequest,
} from '~/types'

/**
 * Repositório do módulo de máquinas. Passa pelo proxy `/api/machines/*`,
 * que repassa para o backend Quarkus.
 *
 * O DELETE é soft no backend (marca `active = false`), mas a interface
 * exposta aqui é a mesma do CRUD padrão.
 */
export const useMachines = () => {
  /** GET /machines — KeyValueDto[]. Útil para alimentar selects. */
  const getAll = (filters: { name?: string, active?: boolean } = {}) =>
    $fetch<KeyValueDto[]>('/api/machines', {
      query: {
        ...(filters.name ? { name: filters.name } : {}),
        ...(filters.active !== undefined ? { active: filters.active } : {}),
      },
    })

  /** GET /machines/page — PageResponse<MachineResponse>. */
  const getPage = (query: MachineListQuery = {}) => {
    const { page = 0, size = 20, name, active } = query
    return $fetch<PageResponse<MachineResponse>>('/api/machines/page', {
      query: {
        page,
        size,
        ...(name ? { name } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    })
  }

  /** GET /machines/{id}. */
  const getById = (id: number) =>
    $fetch<MachineResponse>(`/api/machines/${id}`)

  /** POST /machines. */
  const create = (payload: CreateMachineRequest) =>
    $fetch<MachineResponse>('/api/machines', {
      method: 'POST',
      body: payload,
    })

  /** PUT /machines/{id}. */
  const update = (id: number, payload: UpdateMachineRequest) =>
    $fetch<MachineResponse>(`/api/machines/${id}`, {
      method: 'PUT',
      body: payload,
    })

  /**
   * DELETE /machines/{id} — soft delete no backend.
   * Exposto como `remove` para evitar conflito com a palavra-chave `delete`,
   * mantendo o padrão dos demais composables (useUsers/useCustomers/...).
   */
  const remove = (id: number) =>
    $fetch<void>(`/api/machines/${id}`, { method: 'DELETE' })

  return { getAll, getPage, getById, create, update, remove }
}
