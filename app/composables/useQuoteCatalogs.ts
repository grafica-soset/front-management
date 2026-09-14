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
import type { ActivityKeyValue } from '@/types/Activity'
import type { MachineKeyValue } from '@/types/Machine'
import type { PaperType } from '@/types/PaperType'
import type { SupplyKeyValue } from '@/types/Supply'

/**
 * O que a etapa pergunta no passo 3.
 *
 * Vem do TIPO da atividade — e, no acabamento automatizado, da MÁQUINA por trás dela (atividade
 * 035): a picotadeira pergunta quantos picotes e em quantas vias; a grampeadeira, quantos grampos.
 */
export type ParamKind = 'NONE' | 'MINUTES' | 'PRINTING' | 'PERFORATION' | 'STAPLES'

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
  /**
   * O que a tela precisa PERGUNTAR de uma atividade.
   *
   * Hora-homem não é só o tipo MANUAL: um acabamento de subtipo MANUAL é cobrado do mesmo jeito —
   * o motor pede os minutos e cobra o valor da hora da atividade. Enquanto isso olhava só o tipo,
   * esses acabamentos nunca ganhavam o campo de tempo e saíam do orçamento custando zero.
   */
  function paramKindOf(
    activity: Pick<ActivityKeyValue, 'type' | 'finishingSubtype' | 'machineIds'> | undefined
  ): ParamKind {
    if (!activity) return 'NONE'
    if (activity.type === 'PRINTING') return 'PRINTING'
    if (activity.type === 'MANUAL') return 'MINUTES'
    if (activity.type === 'FINISHING' && activity.finishingSubtype === 'MANUAL') return 'MINUTES'
    // Acabamento de MÁQUINA: quem decide a pergunta é o tipo dela. Sem essa informação a tela
    // mostraria "nada a configurar" numa etapa que precisa saber quantos grampos o talão leva.
    if (activity.type === 'FINISHING' && activity.finishingSubtype === 'AUTOMATED') {
      const tipos = (activity.machineIds ?? []).map((id) => findMachine(id)?.machineType)
      if (tipos.includes('STITCHING')) return 'STAPLES'
      if (tipos.includes('PERFORATING')) return 'PERFORATION'
    }
    return 'NONE'
  }

  /** As máquinas de uma atividade — o passo 3 mostra tempo e escolha entre elas. */
  const machinesOfActivity = (activity: ActivityKeyValue | undefined) =>
    (activity?.machineIds ?? []).map((id) => findMachine(id)).filter((m) => m !== undefined)

  /** Atividades de corte: com impressão, o produto precisa de duas. */
  const cuttingActivities = computed(() => activities.value.filter((a) => a.type === 'CUTTING'))

  return {
    load, loading, loaded, error,
    paperTypes, activities, machines, inks, plates,
    cuttingActivities,
    findActivity, findMachine, findPaperType, findInk, findPlate,
    paramKindOf, machinesOfActivity,
  }
}
