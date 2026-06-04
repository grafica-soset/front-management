<script setup lang="ts">
/**
 * Formulário da impressora OFFSET: identificação + formato de papel + margens
 * (pinça e limite de mancha) + alimentação + custo-hora + bloco offset (Rampa de Velocidade).
 *
 * Recebe os dados iniciais via prop `initial` (edição) e emite o payload
 * validado em `@submit`. O formato de papel é editado na unidade da empresa
 * ativa e convertido para milímetros no envio (a API persiste sempre em mm).
 */
import { computed, reactive, ref } from 'vue'
import type { Machine, MachineRequest, OffsetBlock } from '@/types/Machine'
import { MACHINE_TYPE_LABELS, defaultOffsetBlock, hydrateOffsetBlock, validateOffset } from '@/utils/machineCatalog'
import OffsetBlockFields from '@/components/forms/machines/OffsetBlock.vue'
import { useUnitConverter } from '@/composables/useUnitConverter'

const props = defineProps<{
  /** Dados para pré-preencher o formulário (edição ou duplicação). */
  initial?: Machine | null
  /** 'edit' → PUT (mostra "ativa"); 'create' → POST, mesmo com `initial` (duplicação). */
  mode?: 'create' | 'edit'
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: MachineRequest, mode: 'create' | 'update'): void
  (e: 'cancel'): void
}>()

const isEditing = computed(() => props.mode === 'edit')

// O formato é exibido/editado na unidade da empresa e convertido p/ mm no envio.
const { suffix, fromMillimeters, toMillimeters } = useUnitConverter()

const form = reactive({
  name: '',
  // Dimensões na unidade da empresa (convertidas para mm no submit).
  formatRange: { minWidth: 0, maxWidth: 0, minLength: 0, maxLength: 0 },
  grip: 0,
  // Limite máximo de mancha (borda não imprimível), na unidade da empresa.
  maxImageMargin: 0,
  maxStackHeight: 0,
  // Custo-hora como string decimal (R$).
  hourlyCost: '0',
  active: true,
})

const offset = reactive<OffsetBlock>(defaultOffsetBlock())

const commonErrors = ref<Record<string, string>>({})
const offsetErrors = ref<Record<string, string>>({})

if (props.initial) hydrate(props.initial)

function hydrate(machine: Machine) {
  form.name = machine.name
  form.formatRange = {
    minWidth: fromMillimeters(machine.formatRange.minWidth.millimeters) ?? 0,
    maxWidth: fromMillimeters(machine.formatRange.maxWidth.millimeters) ?? 0,
    minLength: fromMillimeters(machine.formatRange.minLength.millimeters) ?? 0,
    maxLength: fromMillimeters(machine.formatRange.maxLength.millimeters) ?? 0,
  }
  form.grip = fromMillimeters(machine.gripMargins.gripMm) ?? 0
  form.maxImageMargin = fromMillimeters(machine.gripMargins.maxImageMarginMm) ?? 0
  form.maxStackHeight = fromMillimeters(machine.paperFeeder?.maxStackHeightMm ?? 0) ?? 0
  form.hourlyCost = String(machine.hourlyCost)
  form.active = machine.active
  Object.assign(offset, hydrateOffsetBlock(machine.offset ?? defaultOffsetBlock()))
}

const inputClass = (errKey: string) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  commonErrors.value[errKey] ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]

function validateCommon(): Record<string, string> {
  const e: Record<string, string> = {}
  const name = form.name.trim()
  if (!name) e['name'] = 'Informe o nome.'
  else if (name.length > 150) e['name'] = 'Máximo de 150 caracteres.'

  const fr = form.formatRange
  if (fr.minWidth < 0) e['formatRange.minWidth'] = 'Valor mínimo: 0.'
  if (fr.minLength < 0) e['formatRange.minLength'] = 'Valor mínimo: 0.'
  if (fr.maxWidth < fr.minWidth) e['formatRange.maxWidth'] = 'Deve ser ≥ largura mínima.'
  if (fr.maxLength < fr.minLength) e['formatRange.maxLength'] = 'Deve ser ≥ comprimento mínimo.'

  if (form.grip < 0) e['grip'] = 'Valor mínimo: 0.'
  if (form.maxImageMargin < 0) e['maxImageMargin'] = 'Valor mínimo: 0.'
  if (form.maxStackHeight < 0) e['maxStackHeight'] = 'Valor mínimo: 0.'

  const cost = Number(form.hourlyCost)
  if (!Number.isFinite(cost) || cost < 0) e['hourlyCost'] = 'Informe um custo-hora válido (≥ 0).'
  return e
}

const handleSubmit = () => {
  commonErrors.value = validateCommon()
  offsetErrors.value = validateOffset(offset)

  if (Object.keys(commonErrors.value).length || Object.keys(offsetErrors.value).length) return

  const payload: MachineRequest = {
    customerId: 0,
    machineType: 'OFFSET',
    name: form.name.trim(),
    formatRange: {
      minWidthMm: toMillimeters(form.formatRange.minWidth) ?? 0,
      maxWidthMm: toMillimeters(form.formatRange.maxWidth) ?? 0,
      minLengthMm: toMillimeters(form.formatRange.minLength) ?? 0,
      maxLengthMm: toMillimeters(form.formatRange.maxLength) ?? 0,
    },
    gripMargins: {
      gripMm: toMillimeters(form.grip) ?? 0,
      maxImageMarginMm: toMillimeters(form.maxImageMargin) ?? 0,
    },
    paperFeeder: { maxStackHeightMm: toMillimeters(form.maxStackHeight) ?? 0 },
    hourlyCost: String(form.hourlyCost),
    offset: JSON.parse(JSON.stringify(offset)) as OffsetBlock,
  }
  if (isEditing.value) payload.active = form.active

  emit('submit', payload, isEditing.value ? 'update' : 'create')
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Identificação -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Tipo de máquina</label>
        <input
          :value="MACHINE_TYPE_LABELS.OFFSET"
          type="text"
          readonly
          tabindex="-1"
          class="bg-slate-100 border border-slate-200 text-slate-700 text-sm rounded-lg block w-full p-3 cursor-not-allowed dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-300"
        />
      </div>
      <div class="md:col-span-2">
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Nome <span class="text-rose-500">*</span>
        </label>
        <input
          v-model="form.name"
          type="text"
          maxlength="150"
          placeholder="Ex.: Sakurai 58 Monocolor"
          :class="inputClass('name')"
        />
        <p v-if="commonErrors['name']" class="mt-1 text-xs text-rose-600">{{ commonErrors['name'] }}</p>
      </div>
    </div>

    <!-- Formato de papel -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Formato de papel ({{ suffix }})</legend>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">Faixa de tamanho aceita — largura × comprimento.</p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Largura mín.</label>
          <div class="relative">
            <input v-model.number="form.formatRange.minWidth" type="number" min="0" step="0.001" :class="[inputClass('formatRange.minWidth'), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}</span>
          </div>
          <p v-if="commonErrors['formatRange.minWidth']" class="mt-1 text-xs text-rose-600">{{ commonErrors['formatRange.minWidth'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Largura máx.</label>
          <div class="relative">
            <input v-model.number="form.formatRange.maxWidth" type="number" min="0" step="0.001" :class="[inputClass('formatRange.maxWidth'), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}</span>
          </div>
          <p v-if="commonErrors['formatRange.maxWidth']" class="mt-1 text-xs text-rose-600">{{ commonErrors['formatRange.maxWidth'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Comprimento mín.</label>
          <div class="relative">
            <input v-model.number="form.formatRange.minLength" type="number" min="0" step="0.001" :class="[inputClass('formatRange.minLength'), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}</span>
          </div>
          <p v-if="commonErrors['formatRange.minLength']" class="mt-1 text-xs text-rose-600">{{ commonErrors['formatRange.minLength'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Comprimento máx.</label>
          <div class="relative">
            <input v-model.number="form.formatRange.maxLength" type="number" min="0" step="0.001" :class="[inputClass('formatRange.maxLength'), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}</span>
          </div>
          <p v-if="commonErrors['formatRange.maxLength']" class="mt-1 text-xs text-rose-600">{{ commonErrors['formatRange.maxLength'] }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Pinça + Alimentação + Custo-hora -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
        <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Margens</legend>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Margem da pinça ({{ suffix }})</label>
        <input v-model.number="form.grip" type="number" min="0" step="0.001" :class="inputClass('grip')" />
        <p v-if="commonErrors['grip']" class="mt-1 text-xs text-rose-600">{{ commonErrors['grip'] }}</p>

        <label class="block mt-3 mb-2 text-sm text-slate-700 dark:text-slate-300">Limite máximo de mancha ({{ suffix }})</label>
        <input v-model.number="form.maxImageMargin" type="number" min="0" step="0.001" :class="inputClass('maxImageMargin')" />
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Borda não imprimível entre a máquina e o papel. Quanto maior, menor a área de impressão.</p>
        <p v-if="commonErrors['maxImageMargin']" class="mt-1 text-xs text-rose-600">{{ commonErrors['maxImageMargin'] }}</p>
      </fieldset>

      <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
        <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Alimentação</legend>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Altura máx. da pilha ({{ suffix }})</label>
        <input v-model.number="form.maxStackHeight" type="number" min="0" step="0.001" :class="inputClass('maxStackHeight')" />
        <p v-if="commonErrors['maxStackHeight']" class="mt-1 text-xs text-rose-600">{{ commonErrors['maxStackHeight'] }}</p>
      </fieldset>

      <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
        <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Custo-Hora Máquina</legend>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Valor (R$/hora)</label>
        <input v-model="form.hourlyCost" type="number" min="0" step="0.01" :class="inputClass('hourlyCost')" />
        <p v-if="commonErrors['hourlyCost']" class="mt-1 text-xs text-rose-600">{{ commonErrors['hourlyCost'] }}</p>
      </fieldset>
    </div>

    <!-- Bloco offset -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{{ MACHINE_TYPE_LABELS.OFFSET }}</legend>
      <OffsetBlockFields :block="offset" :errors="offsetErrors" />
    </fieldset>

    <label v-if="isEditing" class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <input v-model="form.active" type="checkbox" class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600" />
      Máquina ativa
    </label>

    <div
      v-if="serverError"
      class="whitespace-pre-line rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300"
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
