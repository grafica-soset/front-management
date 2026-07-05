/**
 * Composable de CRUD de Atividades (/activities) — atividade 028.
 * GET/DELETE usam X-Customer-Id; POST/PUT preenchem customerId quando ausente.
 */
import type {
  Activity,
  ActivityKeyValue,
  ActivityPage,
  CreateActivityRequest,
  UpdateActivityRequest,
} from '@/types/Activity'
import { useAuthStore } from '@/stores/auth'

interface PageOptions {
  onlyActive?: boolean
  page?: number
  size?: number
}

export function useActivities() {
  const api = useApi()
  const auth = useAuthStore()

  function withCustomer<T extends { customerId: number }>(payload: T): T {
    if (!payload.customerId && auth.activeCompanyId) {
      return { ...payload, customerId: auth.activeCompanyId }
    }
    return payload
  }

  async function listKeyValues(onlyActive = true): Promise<ActivityKeyValue[]> {
    return await api<ActivityKeyValue[]>('/activities', { query: { onlyActive } })
  }

  async function listPage(options: PageOptions = {}): Promise<ActivityPage> {
    const query: Record<string, string | number | boolean> = {}
    if (options.onlyActive !== undefined) query.onlyActive = options.onlyActive
    if (options.page !== undefined) query.page = options.page
    if (options.size !== undefined) query.size = options.size
    return await api<ActivityPage>('/activities/page', { query })
  }

  async function getById(id: number): Promise<Activity> {
    return await api<Activity>(`/activities/${id}`)
  }

  async function create(payload: CreateActivityRequest): Promise<Activity> {
    return await api<Activity>('/activities', { method: 'POST', body: withCustomer(payload) })
  }

  async function update(id: number, payload: UpdateActivityRequest): Promise<Activity> {
    return await api<Activity>(`/activities/${id}`, { method: 'PUT', body: withCustomer(payload) })
  }

  async function remove(id: number): Promise<void> {
    await api(`/activities/${id}`, { method: 'DELETE' })
  }

  return { listKeyValues, listPage, getById, create, update, remove }
}
