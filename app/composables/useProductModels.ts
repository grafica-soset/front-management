/**
 * Composable de CRUD de Modelos de Produto (/product-models) — atividade 028.
 * GET/DELETE usam X-Customer-Id; POST/PUT preenchem customerId quando ausente.
 */
import type {
  CreateProductModelRequest,
  ProductModel,
  ProductModelKeyValue,
  ProductModelPage,
  UpdateProductModelRequest,
} from '@/types/ProductModel'
import { useAuthStore } from '@/stores/auth'

interface PageOptions {
  onlyActive?: boolean
  page?: number
  size?: number
}

export function useProductModels() {
  const api = useApi()
  const auth = useAuthStore()

  function withCustomer<T extends { customerId: number }>(payload: T): T {
    if (!payload.customerId && auth.activeCompanyId) {
      return { ...payload, customerId: auth.activeCompanyId }
    }
    return payload
  }

  async function listKeyValues(onlyActive = true): Promise<ProductModelKeyValue[]> {
    return await api<ProductModelKeyValue[]>('/product-models', { query: { onlyActive } })
  }

  async function listPage(options: PageOptions = {}): Promise<ProductModelPage> {
    const query: Record<string, string | number | boolean> = {}
    if (options.onlyActive !== undefined) query.onlyActive = options.onlyActive
    if (options.page !== undefined) query.page = options.page
    if (options.size !== undefined) query.size = options.size
    return await api<ProductModelPage>('/product-models/page', { query })
  }

  async function getById(id: number): Promise<ProductModel> {
    return await api<ProductModel>(`/product-models/${id}`)
  }

  async function create(payload: CreateProductModelRequest): Promise<ProductModel> {
    return await api<ProductModel>('/product-models', { method: 'POST', body: withCustomer(payload) })
  }

  async function update(id: number, payload: UpdateProductModelRequest): Promise<ProductModel> {
    return await api<ProductModel>(`/product-models/${id}`, { method: 'PUT', body: withCustomer(payload) })
  }

  async function remove(id: number): Promise<void> {
    await api(`/product-models/${id}`, { method: 'DELETE' })
  }

  return { listKeyValues, listPage, getById, create, update, remove }
}
