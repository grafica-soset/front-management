<script setup lang="ts">
/**
 * Formulário da IMPRESSORA DIGITAL (categoria PRINTING): identificação + formato de papel +
 * borda neutra + alimentação (altura da pilha) + custo-hora + transporte + bloco digital.
 *
 * A "margem da pinça" aqui se chama BORDA NEUTRA (gripMm). O alimentador é obrigatório. O formato
 * é editado na unidade da empresa e convertido para mm.
 */
import { computed, reactive, ref } from 'vue'
import type { DigitalBlockRequest, DigitalMachine, DigitalMachineRequest } from '@/types/Machine'
import {
  MACHINE_TYPE_LABELS,
  defaultDigitalBlock,
  hydrateDigitalBlock,
  validateDigital,
} from '@/utils/machineCatalog'
import DigitalBlockFields from '@/components/forms/machines/DigitalBlock.vue'
import { useUnitConverter } from '@/composables/useUnitConverter'

const props = defineProps<{
  initial?: DigitalMachine | null
  mode?: 'create' | 'edit'
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: DigitalMachineRequest, mode: 'create' | 'update'): void
  (e: 'cancel'): void
}>()

const isEditing = computed(() => props.mode === 'edit')

const { suffix, fromMillimeters, toMillimeters } = useUnitConverter()

const form = reactive({
  name: '',
  formatRange: { minWidth: 0, maxWidth: 0, minLength: 0, maxLength: 0 },
  gripMm: 0,
  maxStackHeight: 0,
  hourlyCost: '0',
  supplyTransportTimeMinutes: 0,
  active: true,
})

const digital = reactive<DigitalBlockRequest>(defaultDigitalBlock())

const commonErrors = ref<Record<string, string>>({})
const digitalErrors = ref<Record<string, string>>({})

if (props.initial) hydrate(props.initial)

function hydrate(machine: DigitalMachine) {
  form.name = machine.name
  form.formatRange = {
    minWidth: fromMillimeters(machine.formatRange.minWidth.millimeters) ?? 0,
    maxWidth: fromMillimeters(machine.formatRange.maxWidth.millimeters) ?? 0,
    minLength: fromMillimeters(machine.formatRange.minLength.millimeters) ?? 0,
    maxLength: fromMillimeters(machine.formatRange.maxLength.millimeters) ?? 0,
  }
  form.gripMm = fromMillimeters(machine.gripMm) ?? 0
  form.maxStackHeight = fromMillimeters(machine.paperFeeder?.maxStackHeightMm ?? 0) ?? 0
  form.hourlyCost = String(machine.hourlyCost)
  form.supplyTransportTimeMinutes = machine.supplyTransportTimeMinutes ?? 0
  form.active = machine.active
  Object.assign(digital, hydrateDigitalBlock(machine.digital))
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

  if (form.gripMm < 0) e['gripMm'] = 'Valor mínimo: 0.'
  if (!(form.maxStackHeight > 0)) e['maxStackHeight'] = 'Informe a altura máxima da pilha.'

  const cost = Number(form.hourlyCost)
  if (!Number.isFinite(cost) || cost < 0) e['hourlyCost'] = 'Informe um custo-hora válido (≥ 0).'

  if (!(form.supplyTransportTimeMinutes >= 0)) e['supplyTransportTimeMinutes'] = 'Valor mínimo: 0.'
  return e
}

const handleSubmit = () => {
  commonErrors.value = validateCommon()
  digitalErrors.value = validateDigital(digital)

  const minSize = digital.minFormat.widthMm + digital.minFormat.lengthMm
  const maxSize = digital.maxFormat.widthMm + digital.maxFormat.lengthMm
  if (maxSize < minSize) {
    digitalErrors.value['maxFormat.widthMm'] = 'O formato máximo deve ser ≥ o mínimo.'
  }

  if (Object.keys(commonErrors.value).length || Object.keys(digitalErrors.value).length) return

  const payload: DigitalMachineRequest = {
    customerId: 0,
    machineType: 'DIGITAL',
    name: form.name.trim(),
    formatRange: {
      minWidthMm: toMillimeters(form.formatRange.minWidth) ?? 0,
      maxWidthMm: toMillimeters(form.formatRange.maxWidth) ?? 0,
      minLengthMm: toMillimeters(form.formatRange.minLength) ?? 0,
      maxLengthMm: toMillimeters(form.formatRange.maxLength) ?? 0,
    },
    gripMm: toMillimeters(form.gripMm) ?? 0,
    paperFeeder: { maxStackHeightMm: toMillimeters(form.maxStackHeight) ?? 0 },
    hourlyCost: String(form.hourlyCost),
    supplyTransportTimeMinutes: form.supplyTransportTimeMinutes,
    digital: JSON.parse(JSON.stringify(digital)) as DigitalBlockRequest,
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
          :value="MACHINE_TYPE_LABELS.DIGITAL"
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
        <input v-model="form.name" type="text" maxlength="150" placeholder="Ex.: Impressora Digital" :class="inputClass('name')" />
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

    <!-- Borda neutra + Alimentação + Custo/Logística -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
        <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Borda neutra</legend>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Borda neutra ({{ suffix }})</label>
        <div class="relative">
          <input v-model.number="form.gripMm" type="number" min="0" step="0.001" :class="[inputClass('gripMm'), 'pr-12']" />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}</span>
        </div>
        <p v-if="commonErrors['gripMm']" class="mt-1 text-xs text-rose-600">{{ commonErrors['gripMm'] }}</p>
      </fieldset>

      <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
        <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Alimentação</legend>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Altura máx. da pilha ({{ suffix }})</label>
        <div class="relative">
          <input v-model.number="form.maxStackHeight" type="number" min="0" step="0.001" :class="[inputClass('maxStackHeight'), 'pr-12']" />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}</span>
        </div>
        <p v-if="commonErrors['maxStackHeight']" class="mt-1 text-xs text-rose-600">{{ commonErrors['maxStackHeight'] }}</p>
      </fieldset>

      <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
        <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Custo e logística</legend>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Custo-hora (R$/hora)</label>
        <input v-model="form.hourlyCost" type="number" min="0" step="0.01" :class="inputClass('hourlyCost')" />
        <p v-if="commonErrors['hourlyCost']" class="mt-1 text-xs text-rose-600">{{ commonErrors['hourlyCost'] }}</p>

        <label class="block mt-3 mb-2 text-sm text-slate-700 dark:text-slate-300">Transporte de insumos (min)</label>
        <input v-model.number="form.supplyTransportTimeMinutes" type="number" min="0" step="1" :class="inputClass('supplyTransportTimeMinutes')" />
        <p v-if="commonErrors['supplyTransportTimeMinutes']" class="mt-1 text-xs text-rose-600">{{ commonErrors['supplyTransportTimeMinutes'] }}</p>
      </fieldset>
    </div>

    <!-- Bloco digital -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Impressora digital</legend>
      <DigitalBlockFields :block="digital" :errors="digitalErrors" />
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
        {{ loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar impressora digital' }}
      </button>
    </div>
  </form>
</template>
