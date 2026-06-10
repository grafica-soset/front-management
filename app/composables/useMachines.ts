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

/**
 * Parametrizado por tipo de máquina/payload para servir tanto a impressão
 * (Machine/MachineRequest) quanto o corte (CuttingMachine/CuttingMachineRequest),
 * que compartilham os mesmos verbos REST por categoria.
 */
export function useMachines<
  TMachine = Machine,
  TRequest extends { customerId: number } = MachineRequest,
>(base: string) {
  const api = useApi()
  const auth = useAuthStore()

  function withCustomer(payload: TRequest): TRequest {
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

  async function getById(id: number): Promise<TMachine> {
    return await api<TMachine>(`${base}/${id}`)
  }

  async function create(payload: TRequest): Promise<TMachine> {
    return await api<TMachine>(base, { method: 'POST', body: withCustomer(payload) })
  }

  async function update(id: number, payload: TRequest): Promise<TMachine> {
    return await api<TMachine>(`${base}/${id}`, { method: 'PUT', body: withCustomer(payload) })
  }

  async function remove(id: number): Promise<void> {
    await api(`${base}/${id}`, { method: 'DELETE' })
  }

  return { listKeyValues, listPage, getById, create, update, remove }
}
