/**
 * Composable do catálogo global de Formatos (/formats).
 *
 * Nota: o header `X-Customer-Id` é injetado automaticamente pelo `useApi` quando há
 * empresa ativa — por isso as dimensões já vêm na unidade configurada.
 */
import type { CreateFormatRequest, Format, UpdateFormatRequest } from '@/types/Format'
import { useFormatsStore } from '@/stores/formats'

export function useFormats() {
  const api = useApi()
  const store = useFormatsStore()

  async function listFormats(): Promise<Format[]> {
    const formats = await api<Format[]>('/formats')
    store.setFormats(formats)
    return formats
  }

  async function getFormat(id: number): Promise<Format> {
    return api<Format>(`/formats/${id}`)
  }

  async function createFormat(payload: CreateFormatRequest): Promise<Format> {
    const created = await api<Format>('/formats', { method: 'POST', body: payload })
    store.upsertFormat(created)
    return created
  }

  async function updateFormat(id: number, payload: UpdateFormatRequest): Promise<Format> {
    const updated = await api<Format>(`/formats/${id}`, { method: 'PUT', body: payload })
    store.upsertFormat(updated)
    return updated
  }

  async function deleteFormat(id: number): Promise<void> {
    await api(`/formats/${id}`, { method: 'DELETE' })
    store.removeFormat(id)
  }

  return { listFormats, getFormat, createFormat, updateFormat, deleteFormat }
}
