import type {
  CreatePaperRequest,
  PaperListQuery,
  PaperResponse,
  UpdatePaperRequest,
} from '~/types/paper'
import type { KeyValueDto, PageResponse } from '~/types/shared'

/**
 * Repositório do módulo de papéis. Sempre passa pelo proxy /api/papers.
 */
export const usePapers = () => {
  const list = (query: PaperListQuery = {}) => {
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

  const listKeyValue = (filters: { name?: string, typeId?: number } = {}) =>
    $fetch<KeyValueDto[]>('/api/papers', {
      query: {
        ...(filters.name ? { name: filters.name } : {}),
        ...(filters.typeId !== undefined ? { typeId: filters.typeId } : {}),
      },
    })

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
    $fetch<void>(`/api/papers/${id}`, {
      method: 'DELETE',
    })

  return { list, listKeyValue, getById, create, update, remove }
}

/**
 * Composable auxiliar para alimentar selects de tipo de papel.
 * Endpoint provisório `/api/paper-types` — ajuste quando o backend confirmar a rota.
 */
export const usePaperTypes = () => {
  const list = () => $fetch<KeyValueDto[]>('/api/paper-types')
  return { list }
}
