/**
 * Composable de tipos de papel — encapsula CRUD de /paper-types e mantém
 * o cache no Pinia (usePapersStore).
 */
import type {
  CreatePaperTypeRequest,
  PaperType,
  UpdatePaperTypeRequest,
} from '@/types/PaperType'
import { usePapersStore } from '@/stores/papers'

export function usePaperTypes() {
  const api = useApi()
  const store = usePapersStore()

  async function listPaperTypes(): Promise<PaperType[]> {
    const types = await api<PaperType[]>('/paper-types')
    store.setPaperTypes(types)
    return types
  }

  async function createPaperType(payload: CreatePaperTypeRequest): Promise<PaperType> {
    const created = await api<PaperType>('/paper-types', { method: 'POST', body: payload })
    store.upsertPaperType(created)
    return created
  }

  async function updatePaperType(id: number, payload: UpdatePaperTypeRequest): Promise<PaperType> {
    const updated = await api<PaperType>(`/paper-types/${id}`, { method: 'PUT', body: payload })
    store.upsertPaperType(updated)
    return updated
  }

  async function deletePaperType(id: number): Promise<void> {
    await api(`/paper-types/${id}`, { method: 'DELETE' })
    store.removePaperType(id)
  }

  return { listPaperTypes, createPaperType, updatePaperType, deletePaperType }
}
