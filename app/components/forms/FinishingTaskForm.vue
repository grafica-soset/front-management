<script setup lang="ts">
/**
 * Formulário de TAREFA DE ACABAMENTO (atividade 029): tipo (imutável na edição) + nome + valor-hora
 * + campos específicos do tipo (descritos em TYPE_FIELDS). Autocontido: recebe dados por prop e
 * emite o payload validado.
 */
import { computed, reactive, ref, watch } from 'vue'
import type {
  CollationTier,
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
import { useUnitConverter } from '@/composables/useUnitConverter'

interface FieldDescriptor {
  key: string
  label: string
  min: number
  /** true = inteiro (step 1); false = decimal. */
  integer?: boolean
  /** valor decimal enviado como string (preserva precisão). */
  asString?: boolean
  /** dimensão física: digitada/exibida na unidade da empresa, armazenada em mm. */
  dimension?: boolean
}

const { fromMillimeters, toMillimeters, suffix } = useUnitConverter()

// Campos de configuração por tipo de acabamento.
const TYPE_FIELDS: Record<FinishingTaskType, FieldDescriptor[]> = {
  FOLD_TURNING: [{ key: 'foldTurnSecondsPerUnit', label: 'Tempo por unidade (segundos)', min: 1, integer: true }],
  PACKAGING: [
    { key: 'packagingMinutesPerPackage', label: 'Tempo por pacote (minutos)', min: 1, integer: true },
    { key: 'packagingPackageWeightKg', label: 'Peso do pacote (kg)', min: 0.0001, asString: true },
  ],
  SPIRAL_BINDING: [
    { key: 'spiralMinLengthMm', label: 'Tamanho mínimo', min: 0.01, dimension: true },
    { key: 'spiralMinTimeSeconds', label: 'Tempo no tamanho mínimo (segundos)', min: 0, integer: true },
    { key: 'spiralMaxLengthMm', label: 'Tamanho máximo', min: 0.01, dimension: true },
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
  // Intercalação de Vias não tem campos escalares — usa a lista de posições (collationTiers).
  COLLATION: [],
}

const ALL_FIELDS = Object.values(TYPE_FIELDS).flat()
const ALL_KEYS = ALL_FIELDS.map((f) => f.key)
const DIMENSION_KEYS = new Set(ALL_FIELDS.filter((f) => f.dimension).map((f) => f.key))

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

// Config como strings (vindas dos inputs); '' = vazio. Dimensões vêm do backend em mm e são
// exibidas na unidade da empresa.
const config = reactive<Record<string, string>>(
  Object.fromEntries(ALL_KEYS.map((k) => {
    const v = (props.initial as Record<string, unknown> | null | undefined)?.[k]
    if (v == null) return [k, '']
    if (DIMENSION_KEYS.has(k)) return [k, String(fromMillimeters(Number(v)) ?? '')]
    return [k, String(v)]
  })),
)

const errors = ref<Record<string, string>>({})
const currentFields = computed(() => TYPE_FIELDS[form.type])
const isCollation = computed(() => form.type === 'COLLATION')

// Posições da Intercalação de Vias (qtd de vias → tempo/jogo por jogo).
const tiers = ref<CollationTier[]>(
  (props.initial?.collationTiers ?? []).map((t) => ({ viaCount: t.viaCount, secondsPerSet: t.secondsPerSet })),
)

const addTier = () => {
  const nextVia = tiers.value.length ? Math.max(...tiers.value.map((t) => t.viaCount)) + 1 : 2
  tiers.value.push({ viaCount: nextVia, secondsPerSet: 0 })
}
const removeTier = (i: number) => { tiers.value.splice(i, 1) }

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
  if (form.type === 'SPIRAL_BINDING' && !e['spiralMaxLengthMm'] && !e['spiralMinLengthMm']) {
    if (Number(config.spiralMaxLengthMm) < Number(config.spiralMinLengthMm)) {
      e['spiralMaxLengthMm'] = 'O tamanho máximo deve ser ≥ o mínimo.'
    }
  }
  // Intercalação de Vias: ao menos uma posição, vias ≥ 2, tempo > 0, sem quantidades repetidas.
  if (isCollation.value) {
    if (tiers.value.length === 0) e['collationTiers'] = 'Adicione ao menos uma posição.'
    else {
      const counts = tiers.value.map((t) => Number(t.viaCount))
      if (tiers.value.some((t) => Number(t.viaCount) < 2 || Number(t.secondsPerSet) <= 0)) {
        e['collationTiers'] = 'Cada posição precisa de vias ≥ 2 e tempo > 0.'
      } else if (counts.length !== new Set(counts).size) {
        e['collationTiers'] = 'Não repita a mesma quantidade de vias.'
      }
    }
  }
  return e
}

const handleSubmit = () => {
  errors.value = validate()
  if (Object.keys(errors.value).length) return

  // Só os campos do tipo atual entram no payload (o backend rejeita vazamento de outros tipos).
  const typeConfig: Record<string, unknown> = {}
  for (const f of currentFields.value) {
    const raw = config[f.key] ?? ''
    if (f.dimension) typeConfig[f.key] = toMillimeters(Number(raw)) ?? 0
    else typeConfig[f.key] = f.asString ? raw : Number(raw)
  }
  if (isCollation.value) {
    typeConfig.collationTiers = tiers.value.map((t) => ({
      viaCount: Number(t.viaCount),
      secondsPerSet: Number(t.secondsPerSet),
    }))
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
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">{{ f.label }}<span v-if="f.dimension" class="font-normal text-slate-500"> ({{ suffix }})</span> <span class="text-rose-500">*</span></label>
        <input v-model="config[f.key]" type="number" :min="f.min" :step="f.integer ? '1' : 'any'" :class="inputClass(f.key)" />
        <p v-if="errors[f.key]" class="mt-1 text-xs text-rose-600">{{ errors[f.key] }}</p>
      </div>
    </div>

    <!-- Intercalação de Vias: lista de posições (qtd de vias → tempo/jogo) -->
    <fieldset v-if="isCollation" class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <div class="flex items-center justify-between mb-2">
        <legend class="text-sm font-semibold text-slate-700 dark:text-slate-200">Posições (vias → tempo por jogo)</legend>
        <button type="button" @click="addTier" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 dark:text-indigo-300 dark:bg-slate-700 dark:hover:bg-slate-600">
          + Adicionar posição
        </button>
      </div>
      <div v-if="tiers.length === 0" class="text-xs text-slate-500 dark:text-slate-400">Nenhuma posição — adicione ao menos uma.</div>
      <div v-for="(t, i) in tiers" :key="i" class="flex items-end gap-3 py-1.5">
        <div class="w-32">
          <label class="block mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">Qtd de vias</label>
          <input v-model.number="t.viaCount" type="number" min="2" step="1"
            class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
        </div>
        <div class="flex-1">
          <label class="block mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">Tempo por jogo (segundos)</label>
          <input v-model.number="t.secondsPerSet" type="number" min="1" step="1"
            class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
        </div>
        <button type="button" @click="removeTier(i)" class="px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md dark:text-rose-300 dark:hover:bg-slate-700">Remover</button>
      </div>
      <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">No orçamento, se a quantidade de vias pedida não tiver posição, usa-se a maior cadastrada.</p>
      <p v-if="errors['collationTiers']" class="mt-1 text-xs text-rose-600">{{ errors['collationTiers'] }}</p>
    </fieldset>

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
