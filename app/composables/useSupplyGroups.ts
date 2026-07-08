/**
 * Composable de CRUD de Grupos de Insumo (/supply-groups) — atividade 028.
 * GET/DELETE usam X-Customer-Id; POST/PUT preenchem customerId quando ausente.
 */
import type {
  CreateSupplyGroupRequest,
  SetSupplyGroupPapersRequest,
  SetSupplyGroupSuppliesRequest,
  SupplyGroup,
  SupplyGroupKeyValue,
  SupplyGroupPaper,
  UpdateSupplyGroupRequest,
} from '@/types/SupplyGroup'
import type { SupplyKeyValue } from '@/types/Supply'
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

  // Insumos atualmente vinculados ao grupo (para pré-marcar a seleção).
  async function listSupplies(id: number): Promise<SupplyKeyValue[]> {
    return await api<SupplyKeyValue[]>(`/supply-groups/${id}/supplies`)
  }

  // Substitui os insumos do grupo. Retorna o conjunto resultante.
  async function setSupplies(id: number, supplyIds: number[]): Promise<SupplyKeyValue[]> {
    const body: SetSupplyGroupSuppliesRequest = { supplyIds }
    return await api<SupplyKeyValue[]>(`/supply-groups/${id}/supplies`, { method: 'PUT', body })
  }

  // Papéis vinculados ao grupo (papel de embrulho etc.).
  async function listPapers(id: number): Promise<SupplyGroupPaper[]> {
    return await api<SupplyGroupPaper[]>(`/supply-groups/${id}/papers`)
  }

  // Substitui os papéis do grupo. Retorna o conjunto resultante.
  async function setPapers(id: number, paperIds: number[]): Promise<SupplyGroupPaper[]> {
    const body: SetSupplyGroupPapersRequest = { paperIds }
    return await api<SupplyGroupPaper[]>(`/supply-groups/${id}/papers`, { method: 'PUT', body })
  }

  return { listKeyValues, getById, create, update, remove, listSupplies, setSupplies, listPapers, setPapers }
}
