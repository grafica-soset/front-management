<script setup lang="ts">
/**
 * Formulário de ATIVIDADE (atividades 028/029): nome + tipo (Manual/Automatizada/Acabamento).
 * - MANUAL: custo por hora-homem (R$/h).
 * - AUTOMATED: máquina (o custo vem da máquina).
 * - FINISHING: tarefa de acabamento (o custo vem dela) + máquina opcional (ex.: Espiral).
 * Consumo de insumo opcional: grupo + quantidade (na unidade do grupo) + base de cobrança.
 * Autocontido (props + emit).
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { Activity, ConsumptionBasis, CreateActivityRequest, UpdateActivityRequest } from '@/types/Activity'
import type { MachineKeyValue } from '@/types/Machine'
import type { SupplyGroupKeyValue } from '@/types/SupplyGroup'
import type { FinishingTaskKeyValue } from '@/types/FinishingTask'
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  CONSUMPTION_BASES,
  CONSUMPTION_BASIS_LABELS,
  SUPPLY_UNIT_SHORT_LABELS,
} from '@/utils/activityCatalog'
import { useMachineCatalog } from '@/composables/useMachineCatalog'
import { useSupplyGroups } from '@/composables/useSupplyGroups'
import { useFinishingTasks } from '@/composables/useFinishingTasks'

const props = defineProps<{
  initial?: Activity | null
  mode?: 'create' | 'edit'
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: CreateActivityRequest | UpdateActivityRequest, mode: 'create' | 'update'): void
  (e: 'cancel'): void
}>()

const isEditing = computed(() => props.mode === 'edit')

const form = reactive({
  name: '',
  type: 'MANUAL' as CreateActivityRequest['type'],
  machineId: null as number | null,
  laborHourlyCost: '0',
  finishingTaskId: null as number | null,
  supplyGroupId: null as number | null,
  supplyConsumptionQuantity: '',
  supplyConsumptionBasis: null as ConsumptionBasis | null,
  active: true,
})

const errors = ref<Record<string, string>>({})
const machines = ref<MachineKeyValue[]>([])
const groups = ref<SupplyGroupKeyValue[]>([])
const finishingTasks = ref<FinishingTaskKeyValue[]>([])

onMounted(async () => {
  try { machines.value = await useMachineCatalog().listAll() } catch { machines.value = [] }
  try { groups.value = await useSupplyGroups().listKeyValues() } catch { groups.value = [] }
  try { finishingTasks.value = await useFinishingTasks().listKeyValues() } catch { finishingTasks.value = [] }
})

if (props.initial) hydrate(props.initial)

function hydrate(a: Activity) {
  form.name = a.name
  form.type = a.type
  form.machineId = a.machineId
  form.laborHourlyCost = a.laborHourlyCost != null ? String(a.laborHourlyCost) : '0'
  form.finishingTaskId = a.finishingTaskId
  form.supplyGroupId = a.supplyGroupId
  form.supplyConsumptionQuantity = a.supplyConsumptionQuantity != null ? String(a.supplyConsumptionQuantity) : ''
  form.supplyConsumptionBasis = a.supplyConsumptionBasis
  form.active = a.active
}

const isManual = computed(() => form.type === 'MANUAL')
const isAutomated = computed(() => form.type === 'AUTOMATED')
const isFinishing = computed(() => form.type === 'FINISHING')
const consumesSupply = computed(() => form.supplyGroupId != null)

// Unidade do grupo selecionado, para exibir ao lado da quantidade de consumo.
const selectedGroupUnit = computed(() => {
  const g = groups.value.find((x) => x.id === form.supplyGroupId)
  return g ? SUPPLY_UNIT_SHORT_LABELS[g.unitOfMeasure] : ''
})

// Ao alternar o tipo, zera os campos que não se aplicam.
watch(() => form.type, (t) => {
  if (t === 'MANUAL') { form.machineId = null; form.finishingTaskId = null }
  else if (t === 'AUTOMATED') { form.laborHourlyCost = '0'; form.finishingTaskId = null }
  else { form.laborHourlyCost = '0' } // FINISHING: máquina é opcional; mantém.
})

// Consumo só existe quando há grupo; ao escolher um grupo, sugere base "Por unidade".
watch(() => form.supplyGroupId, (g) => {
  if (g == null) {
    form.supplyConsumptionQuantity = ''
    form.supplyConsumptionBasis = null
  } else if (form.supplyConsumptionBasis == null) {
    form.supplyConsumptionBasis = 'UNIT'
  }
})

const inputClass = (errKey: string) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  errors.value[errKey] ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]

const selectClass = 'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white'

function validate(): Record<string, string> {
  const e: Record<string, string> = {}
  const name = form.name.trim()
  if (!name) e['name'] = 'Informe o nome.'
  else if (name.length > 150) e['name'] = 'Máximo de 150 caracteres.'

  if (isAutomated.value) {
    if (!form.machineId) e['machineId'] = 'Selecione a máquina.'
  } else if (isManual.value) {
    const cost = Number(form.laborHourlyCost)
    if (!Number.isFinite(cost) || cost < 0) e['laborHourlyCost'] = 'Informe o custo hora-homem (≥ 0).'
  } else if (isFinishing.value) {
    if (!form.finishingTaskId) e['finishingTaskId'] = 'Selecione a tarefa de acabamento.'
  }

  if (consumesSupply.value) {
    const q = Number(form.supplyConsumptionQuantity)
    if (!Number.isFinite(q) || q <= 0) e['supplyConsumptionQuantity'] = 'Informe a quantidade (> 0).'
    if (!form.supplyConsumptionBasis) e['supplyConsumptionBasis'] = 'Selecione a base de cobrança.'
  }
  return e
}

const handleSubmit = () => {
  errors.value = validate()
  if (Object.keys(errors.value).length) return

  const base: CreateActivityRequest = {
    customerId: 0,
    name: form.name.trim(),
    type: form.type,
    machineId: isAutomated.value || isFinishing.value ? form.machineId : null,
    laborHourlyCost: isManual.value ? String(form.laborHourlyCost) : null,
    finishingTaskId: isFinishing.value ? form.finishingTaskId : null,
    supplyGroupId: form.supplyGroupId,
    supplyConsumptionQuantity: consumesSupply.value ? String(form.supplyConsumptionQuantity) : null,
    supplyConsumptionBasis: consumesSupply.value ? form.supplyConsumptionBasis : null,
  }

  if (isEditing.value) emit('submit', { ...base, active: form.active }, 'update')
  else emit('submit', base, 'create')
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-2">
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Nome <span class="text-rose-500">*</span></label>
        <input v-model="form.name" type="text" maxlength="150" placeholder="Ex.: Grampear / Colar Blocos / Arte" :class="inputClass('name')" />
        <p v-if="errors['name']" class="mt-1 text-xs text-rose-600">{{ errors['name'] }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Tipo <span class="text-rose-500">*</span></label>
        <select v-model="form.type" :class="selectClass">
          <option v-for="t in ACTIVITY_TYPES" :key="t" :value="t">{{ ACTIVITY_TYPE_LABELS[t] }}</option>
        </select>
      </div>
    </div>

    <!-- Fonte de custo conforme o tipo -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-if="isManual">
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Custo por hora-homem (R$/h) <span class="text-rose-500">*</span></label>
        <input v-model="form.laborHourlyCost" type="number" min="0" step="0.0001" :class="inputClass('laborHourlyCost')" />
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">O tempo é informado no orçamento (custo = R$/h × tempo).</p>
        <p v-if="errors['laborHourlyCost']" class="mt-1 text-xs text-rose-600">{{ errors['laborHourlyCost'] }}</p>
      </div>

      <div v-if="isFinishing">
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Tarefa de acabamento <span class="text-rose-500">*</span></label>
        <select v-model="form.finishingTaskId" :class="inputClass('finishingTaskId')">
          <option :value="null">— Selecione —</option>
          <option v-for="f in finishingTasks" :key="f.id" :value="f.id">{{ f.value }}</option>
        </select>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">O custo da atividade vem do acabamento.</p>
        <p v-if="errors['finishingTaskId']" class="mt-1 text-xs text-rose-600">{{ errors['finishingTaskId'] }}</p>
      </div>

      <div v-if="isAutomated || isFinishing">
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Máquina <span v-if="isAutomated" class="text-rose-500">*</span>
          <span v-else class="text-xs font-normal text-slate-400">(opcional)</span>
        </label>
        <select v-model="form.machineId" :class="inputClass('machineId')">
          <option :value="null">{{ isAutomated ? '— Selecione —' : '— Nenhuma —' }}</option>
          <option v-for="m in machines" :key="m.id" :value="m.id">{{ m.value }}</option>
        </select>
        <p v-if="isAutomated" class="mt-1 text-xs text-slate-500 dark:text-slate-400">O custo da atividade vem do custo-hora da máquina.</p>
        <p v-else class="mt-1 text-xs text-slate-500 dark:text-slate-400">Ex.: Aplicação de Espiral usa a furadeira + o acabamento.</p>
        <p v-if="errors['machineId']" class="mt-1 text-xs text-rose-600">{{ errors['machineId'] }}</p>
      </div>
    </div>

    <!-- Consumo de insumo -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Consumo de insumo</legend>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Grupo de insumo</label>
          <select v-model="form.supplyGroupId" :class="selectClass">
            <option :value="null">— Nenhum —</option>
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.value }}</option>
          </select>
        </div>
        <div v-if="consumesSupply">
          <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
            Quantidade <span v-if="selectedGroupUnit" class="text-xs font-normal text-slate-400">({{ selectedGroupUnit }})</span> <span class="text-rose-500">*</span>
          </label>
          <input v-model="form.supplyConsumptionQuantity" type="number" min="0" step="0.0001" :class="inputClass('supplyConsumptionQuantity')" />
          <p v-if="errors['supplyConsumptionQuantity']" class="mt-1 text-xs text-rose-600">{{ errors['supplyConsumptionQuantity'] }}</p>
        </div>
        <div v-if="consumesSupply">
          <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Base de cobrança <span class="text-rose-500">*</span></label>
          <select v-model="form.supplyConsumptionBasis" :class="inputClass('supplyConsumptionBasis')">
            <option v-for="b in CONSUMPTION_BASES" :key="b" :value="b">{{ CONSUMPTION_BASIS_LABELS[b] }}</option>
          </select>
          <p v-if="errors['supplyConsumptionBasis']" class="mt-1 text-xs text-rose-600">{{ errors['supplyConsumptionBasis'] }}</p>
        </div>
      </div>
      <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
        A unidade da quantidade vem do grupo. No orçamento escolhe-se o insumo específico e as dimensões.
      </p>
    </fieldset>

    <label v-if="isEditing" class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <input v-model="form.active" type="checkbox" class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600" />
      Atividade ativa
    </label>

    <div v-if="serverError" class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300">
      {{ serverError }}
    </div>

    <div class="flex justify-end gap-3 pt-2">
      <button type="button" @click="emit('cancel')" class="text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700">
        Cancelar
      </button>
      <button type="submit" :disabled="loading" class="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed font-medium rounded-lg text-sm px-5 py-2.5 shadow-md shadow-indigo-500/20">
        {{ loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar atividade' }}
      </button>
    </div>
  </form>
</template>
