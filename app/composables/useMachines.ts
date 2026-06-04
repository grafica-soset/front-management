/**
 * Composable de CRUD de máquinas, parametrizado pelo endpoint base da
 * categoria (ex.: "/printing-machines"). Os 4 endpoints expõem os mesmos
 * verbos (cf. .docs/machines-frontend-guide.md, seção 3).
 *
 * - GET/DELETE usam o header `X-Customer-Id` (injetado automaticamente pelo
 *   `useApi` a partir da empresa ativa).
 * - POST/PUT exigem `customerId` no corpo — preenchido aqui quando ausente.
 */
import type {
  Machine,
  MachineKeyValue,
  MachinePage,
  MachineRequest,
} from '@/types/Machine'
import { useAuthStore } from '@/stores/auth'

interface ListPageOptions {
  page?: number
  size?: number
  onlyActive?: boolean
}

export function useMachines(base: string) {
  const api = useApi()
  const auth = useAuthStore()

  function withCustomer(payload: MachineRequest): MachineRequest {
    if (!payload.customerId && auth.activeCompanyId) {
      return { ...payload, customerId: auth.activeCompanyId }
    }
    return payload
  }

  async function listKeyValues(onlyActive = true): Promise<MachineKeyValue[]> {
    return await api<MachineKeyValue[]>(base, { query: { onlyActive } })
  }

  async function listPage(options: ListPageOptions = {}): Promise<MachinePage> {
    const query: Record<string, string | number | boolean> = {}
    if (options.page !== undefined) query.page = options.page
    if (options.size !== undefined) query.size = options.size
    if (options.onlyActive !== undefined) query.onlyActive = options.onlyActive
    return await api<MachinePage>(`${base}/page`, { query })
  }

  async function getById(id: number): Promise<Machine> {
    return await api<Machine>(`${base}/${id}`)
  }

  async function create(payload: MachineRequest): Promise<Machine> {
    return await api<Machine>(base, { method: 'POST', body: withCustomer(payload) })
  }

  async function update(id: number, payload: MachineRequest): Promise<Machine> {
    return await api<Machine>(`${base}/${id}`, { method: 'PUT', body: withCustomer(payload) })
  }

  async function remove(id: number): Promise<void> {
    await api(`${base}/${id}`, { method: 'DELETE' })
  }

  return { listKeyValues, listPage, getById, create, update, remove }
}
