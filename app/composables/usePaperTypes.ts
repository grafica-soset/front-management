import type {
  CreatePaperTypeRequest,
  KeyValueDto,
  PageResponse,
  PaperTypeListQuery,
  PaperTypeResponse,
  UpdatePaperTypeRequest,
} from '~/types'

/**
 * Repositório do módulo de tipos de papel. Passa pelo proxy
 * `/api/paper-types/*`, que repassa para o backend Quarkus.
 */
export const usePaperTypes = () => {
  /** GET /paper-types — KeyValueDto[]. Útil para alimentar selects. */
  const getAll = (filters: { name?: string } = {}) =>
    $fetch<KeyValueDto[]>('/api/paper-types', {
      query: {
        ...(filters.name ? { name: filters.name } : {}),
      },
    })

  /** GET /paper-types/page — PageResponse<PaperTypeResponse>. */
  const getPage = (query: PaperTypeListQuery = {}) => {
    const { page = 0, size = 20, name } = query
    return $fetch<PageResponse<PaperTypeResponse>>('/api/paper-types/page', {
      query: {
        page,
        size,
        ...(name ? { name } : {}),
      },
    })
  }

  /** GET /paper-types/{id}. */
  const getById = (id: number) =>
    $fetch<PaperTypeResponse>(`/api/paper-types/${id}`)

  /** POST /paper-types. */
  const create = (payload: CreatePaperTypeRequest) =>
    $fetch<PaperTypeResponse>('/api/paper-types', {
      method: 'POST',
      body: payload,
    })

  /** PUT /paper-types/{id}. */
  const update = (id: number, payload: UpdatePaperTypeRequest) =>
    $fetch<PaperTypeResponse>(`/api/paper-types/${id}`, {
      method: 'PUT',
      body: payload,
    })

  /** DELETE /paper-types/{id}. Backend responde 204 No Content. */
  const remove = (id: number) =>
    $fetch<void>(`/api/paper-types/${id}`, { method: 'DELETE' })

  return { getAll, getPage, getById, create, update, remove }
}
