/**
 * Composable de CRUD de Tarefas de Acabamento (/finishing-tasks) — atividade 029.
 * GET/DELETE usam X-Customer-Id; POST/PUT preenchem customerId quando ausente.
 */
import type {
  CreateFinishingTaskRequest,
  FinishingTask,
  FinishingTaskKeyValue,
  FinishingTaskType,
  UpdateFinishingTaskRequest,
} from '@/types/FinishingTask'
import { useAuthStore } from '@/stores/auth'

export function useFinishingTasks() {
  const api = useApi()
  const auth = useAuthStore()

  function withCustomer<T extends { customerId: number }>(payload: T): T {
    if (!payload.customerId && auth.activeCompanyId) {
      return { ...payload, customerId: auth.activeCompanyId }
    }
    return payload
  }

  async function listKeyValues(
    options: { type?: FinishingTaskType; onlyActive?: boolean } = {},
  ): Promise<FinishingTaskKeyValue[]> {
    const query: Record<string, string | boolean> = {}
    if (options.type) query.type = options.type
    if (options.onlyActive !== undefined) query.onlyActive = options.onlyActive
    return await api<FinishingTaskKeyValue[]>('/finishing-tasks', { query })
  }

  async function getById(id: number): Promise<FinishingTask> {
    return await api<FinishingTask>(`/finishing-tasks/${id}`)
  }

  async function create(payload: CreateFinishingTaskRequest): Promise<FinishingTask> {
    return await api<FinishingTask>('/finishing-tasks', { method: 'POST', body: withCustomer(payload) })
  }

  async function update(id: number, payload: UpdateFinishingTaskRequest): Promise<FinishingTask> {
    return await api<FinishingTask>(`/finishing-tasks/${id}`, { method: 'PUT', body: withCustomer(payload) })
  }

  async function remove(id: number): Promise<void> {
    await api(`/finishing-tasks/${id}`, { method: 'DELETE' })
  }

  return { listKeyValues, getById, create, update, remove }
}
