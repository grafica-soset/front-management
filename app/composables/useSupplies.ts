/**
 * Composable de CRUD de Insumos (/supplies) — atividade 027.
 *
 * - GET/DELETE usam o header `X-Customer-Id` (injetado pelo `useApi` a partir da empresa ativa).
 * - POST/PUT exigem `customerId` no corpo — preenchido aqui quando ausente.
 */
import type {
  CreateSupplyRequest,
  Supply,
  SupplyKeyValue,
  SupplyPage,
  SupplyType,
  UpdateSupplyRequest,
} from '@/types/Supply'
import { useAuthStore } from '@/stores/auth'

interface ListOptions {
  type?: SupplyType
  onlyActive?: boolean
}

interface PageOptions {
  type?: SupplyType
  onlyActive?: boolean
  page?: number
  size?: number
}

export function useSupplies() {
  const api = useApi()
  const auth = useAuthStore()

  function withCustomer<T extends { customerId: number }>(payload: T): T {
    if (!payload.customerId && auth.activeCompanyId) {
      return { ...payload, customerId: auth.activeCompanyId }
    }
    return payload
  }

  async function listKeyValues(options: ListOptions = {}): Promise<SupplyKeyValue[]> {
    const query: Record<string, string | number | boolean> = {}
    if (options.type) query.type = options.type
    if (options.onlyActive !== undefined) query.onlyActive = options.onlyActive
    return await api<SupplyKeyValue[]>('/supplies', { query })
  }

  async function listPage(options: PageOptions = {}): Promise<SupplyPage> {
    const query: Record<string, string | number | boolean> = {}
    if (options.type) query.type = options.type
    if (options.onlyActive !== undefined) query.onlyActive = options.onlyActive
    if (options.page !== undefined) query.page = options.page
    if (options.size !== undefined) query.size = options.size
    return await api<SupplyPage>('/supplies/page', { query })
  }

  async function getById(id: number): Promise<Supply> {
    return await api<Supply>(`/supplies/${id}`)
  }

  async function create(payload: CreateSupplyRequest): Promise<Supply> {
    return await api<Supply>('/supplies', { method: 'POST', body: withCustomer(payload) })
  }

  async function update(id: number, payload: UpdateSupplyRequest): Promise<Supply> {
    return await api<Supply>(`/supplies/${id}`, { method: 'PUT', body: withCustomer(payload) })
  }

  async function remove(id: number): Promise<void> {
    await api(`/supplies/${id}`, { method: 'DELETE' })
  }

  return { listKeyValues, listPage, getById, create, update, remove }
}
