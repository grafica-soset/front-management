<script setup lang="ts">
/**
 * Formulário de ATIVIDADE (atividade 028): nome + tipo (Manual/Automatizada).
 * - AUTOMATED: seleciona a máquina (catálogo do tenant); o custo vem da máquina.
 * - MANUAL: informa o custo por hora-homem (R$/h).
 * Consumo de insumo opcional via grupo de insumo. Autocontido (props + emit).
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { Activity, CreateActivityRequest, UpdateActivityRequest } from '@/types/Activity'
import type { MachineKeyValue } from '@/types/Machine'
import type { SupplyGroupKeyValue } from '@/types/SupplyGroup'
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS } from '@/utils/activityCatalog'
import { useMachineCatalog } from '@/composables/useMachineCatalog'
import { useSupplyGroups } from '@/composables/useSupplyGroups'

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
  supplyGroupId: null as number | null,
  active: true,
})

const errors = ref<Record<string, string>>({})
const machines = ref<MachineKeyValue[]>([])
const groups = ref<SupplyGroupKeyValue[]>([])

onMounted(async () => {
  try { machines.value = await useMachineCatalog().listAll() } catch { machines.value = [] }
  try { groups.value = await useSupplyGroups().listKeyValues() } catch { groups.value = [] }
})

if (props.initial) hydrate(props.initial)

function hydrate(a: Activity) {
  form.name = a.name
  form.type = a.type
  form.machineId = a.machineId
  form.laborHourlyCost = a.laborHourlyCost != null ? String(a.laborHourlyCost) : '0'
  form.supplyGroupId = a.supplyGroupId
  form.active = a.active
}

const isAutomated = computed(() => form.type === 'AUTOMATED')

// Ao alternar o tipo, zera o campo que não se aplica (mantém o modelo coerente com o backend).
watch(() => form.type, (t) => {
  if (t === 'AUTOMATED') form.laborHourlyCost = '0'
  else form.machineId = null
})

const inputClass = (errKey: string) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  errors.value[errKey] ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]

function validate(): Record<string, string> {
  const e: Record<string, string> = {}
  const name = form.name.trim()
  if (!name) e['name'] = 'Informe o nome.'
  else if (name.length > 150) e['name'] = 'Máximo de 150 caracteres.'

  if (isAutomated.value) {
    if (!form.machineId) e['machineId'] = 'Selecione a máquina.'
  } else {
    const cost = Number(form.laborHourlyCost)
    if (!Number.isFinite(cost) || cost < 0) e['laborHourlyCost'] = 'Informe o custo hora-homem (≥ 0).'
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
    machineId: isAutomated.value ? form.machineId : null,
    laborHourlyCost: isAutomated.value ? null : String(form.laborHourlyCost),
    supplyGroupId: form.supplyGroupId,
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
        <input v-model="form.name" type="text" maxlength="150" placeholder="Ex.: Grampear / Separação Manual" :class="inputClass('name')" />
        <p v-if="errors['name']" class="mt-1 text-xs text-rose-600">{{ errors['name'] }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Tipo <span class="text-rose-500">*</span></label>
        <select v-model="form.type" class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
          <option v-for="t in ACTIVITY_TYPES" :key="t" :value="t">{{ ACTIVITY_TYPE_LABELS[t] }}</option>
        </select>
      </div>
    </div>

    <!-- Custo / máquina conforme o tipo -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-if="isAutomated">
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Máquina <span class="text-rose-500">*</span></label>
        <select v-model="form.machineId" :class="inputClass('machineId')">
          <option :value="null">— Selecione —</option>
          <option v-for="m in machines" :key="m.id" :value="m.id">{{ m.value }}</option>
        </select>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">O custo da atividade vem do custo-hora da máquina.</p>
        <p v-if="errors['machineId']" class="mt-1 text-xs text-rose-600">{{ errors['machineId'] }}</p>
      </div>
      <div v-else>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Custo por hora-homem (R$/h) <span class="text-rose-500">*</span></label>
        <input v-model="form.laborHourlyCost" type="number" min="0" step="0.0001" :class="inputClass('laborHourlyCost')" />
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">O tempo é informado no orçamento (custo = R$/h × tempo).</p>
        <p v-if="errors['laborHourlyCost']" class="mt-1 text-xs text-rose-600">{{ errors['laborHourlyCost'] }}</p>
      </div>

      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Grupo de insumo consumido</label>
        <select v-model="form.supplyGroupId" class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
          <option :value="null">— Nenhum —</option>
          <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.value }}</option>
        </select>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">O insumo específico e a quantidade são escolhidos no orçamento.</p>
      </div>
    </div>

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
