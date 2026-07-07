<script setup lang="ts">
/**
 * Formulário de TAREFA DE ACABAMENTO (atividade 029): tipo (imutável na edição) + nome + valor-hora
 * + campos específicos do tipo (descritos em TYPE_FIELDS). Autocontido: recebe dados por prop e
 * emite o payload validado.
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

interface FieldDescriptor {
  key: string
  label: string
  min: number
  /** true = inteiro (step 1); false = decimal. */
  integer?: boolean
  /** valor decimal enviado como string (preserva precisão). */
  asString?: boolean
}

// Campos de configuração por tipo de acabamento.
const TYPE_FIELDS: Record<FinishingTaskType, FieldDescriptor[]> = {
  FOLD_TURNING: [{ key: 'foldTurnSecondsPerUnit', label: 'Tempo por unidade (segundos)', min: 1, integer: true }],
  PACKAGING: [
    { key: 'packagingMinutesPerPackage', label: 'Tempo por pacote (minutos)', min: 1, integer: true },
    { key: 'packagingPackageWeightKg', label: 'Peso do pacote (kg)', min: 0.0001, asString: true },
  ],
  SPIRAL_BINDING: [
    { key: 'spiralMinLengthCm', label: 'Tamanho mínimo (cm)', min: 1, integer: true },
    { key: 'spiralMinTimeSeconds', label: 'Tempo no tamanho mínimo (segundos)', min: 0, integer: true },
    { key: 'spiralMaxLengthCm', label: 'Tamanho máximo (cm)', min: 1, integer: true },
    { key: 'spiralMaxTimeSeconds', label: 'Tempo no tamanho máximo (segundos)', min: 0, integer: true },
  ],
  BLOCK_GLUING: [
    { key: 'blockStackingTimeSeconds', label: 'Tempo de empilhamento (segundos)', min: 0, integer: true },
    { key: 'blockApplicationTimeSeconds', label: 'Tempo de aplicação (segundos)', min: 0, integer: true },
  ],
  BAG_APPLICATION: [
    { key: 'bagFoldTurnSecondsPerUnit', label: 'Viragem da dobra por unidade (segundos)', min: 0, integer: true },
    { key: 'bagGlueSecondsPerUnit', label: 'Aplicação de cola por unidade (segundos)', min: 0, integer: true },
    { key: 'bagCloseSecondsPerUnit', label: 'Fechamento por unidade (segundos)', min: 0, integer: true },
  ],
  ENVELOPE_SEALING: [
    { key: 'envelopeFoldTurnSecondsPerUnit', label: 'Viragem da dobra por unidade (segundos)', min: 0, integer: true },
    { key: 'envelopeGlueSecondsPerUnit', label: 'Aplicação de cola por unidade (segundos)', min: 0, integer: true },
    { key: 'envelopeCloseSecondsPerUnit', label: 'Fechamento por unidade (segundos)', min: 0, integer: true },
  ],
}

const ALL_KEYS = Object.values(TYPE_FIELDS).flat().map((f) => f.key)

const props = defineProps<{
  initial?: FinishingTask | null
  mode?: 'create' | 'edit'
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
  active: props.initial?.active ?? true,
})

// Config como strings (vindas dos inputs); '' = vazio.
const config = reactive<Record<string, string>>(
  Object.fromEntries(ALL_KEYS.map((k) => {
    const v = (props.initial as Record<string, unknown> | null | undefined)?.[k]
    return [k, v != null ? String(v) : '']
  })),
)

const errors = ref<Record<string, string>>({})
const currentFields = computed(() => TYPE_FIELDS[form.type])

const inputClass = (errKey: string) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  errors.value[errKey] ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]

function validate(): Record<string, string> {
  const e: Record<string, string> = {}
  if (!form.name.trim()) e['name'] = 'Informe o nome.'
  const cost = Number(form.hourlyCost)
  if (!Number.isFinite(cost) || cost < 0) e['hourlyCost'] = 'Informe o valor-hora (≥ 0).'

  for (const f of currentFields.value) {
    const raw = config[f.key]
    const n = Number(raw)
    if (raw === '' || !Number.isFinite(n) || n < f.min) {
      e[f.key] = `Informe um valor válido (≥ ${f.min}).`
    }
  }
  // Regra específica do espiral: máximo ≥ mínimo.
  if (form.type === 'SPIRAL_BINDING' && !e['spiralMaxLengthCm'] && !e['spiralMinLengthCm']) {
    if (Number(config.spiralMaxLengthCm) < Number(config.spiralMinLengthCm)) {
      e['spiralMaxLengthCm'] = 'O tamanho máximo deve ser ≥ o mínimo.'
    }
  }
  return e
}

const handleSubmit = () => {
  errors.value = validate()
  if (Object.keys(errors.value).length) return

  // Só os campos do tipo atual entram no payload (o backend rejeita vazamento de outros tipos).
  const typeConfig: Record<string, number | string> = {}
  for (const f of currentFields.value) {
    const raw = config[f.key] ?? ''
    typeConfig[f.key] = f.asString ? raw : Number(raw)
  }

  if (isEditing.value) {
    emit('submit', { customerId: 0, name: form.name.trim(), hourlyCost: form.hourlyCost, active: form.active, ...typeConfig }, 'update')
  } else {
    emit('submit', { customerId: 0, type: form.type, name: form.name.trim(), hourlyCost: form.hourlyCost, ...typeConfig }, 'create')
  }
}

// Ao trocar o tipo (na criação), limpa os erros dos campos que saíram de cena.
watch(() => form.type, () => { errors.value = {} })
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
        <input v-model="form.name" type="text" maxlength="150" placeholder="Ex.: Aplicação de Espiral" :class="inputClass('name')" />
        <p v-if="errors['name']" class="mt-1 text-xs text-rose-600">{{ errors['name'] }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Valor-hora (R$/h) <span class="text-rose-500">*</span></label>
        <input v-model="form.hourlyCost" type="number" min="0" step="0.01" :class="inputClass('hourlyCost')" />
        <p v-if="errors['hourlyCost']" class="mt-1 text-xs text-rose-600">{{ errors['hourlyCost'] }}</p>
      </div>
    </div>

    <!-- Campos específicos do tipo (genéricos por descritor) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="f in currentFields" :key="f.key">
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">{{ f.label }} <span class="text-rose-500">*</span></label>
        <input v-model="config[f.key]" type="number" :min="f.min" :step="f.integer ? '1' : '0.01'" :class="inputClass(f.key)" />
        <p v-if="errors[f.key]" class="mt-1 text-xs text-rose-600">{{ errors[f.key] }}</p>
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
