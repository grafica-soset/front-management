/**
 * Catálogo de máquinas do tenant (atividade 028): lista KeyValue de TODAS as máquinas da empresa,
 * usado por seletores como a máquina de uma atividade. GET /machines usa o header X-Customer-Id.
 */
import type { MachineKeyValue } from '@/types/Machine'

export function useMachineCatalog() {
  const api = useApi()

  async function listAll(onlyActive = true): Promise<MachineKeyValue[]> {
    return await api<MachineKeyValue[]>('/machines', { query: { onlyActive } })
  }

  return { listAll }
}
