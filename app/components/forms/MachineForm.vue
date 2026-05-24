<script setup lang="ts">
/**
 * Formulário unificado de máquina: parte comum (identificação, formato,
 * pinça, alimentação, custo-hora) + um bloco específico renderizado conforme
 * o `machineType`. O seletor de tipo oferece apenas os tipos da categoria; em
 * edição o tipo fica bloqueado (trocá-lo retornaria 409 na API).
 *
 * Dimensões são editadas e enviadas em milímetros (cf. guia). O formato é
 * largura × comprimento (não há altura). A alimentação por pilha só aparece —
 * e só é enviada — nas máquinas que a utilizam (cf. machineUsesFeeder).
 */
import { computed, reactive, ref, watch } from 'vue'
import type { FoldingBlock, Machine, MachineCategory, MachineRequest, MachineType } from '@/types/Machine'
import {
  MACHINE_TYPE_BLOCK_KEY,
  MACHINE_TYPE_LABELS,
  SPECIFIC_FIELDS,
  categoryMetaByCategory,
  defaultSpecificBlock,
  isCustomBlock,
  machineUsesFeeder,
  validateDescriptors,
  validateFolding,
} from '@/utils/machineCatalog'
import SpecificFields from '@/components/forms/machines/SpecificFields.vue'
import FoldingBlockFields from '@/components/forms/machines/FoldingBlock.vue'
import { useUnitConverter } from '@/composables/useUnitConverter'

const props = defineProps<{
  category: MachineCategory
  initial?: Machine | null
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: MachineRequest, mode: 'create' | 'update'): void
  (e: 'cancel'): void
}>()

const meta = categoryMetaByCategory(props.category)!
const availableTypes = meta.types
const isEditing = computed(() => !!props.initial)

// Dimensões são editadas na unidade da empresa ativa e convertidas para mm no
// envio (cf. página de cadastro de papel). Os campos *Mm do form guardam o
// valor já na unidade do usuário; o canônico em mm só existe no payload.
const { suffix, fromMillimeters, toMillimeters } = useUnitConverter()

const form = reactive({
  name: '',
  machineType: (props.initial?.machineType ?? availableTypes[0]) as MachineType,
  formatRange: { minWidthMm: 0, maxWidthMm: 0, minLengthMm: 0, maxLengthMm: 0 },
  gripMargins: { gripMm: 0 },
  paperFeeder: { maxStackHeightMm: 0 },
  hourlyCost: 0,
  active: true,
})

const specific = ref<Record<string, unknown>>(defaultSpecificBlock(form.machineType))
const foldingBlock = computed(() => specific.value as unknown as FoldingBlock)
const descriptors = computed(() => SPECIFIC_FIELDS[form.machineType] ?? [])
const showsFeeder = computed(() => machineUsesFeeder(form.machineType, specific.value))

const commonErrors = ref<Record<string, string>>({})
const specificErrors = ref<Record<string, string>>({})

if (props.initial) hydrate(props.initial)

function hydrate(machine: Machine) {
  form.name = machine.name
  form.machineType = machine.machineType
  form.formatRange = {
    minWidthMm: fromMillimeters(machine.formatRange.minWidth.millimeters) ?? 0,
    maxWidthMm: fromMillimeters(machine.formatRange.maxWidth.millimeters) ?? 0,
    minLengthMm: fromMillimeters(machine.formatRange.minLength.millimeters) ?? 0,
    maxLengthMm: fromMillimeters(machine.formatRange.maxLength.millimeters) ?? 0,
  }
  form.gripMargins = { gripMm: fromMillimeters(machine.gripMargins.gripMm) ?? 0 }
  form.paperFeeder = {
    maxStackHeightMm: machine.paperFeeder ? (fromMillimeters(machine.paperFeeder.maxStackHeightMm) ?? 0) : 0,
  }
  form.hourlyCost = machine.hourlyCost
  form.active = machine.active
  const block = machine[MACHINE_TYPE_BLOCK_KEY[machine.machineType]]
  specific.value = block
    ? (JSON.parse(JSON.stringify(block)) as Record<string, unknown>)
    : defaultSpecificBlock(machine.machineType)
}

// Troca de tipo (apenas criação): zera o bloco específico e seus erros.
watch(
  () => form.machineType,
  (next) => {
    if (isEditing.value) return
    specific.value = defaultSpecificBlock(next)
    specificErrors.value = {}
  },
)

const inputClass = (errKey: string) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  commonErrors.value[errKey] ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]

function validateCommon(): Record<string, string> {
  const e: Record<string, string> = {}
  const name = form.name.trim()
  if (!name) e['name'] = 'Informe o nome.'
  else if (name.length > 150) e['name'] = 'Máximo de 150 caracteres.'

  const fr = form.formatRange
  if (fr.minWidthMm < 0) e['formatRange.minWidthMm'] = 'Valor mínimo: 0.'
  if (fr.minLengthMm < 0) e['formatRange.minLengthMm'] = 'Valor mínimo: 0.'
  if (fr.maxWidthMm < fr.minWidthMm) e['formatRange.maxWidthMm'] = 'Deve ser ≥ largura mínima.'
  if (fr.maxLengthMm < fr.minLengthMm) e['formatRange.maxLengthMm'] = 'Deve ser ≥ comprimento mínimo.'

  if (form.gripMargins.gripMm < 0) e['gripMargins.gripMm'] = 'Valor mínimo: 0.'
  if (showsFeeder.value && form.paperFeeder.maxStackHeightMm < 0) e['paperFeeder.maxStackHeightMm'] = 'Valor mínimo: 0.'
  if (form.hourlyCost < 0) e['hourlyCost'] = 'Valor mínimo: 0.'
  return e
}

const handleSubmit = () => {
  commonErrors.value = validateCommon()
  specificErrors.value = isCustomBlock(form.machineType)
    ? validateFolding(foldingBlock.value)
    : validateDescriptors(specific.value, descriptors.value)

  if (Object.keys(commonErrors.value).length || Object.keys(specificErrors.value).length) return

  const payload = {
    customerId: 0,
    machineType: form.machineType,
    name: form.name.trim(),
    formatRange: {
      minWidthMm: toMillimeters(form.formatRange.minWidthMm) ?? 0,
      maxWidthMm: toMillimeters(form.formatRange.maxWidthMm) ?? 0,
      minLengthMm: toMillimeters(form.formatRange.minLengthMm) ?? 0,
      maxLengthMm: toMillimeters(form.formatRange.maxLengthMm) ?? 0,
    },
    gripMargins: { gripMm: toMillimeters(form.gripMargins.gripMm) ?? 0 },
    hourlyCost: form.hourlyCost,
  } as MachineRequest
  // Alimentação por pilha só é enviada nas máquinas que a utilizam.
  if (showsFeeder.value) {
    payload.paperFeeder = { maxStackHeightMm: toMillimeters(form.paperFeeder.maxStackHeightMm) ?? 0 }
  }
  ;(payload as unknown as Record<string, unknown>)[MACHINE_TYPE_BLOCK_KEY[form.machineType]] = specific.value
  if (isEditing.value) payload.active = form.active

  emit('submit', payload, isEditing.value ? 'update' : 'create')
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Identificação -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Tipo de máquina <span class="text-rose-500">*</span>
        </label>
        <select
          v-model="form.machineType"
          :disabled="isEditing"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        >
          <option v-for="type in availableTypes" :key="type" :value="type">{{ MACHINE_TYPE_LABELS[type] }}</option>
        </select>
        <p v-if="isEditing" class="mt-1 text-xs text-slate-500 dark:text-slate-400">O tipo não pode ser alterado.</p>
      </div>
      <div class="md:col-span-2">
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Nome <span class="text-rose-500">*</span>
        </label>
        <input
          v-model="form.name"
          type="text"
          maxlength="150"
          placeholder="Ex.: Heidelberg GTO 52"
          :class="inputClass('name')"
        />
        <p v-if="commonErrors['name']" class="mt-1 text-xs text-rose-600">{{ commonErrors['name'] }}</p>
      </div>
    </div>

    <!-- Formato de papel -->
    <fieldset class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Formato de papel ({{ suffix }})</legend>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">Faixa de tamanho aceita — largura × comprimento. Para máquinas sem conceito de formato, deixe zeros.</p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Largura mín.</label>
          <div class="relative">
            <input v-model.number="form.formatRange.minWidthMm" type="number" min="0" step="0.001" :class="[inputClass('formatRange.minWidthMm'), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}</span>
          </div>
          <p v-if="commonErrors['formatRange.minWidthMm']" class="mt-1 text-xs text-rose-600">{{ commonErrors['formatRange.minWidthMm'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Largura máx.</label>
          <div class="relative">
            <input v-model.number="form.formatRange.maxWidthMm" type="number" min="0" step="0.001" :class="[inputClass('formatRange.maxWidthMm'), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}</span>
          </div>
          <p v-if="commonErrors['formatRange.maxWidthMm']" class="mt-1 text-xs text-rose-600">{{ commonErrors['formatRange.maxWidthMm'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Comprimento mín.</label>
          <div class="relative">
            <input v-model.number="form.formatRange.minLengthMm" type="number" min="0" step="0.001" :class="[inputClass('formatRange.minLengthMm'), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}</span>
          </div>
          <p v-if="commonErrors['formatRange.minLengthMm']" class="mt-1 text-xs text-rose-600">{{ commonErrors['formatRange.minLengthMm'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Comprimento máx.</label>
          <div class="relative">
            <input v-model.number="form.formatRange.maxLengthMm" type="number" min="0" step="0.001" :class="[inputClass('formatRange.maxLengthMm'), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}</span>
          </div>
          <p v-if="commonErrors['formatRange.maxLengthMm']" class="mt-1 text-xs text-rose-600">{{ commonErrors['formatRange.maxLengthMm'] }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Pinça + Alimentação -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <fieldset class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Pinça</legend>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Margem de pinça ({{ suffix }})</label>
          <input v-model.number="form.gripMargins.gripMm" type="number" min="0" step="0.001" :class="inputClass('gripMargins.gripMm')" />
          <p v-if="commonErrors['gripMargins.gripMm']" class="mt-1 text-xs text-rose-600">{{ commonErrors['gripMargins.gripMm'] }}</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Puxa-se sempre pelo lado maior.</p>
        </div>
      </fieldset>

      <fieldset v-if="showsFeeder" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Alimentação</legend>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Altura máx. de pilha ({{ suffix }})</label>
          <input v-model.number="form.paperFeeder.maxStackHeightMm" type="number" min="0" step="0.001" :class="inputClass('paperFeeder.maxStackHeightMm')" />
          <p v-if="commonErrors['paperFeeder.maxStackHeightMm']" class="mt-1 text-xs text-rose-600">{{ commonErrors['paperFeeder.maxStackHeightMm'] }}</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">A máquina aguenta a carga total da altura cadastrada.</p>
        </div>
      </fieldset>
    </div>

    <!-- Custo-hora -->
    <fieldset class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Custo-Hora Máquina</legend>
      <div class="max-w-xs">
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Custo por hora (R$)</label>
        <div class="relative">
          <span class="absolute inset-y-0 left-3 flex items-center text-xs text-slate-500">R$</span>
          <input v-model.number="form.hourlyCost" type="number" min="0" step="0.0001" :class="[inputClass('hourlyCost'), 'pl-9']" />
        </div>
        <p v-if="commonErrors['hourlyCost']" class="mt-1 text-xs text-rose-600">{{ commonErrors['hourlyCost'] }}</p>
      </div>
    </fieldset>

    <!-- Bloco específico -->
    <fieldset class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {{ MACHINE_TYPE_LABELS[form.machineType] }}
      </legend>
      <FoldingBlockFields v-if="isCustomBlock(form.machineType)" :block="foldingBlock" :errors="specificErrors" />
      <SpecificFields v-else :block="specific" :descriptors="descriptors" :errors="specificErrors" />
    </fieldset>

    <label v-if="isEditing" class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <input v-model="form.active" type="checkbox" class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600" />
      Máquina ativa
    </label>

    <div
      v-if="serverError"
      class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300"
    >
      {{ serverError }}
    </div>

    <div class="flex justify-end gap-3 pt-2">
      <button
        type="button"
        @click="emit('cancel')"
        class="text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
      >
        Cancelar
      </button>
      <button
        type="submit"
        :disabled="loading"
        class="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed font-medium rounded-lg text-sm px-5 py-2.5 shadow-md shadow-indigo-500/20"
      >
        {{ loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar máquina' }}
      </button>
    </div>
  </form>
</template>
