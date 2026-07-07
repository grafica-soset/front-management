<script setup lang="ts">
/**
 * Formulário de TAREFA DE ACABAMENTO (atividade 029): tipo (imutável na edição) + nome + valor-hora
 * + campos específicos do tipo. Autocontido: recebe dados por prop e emite o payload validado.
 */
import { computed, reactive, ref, watch } from 'vue'
import type {
  CreateFinishingTaskRequest,
  FinishingTask,
  FinishingTaskType,
  UpdateFinishingTaskRequest,
} from '@/types/FinishingTask'
import {
  FINISHING_TASK_TYPES,
  FINISHING_TASK_TYPE_HINTS,
  FINISHING_TASK_TYPE_LABELS,
} from '@/utils/finishingTaskCatalog'

const props = defineProps<{
  initial?: FinishingTask | null
  mode?: 'create' | 'edit'
  /** Tipo pré-selecionado ao criar (vindo do menu). */
  presetType?: FinishingTaskType
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: CreateFinishingTaskRequest | UpdateFinishingTaskRequest, mode: 'create' | 'update'): void
  (e: 'cancel'): void
}>()

const isEditing = computed(() => props.mode === 'edit')

const form = reactive({
  type: (props.initial?.type ?? props.presetType ?? 'FOLD_TURNING') as FinishingTaskType,
  name: props.initial?.name ?? '',
  hourlyCost: props.initial?.hourlyCost != null ? String(props.initial.hourlyCost) : '0',
  foldTurnSecondsPerUnit: props.initial?.foldTurnSecondsPerUnit ?? null,
  packagingMinutesPerPackage: props.initial?.packagingMinutesPerPackage ?? null,
  packagingPackageWeightKg:
    props.initial?.packagingPackageWeightKg != null ? String(props.initial.packagingPackageWeightKg) : '',
  active: props.initial?.active ?? true,
})

const errors = ref<Record<string, string>>({})

// Ao trocar o tipo (na criação), limpa os campos do outro tipo.
watch(
  () => form.type,
  (t) => {
    if (t !== 'FOLD_TURNING') form.foldTurnSecondsPerUnit = null
    if (t !== 'PACKAGING') {
      form.packagingMinutesPerPackage = null
      form.packagingPackageWeightKg = ''
    }
  },
)

const inputClass = (errKey: string) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  errors.value[errKey] ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]

function validate(): Record<string, string> {
  const e: Record<string, string> = {}
  if (!form.name.trim()) e['name'] = 'Informe o nome.'
  const cost = Number(form.hourlyCost)
  if (!Number.isFinite(cost) || cost < 0) e['hourlyCost'] = 'Informe o valor-hora (≥ 0).'
  if (form.type === 'FOLD_TURNING') {
    if (!form.foldTurnSecondsPerUnit || form.foldTurnSecondsPerUnit <= 0)
      e['foldTurnSecondsPerUnit'] = 'Informe o tempo por unidade (> 0).'
  }
  if (form.type === 'PACKAGING') {
    if (!form.packagingMinutesPerPackage || form.packagingMinutesPerPackage <= 0)
      e['packagingMinutesPerPackage'] = 'Informe o tempo por pacote (> 0).'
    const w = Number(form.packagingPackageWeightKg)
    if (!Number.isFinite(w) || w <= 0) e['packagingPackageWeightKg'] = 'Informe o peso do pacote (> 0).'
  }
  return e
}

const handleSubmit = () => {
  errors.value = validate()
  if (Object.keys(errors.value).length) return

  const typeFields = {
    foldTurnSecondsPerUnit: form.type === 'FOLD_TURNING' ? form.foldTurnSecondsPerUnit : null,
    packagingMinutesPerPackage: form.type === 'PACKAGING' ? form.packagingMinutesPerPackage : null,
    packagingPackageWeightKg: form.type === 'PACKAGING' ? form.packagingPackageWeightKg : null,
  }

  if (isEditing.value) {
    emit(
      'submit',
      { customerId: 0, name: form.name.trim(), hourlyCost: form.hourlyCost, active: form.active, ...typeFields },
      'update',
    )
  } else {
    emit(
      'submit',
      { customerId: 0, type: form.type, name: form.name.trim(), hourlyCost: form.hourlyCost, ...typeFields },
      'create',
    )
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <div>
      <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Tipo de acabamento <span class="text-rose-500">*</span></label>
      <select v-model="form.type" :disabled="isEditing"
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 disabled:opacity-60 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
        <option v-for="t in FINISHING_TASK_TYPES" :key="t" :value="t">{{ FINISHING_TASK_TYPE_LABELS[t] }}</option>
      </select>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ FINISHING_TASK_TYPE_HINTS[form.type] }}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-2">
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Nome <span class="text-rose-500">*</span></label>
        <input v-model="form.name" type="text" maxlength="150" placeholder="Ex.: Viragem de Dobras" :class="inputClass('name')" />
        <p v-if="errors['name']" class="mt-1 text-xs text-rose-600">{{ errors['name'] }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Valor-hora (R$/h) <span class="text-rose-500">*</span></label>
        <input v-model="form.hourlyCost" type="number" min="0" step="0.01" :class="inputClass('hourlyCost')" />
        <p v-if="errors['hourlyCost']" class="mt-1 text-xs text-rose-600">{{ errors['hourlyCost'] }}</p>
      </div>
    </div>

    <!-- Campos específicos do tipo -->
    <div v-if="form.type === 'FOLD_TURNING'">
      <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Tempo por unidade (segundos) <span class="text-rose-500">*</span></label>
      <input v-model.number="form.foldTurnSecondsPerUnit" type="number" min="1" step="1" :class="inputClass('foldTurnSecondsPerUnit')" />
      <p v-if="errors['foldTurnSecondsPerUnit']" class="mt-1 text-xs text-rose-600">{{ errors['foldTurnSecondsPerUnit'] }}</p>
    </div>

    <div v-else-if="form.type === 'PACKAGING'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Tempo por pacote (minutos) <span class="text-rose-500">*</span></label>
        <input v-model.number="form.packagingMinutesPerPackage" type="number" min="1" step="1" :class="inputClass('packagingMinutesPerPackage')" />
        <p v-if="errors['packagingMinutesPerPackage']" class="mt-1 text-xs text-rose-600">{{ errors['packagingMinutesPerPackage'] }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Peso do pacote (kg) <span class="text-rose-500">*</span></label>
        <input v-model="form.packagingPackageWeightKg" type="number" min="0" step="0.01" :class="inputClass('packagingPackageWeightKg')" />
        <p v-if="errors['packagingPackageWeightKg']" class="mt-1 text-xs text-rose-600">{{ errors['packagingPackageWeightKg'] }}</p>
      </div>
    </div>

    <label v-if="isEditing" class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <input v-model="form.active" type="checkbox" class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600" />
      Acabamento ativo
    </label>

    <div v-if="serverError" class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300">
      {{ serverError }}
    </div>

    <div class="flex justify-end gap-3 pt-2">
      <button type="button" @click="emit('cancel')" class="text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700">
        Cancelar
      </button>
      <button type="submit" :disabled="loading" class="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed font-medium rounded-lg text-sm px-5 py-2.5 shadow-md shadow-indigo-500/20">
        {{ loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar acabamento' }}
      </button>
    </div>
  </form>
</template>
