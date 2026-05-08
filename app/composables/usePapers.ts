import type {
  CreatePaperRequest,
  KeyValueDto,
  PageResponse,
  PaperListQuery,
  PaperResponse,
  UpdatePaperRequest,
} from '~/types'

/**
 * Repositório do módulo de papéis/insumos. Passa pelo proxy `/api/papers/*`.
 */
export const usePapers = () => {
  const getAll = (filters: { name?: string, typeId?: number } = {}) =>
    $fetch<KeyValueDto[]>('/api/papers', {
      query: {
        ...(filters.name ? { name: filters.name } : {}),
        ...(filters.typeId !== undefined ? { typeId: filters.typeId } : {}),
      },
    })

  const getPage = (query: PaperListQuery = {}) => {
    const { page = 0, size = 20, name, typeId } = query
    return $fetch<PageResponse<PaperResponse>>('/api/papers/page', {
      query: {
        page,
        size,
        ...(name ? { name } : {}),
        ...(typeId !== undefined ? { typeId } : {}),
      },
    })
  }

  const getById = (id: number) =>
    $fetch<PaperResponse>(`/api/papers/${id}`)

  const create = (payload: CreatePaperRequest) =>
    $fetch<PaperResponse>('/api/papers', {
      method: 'POST',
      body: payload,
    })

  const update = (id: number, payload: UpdatePaperRequest) =>
    $fetch<PaperResponse>(`/api/papers/${id}`, {
      method: 'PUT',
      body: payload,
    })

  const remove = (id: number) =>
    $fetch<void>(`/api/papers/${id}`, { method: 'DELETE' })

  return { getAll, getPage, getById, create, update, remove }
}
