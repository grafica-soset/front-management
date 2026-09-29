import type {
  SaleOperation,
  SaleOperationListItem,
  SaleOperationPage,
  SaleOperationRequest,
} from '@/types/SaleOperation'
import type { RecordStatusFilter } from '@/types/Seller'
import { useAuthStore } from '@/stores/auth'
import { createTenantBoundClientApi } from '@/utils/clientRequestScope'

interface SaleOperationPageOptions {
  page?: number
  size?: number
  search?: string
  status?: RecordStatusFilter
}

/** Endpoints de /sale-operations — sempre dentro da empresa ativa (X-Customer-Id). */
export function useSaleOperations() {
  const api = useApi()
  const auth = useAuthStore()
  const request = createTenantBoundClientApi(api, () => auth.activeCompanyId)

  const list = () => request<SaleOperationListItem[]>('/sale-operations')

  const listPage = (options: SaleOperationPageOptions = {}) => request<SaleOperationPage>('/sale-operations/page', {
    query: {
      page: options.page ?? 0,
      size: options.size ?? 20,
      search: options.search || undefined,
      status: options.status ?? 'ALL',
    },
  })

  const getById = (saleOperationId: number) => request<SaleOperation>(`/sale-operations/${saleOperationId}`)
  const create = (payload: SaleOperationRequest) =>
    request<SaleOperation>('/sale-operations', { method: 'POST', body: payload })
  const update = (saleOperationId: number, payload: SaleOperationRequest) =>
    request<SaleOperation>(`/sale-operations/${saleOperationId}`, { method: 'PUT', body: payload })
  const activate = (saleOperationId: number) =>
    request<SaleOperation>(`/sale-operations/${saleOperationId}/activate`, { method: 'PATCH' })
  const deactivate = (saleOperationId: number) =>
    request<SaleOperation>(`/sale-operations/${saleOperationId}/deactivate`, { method: 'PATCH' })

  return { list, listPage, getById, create, update, activate, deactivate }
}
