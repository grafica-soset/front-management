/**
 * Catálogo de máquinas do tenant (atividade 028): lista KeyValue de TODAS as máquinas da empresa,
 * usado por seletores como a máquina de uma atividade. GET /machines usa o header X-Customer-Id.
 */
import type { MachineKeyValue, MachineType } from '@/types/Machine'

/** Tipos de máquina que imprimem — a atividade de impressão só aceita estes. */
export const PRINTING_MACHINE_TYPES: MachineType[] = ['OFFSET', 'DIGITAL', 'SCREEN_PRINTING']

export function useMachineCatalog() {
  const api = useApi()

  async function listAll(onlyActive = true): Promise<MachineKeyValue[]> {
    return await api<MachineKeyValue[]>('/machines', { query: { onlyActive } })
  }

  /** Só as máquinas dos tipos pedidos (ex.: impressoras da atividade de impressão). */
  async function listByTypes(types: MachineType[], onlyActive = true): Promise<MachineKeyValue[]> {
    const all = await listAll(onlyActive)
    return all.filter((m) => types.includes(m.machineType))
  }

  return { listAll, listByTypes, PRINTING_MACHINE_TYPES }
}
