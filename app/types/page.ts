/**
 * Estrutura genérica de paginação retornada pelo backend (Quarkus).
 */
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}
