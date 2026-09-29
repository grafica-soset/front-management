import type {
  RecordStatusFilter,
  Seller,
  SellerListItem,
  SellerPage,
  SellerRequest,
} from '@/types/Seller'
import { useAuthStore } from '@/stores/auth'
import { createTenantBoundClientApi } from '@/utils/clientRequestScope'

interface SellerPageOptions {
  page?: number
  size?: number
  search?: string
  status?: RecordStatusFilter
}

/** Endpoints de /sellers — sempre dentro da empresa ativa (X-Customer-Id). */
export function useSellers() {
  const api = useApi()
  const auth = useAuthStore()
  const request = createTenantBoundClientApi(api, () => auth.activeCompanyId)

  const list = () => request<SellerListItem[]>('/sellers')

  const listPage = (options: SellerPageOptions = {}) => request<SellerPage>('/sellers/page', {
    query: {
      page: options.page ?? 0,
      size: options.size ?? 20,
      search: options.search || undefined,
      status: options.status ?? 'ALL',
    },
  })

  const getById = (sellerId: number) => request<Seller>(`/sellers/${sellerId}`)
  const create = (payload: SellerRequest) => request<Seller>('/sellers', { method: 'POST', body: payload })
  const update = (sellerId: number, payload: SellerRequest) =>
    request<Seller>(`/sellers/${sellerId}`, { method: 'PUT', body: payload })
  const activate = (sellerId: number) => request<Seller>(`/sellers/${sellerId}/activate`, { method: 'PATCH' })
  const deactivate = (sellerId: number) => request<Seller>(`/sellers/${sellerId}/deactivate`, { method: 'PATCH' })

  return { list, listPage, getById, create, update, activate, deactivate }
}
