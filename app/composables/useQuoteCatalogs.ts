/**
 * Catálogos que alimentam as telas de orçamento (atividade 034).
 *
 * Famílias de papel, atividades, máquinas, tintas e chapas vêm dos cadastros reais da empresa
 * ativa. Carregam uma vez por sessão da tela: são listas curtas e o assistente as consulta o tempo
 * todo (nome da máquina, tinta aceita, tipo da atividade).
 */
import { computed, ref } from 'vue'
import { usePaperTypes } from '@/composables/usePaperTypes'
import { useActivities } from '@/composables/useActivities'
import { useMachineCatalog } from '@/composables/useMachineCatalog'
import { useSupplies } from '@/composables/useSupplies'
import type { ActivityKeyValue, ActivityType } from '@/types/Activity'
import type { MachineKeyValue } from '@/types/Machine'
import type { PaperType } from '@/types/PaperType'
import type { SupplyKeyValue } from '@/types/Supply'

/** O que a etapa pergunta no passo 3, derivado do TIPO da atividade. */
export type ParamKind = 'NONE' | 'MINUTES' | 'PRINTING'

const paperTypes = ref<PaperType[]>([])
const activities = ref<ActivityKeyValue[]>([])
const machines = ref<MachineKeyValue[]>([])
const inks = ref<SupplyKeyValue[]>([])
const plates = ref<SupplyKeyValue[]>([])
const loaded = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

export function useQuoteCatalogs() {
  async function load(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    error.value = null
    try {
      const [types, acts, machs, tintas, chapas] = await Promise.all([
        usePaperTypes().listPaperTypes(),
        useActivities().listKeyValues(true),
        useMachineCatalog().listAll(),
        useSupplies().listKeyValues({ onlyActive: true, type: 'INK' }),
        useSupplies().listKeyValues({ onlyActive: true, type: 'PLATE' }),
      ])
      paperTypes.value = types
      activities.value = acts
      machines.value = machs
      inks.value = tintas
      plates.value = chapas
      loaded.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Falha ao carregar os catálogos.'
    } finally {
      loading.value = false
    }
  }

  const findActivity = (id: number) => activities.value.find((a) => a.id === id)
  const findMachine = (id: number | null | undefined) =>
    id == null ? undefined : machines.value.find((m) => m.id === id)
  const findPaperType = (id: number | null | undefined) =>
    id == null ? undefined : paperTypes.value.find((p) => p.id === id)
  const findInk = (id: number) => inks.value.find((i) => i.id === id)
  const findPlate = (id: number | null | undefined) =>
    id == null ? undefined : plates.value.find((p) => p.id === id)

  /**
   * O que a atividade pede no passo 3. Só três respostas importam para a tela: nada, minutos ou a
   * configuração de impressão — o resto o motor calcula a partir do cadastro.
   */
  function paramKindOf(type: ActivityType | undefined): ParamKind {
    if (type === 'PRINTING') return 'PRINTING'
    if (type === 'MANUAL') return 'MINUTES'
    return 'NONE'
  }

  /** Atividades de corte: com impressão, o produto precisa de duas. */
  const cuttingActivities = computed(() => activities.value.filter((a) => a.type === 'CUTTING'))

  return {
    load, loading, loaded, error,
    paperTypes, activities, machines, inks, plates,
    cuttingActivities,
    findActivity, findMachine, findPaperType, findInk, findPlate,
    paramKindOf,
  }
}
