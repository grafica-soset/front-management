/**
 * Composable de CRUD de Grupos de Insumo (/supply-groups) — atividade 028.
 * GET/DELETE usam X-Customer-Id; POST/PUT preenchem customerId quando ausente.
 */
import type {
  CreateSupplyGroupRequest,
  SupplyGroup,
  SupplyGroupKeyValue,
  UpdateSupplyGroupRequest,
} from '@/types/SupplyGroup'
import { useAuthStore } from '@/stores/auth'

export function useSupplyGroups() {
  const api = useApi()
  const auth = useAuthStore()

  function withCustomer<T extends { customerId: number }>(payload: T): T {
    if (!payload.customerId && auth.activeCompanyId) {
      return { ...payload, customerId: auth.activeCompanyId }
    }
    return payload
  }

  async function listKeyValues(onlyActive = true): Promise<SupplyGroupKeyValue[]> {
    return await api<SupplyGroupKeyValue[]>('/supply-groups', { query: { onlyActive } })
  }

  async function getById(id: number): Promise<SupplyGroup> {
    return await api<SupplyGroup>(`/supply-groups/${id}`)
  }

  async function create(payload: CreateSupplyGroupRequest): Promise<SupplyGroup> {
    return await api<SupplyGroup>('/supply-groups', { method: 'POST', body: withCustomer(payload) })
  }

  async function update(id: number, payload: UpdateSupplyGroupRequest): Promise<SupplyGroup> {
    return await api<SupplyGroup>(`/supply-groups/${id}`, { method: 'PUT', body: withCustomer(payload) })
  }

  async function remove(id: number): Promise<void> {
    await api(`/supply-groups/${id}`, { method: 'DELETE' })
  }

  return { listKeyValues, getById, create, update, remove }
}
