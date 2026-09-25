/**
 * Composable do catálogo de Modelos de Produto salvos (/product-templates) — atividade 037.
 * GET/DELETE usam X-Customer-Id; POST/PUT preenchem customerId quando ausente.
 */
import type {
  ProductTemplate,
  ProductTemplateKeyValue,
  ProductTemplatePage,
  ProductTemplateRequest,
} from '@/types/ProductTemplate'
import { useAuthStore } from '@/stores/auth'

interface PageOptions {
  onlyActive?: boolean
  search?: string
  page?: number
  size?: number
}

export function useProductTemplates() {
  const api = useApi()
  const auth = useAuthStore()

  function withCustomer(payload: ProductTemplateRequest): ProductTemplateRequest {
    if (!payload.customerId && auth.activeCompanyId) {
      return { ...payload, customerId: auth.activeCompanyId }
    }
    return payload
  }

  async function listKeyValues(options: { onlyActive?: boolean; productModelId?: number | null } = {}) {
    const query: Record<string, string | number | boolean> = { onlyActive: options.onlyActive ?? true }
    if (options.productModelId) query.productModelId = options.productModelId
    return await api<ProductTemplateKeyValue[]>('/product-templates', { query })
  }

  async function listPage(options: PageOptions = {}): Promise<ProductTemplatePage> {
    const query: Record<string, string | number | boolean> = {}
    if (options.onlyActive !== undefined) query.onlyActive = options.onlyActive
    if (options.search) query.search = options.search
    if (options.page !== undefined) query.page = options.page
    if (options.size !== undefined) query.size = options.size
    return await api<ProductTemplatePage>('/product-templates/page', { query })
  }

  async function getById(id: number): Promise<ProductTemplate> {
    return await api<ProductTemplate>(`/product-templates/${id}`)
  }

  async function create(payload: ProductTemplateRequest): Promise<ProductTemplate> {
    return await api<ProductTemplate>('/product-templates', { method: 'POST', body: withCustomer(payload) })
  }

  async function update(id: number, payload: ProductTemplateRequest): Promise<ProductTemplate> {
    return await api<ProductTemplate>(`/product-templates/${id}`, { method: 'PUT', body: withCustomer(payload) })
  }

  async function remove(id: number): Promise<void> {
    await api(`/product-templates/${id}`, { method: 'DELETE' })
  }

  return { listKeyValues, listPage, getById, create, update, remove }
}
