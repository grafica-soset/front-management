<script setup lang="ts">
/**
 * Formulário da PLOTER DE MEIO CORTE (atividade 046): identificação + área de alimentação + altura da
 * pilha + custo-hora + transporte de insumos + bloco da ploter (setup de arquivo, velocidade da lâmina
 * e tempo por alimentação).
 *
 * A ploter recorta o perímetro de cada aplicação com uma lâmina só: o orçamento cobra pelos metros
 * lineares de recorte. Toda medida — inclusive a velocidade, que é comprimento por segundo — é
 * digitada na unidade da empresa e convertida para milímetros no envio.
 */
import { computed, reactive, ref } from 'vue'
import type { HalfCutPlotterBlock, HalfCutPlotterMachine, HalfCutPlotterMachineRequest } from '@/types/Machine'
import {
  MACHINE_TYPE_LABELS,
  defaultHalfCutPlotterBlock,
  hydrateHalfCutPlotterBlock,
  validateHalfCutPlotter,
} from '@/utils/machineCatalog'
import { useUnitConverter } from '@/composables/useUnitConverter'
import { isBlank, isNumberAtLeast } from '@/utils/formNumbers'

const props = defineProps<{
  /** Dados para pré-preencher o formulário (edição ou duplicação). */
  initial?: HalfCutPlotterMachine | null
  /** 'edit' → PUT (mostra "ativa"); 'create' → POST, mesmo com `initial` (duplicação). */
  mode?: 'create' | 'edit'
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: HalfCutPlotterMachineRequest, mode: 'create' | 'update'): void
  (e: 'cancel'): void
}>()

const isEditing = computed(() => props.mode === 'edit')

const { suffix, fromMillimeters, toMillimeters } = useUnitConverter()

const form = reactive({
  name: '',
  formatRange: { minWidth: 0, maxWidth: 0, minLength: 0, maxLength: 0 },
  maxStackHeight: 0,
  hourlyCost: '0',
  supplyTransportTimeMinutes: 0,
  // Velocidade da lâmina na unidade da empresa, por segundo (ex.: 50 cm/s).
  cuttingSpeed: 0,
  active: true,
})

const plotter = reactive<HalfCutPlotterBlock>(defaultHalfCutPlotterBlock())

const commonErrors = ref<Record<string, string>>({})
const plotterErrors = ref<Record<string, string>>({})

if (props.initial) hydrate(props.initial)

function hydrate(machine: HalfCutPlotterMachine) {
  form.name = machine.name
  form.formatRange = {
    minWidth: fromMillimeters(machine.formatRange.minWidth.millimeters) ?? 0,
    maxWidth: fromMillimeters(machine.formatRange.maxWidth.millimeters) ?? 0,
    minLength: fromMillimeters(machine.formatRange.minLength.millimeters) ?? 0,
    maxLength: fromMillimeters(machine.formatRange.maxLength.millimeters) ?? 0,
  }
  form.maxStackHeight = fromMillimeters(machine.paperFeeder?.maxStackHeightMm ?? 0) ?? 0
  form.hourlyCost = String(machine.hourlyCost)
  form.supplyTransportTimeMinutes = machine.supplyTransportTimeMinutes ?? 0
  form.active = machine.active
  Object.assign(plotter, hydrateHalfCutPlotterBlock(machine.halfCutPlotter))
  form.cuttingSpeed = fromMillimeters(plotter.cuttingSpeedMmPerSecond) ?? 0
}

const inputClass = (err?: string) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  err ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
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

  // A pilha é obrigatória: é dela que sai quantas alimentações o trabalho custa.
  if (!((toMillimeters(form.maxStackHeight) ?? 0) > 0)) e['maxStackHeight'] = 'Informe a altura máxima da pilha.'

  const cost = Number(form.hourlyCost)
  if (isBlank(form.hourlyCost) || !Number.isFinite(cost) || cost < 0) e['hourlyCost'] = 'Informe um custo-hora válido (≥ 0).'

  if (!isNumberAtLeast(form.supplyTransportTimeMinutes, 0)) e['supplyTransportTimeMinutes'] = 'Valor mínimo: 0.'
  return e
}

const handleSubmit = () => {
  plotter.cuttingSpeedMmPerSecond = toMillimeters(form.cuttingSpeed) ?? 0
  commonErrors.value = validateCommon()
  plotterErrors.value = validateHalfCutPlotter(plotter)

  if (Object.keys(commonErrors.value).length || Object.keys(plotterErrors.value).length) return

  const payload: HalfCutPlotterMachineRequest = {
    customerId: 0,
    machineType: 'HALF_CUT_PLOTTER',
    name: form.name.trim(),
    formatRange: {
      minWidthMm: toMillimeters(form.formatRange.minWidth) ?? 0,
      maxWidthMm: toMillimeters(form.formatRange.maxWidth) ?? 0,
      minLengthMm: toMillimeters(form.formatRange.minLength) ?? 0,
      maxLengthMm: toMillimeters(form.formatRange.maxLength) ?? 0,
    },
    paperFeeder: { maxStackHeightMm: toMillimeters(form.maxStackHeight) ?? 0 },
    hourlyCost: String(form.hourlyCost),
    supplyTransportTimeMinutes: form.supplyTransportTimeMinutes,
    halfCutPlotter: { ...plotter },
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
          :value="MACHINE_TYPE_LABELS.HALF_CUT_PLOTTER"
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
        <input v-model="form.name" type="text" maxlength="150" placeholder="Ex.: Ploter de Meio Corte" :class="inputClass(commonErrors['name'])" />
        <p v-if="commonErrors['name']" class="mt-1 text-xs text-rose-600">{{ commonErrors['name'] }}</p>
      </div>
    </div>

    <!-- Área de alimentação -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Área de alimentação ({{ suffix }})</legend>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Formato mínimo e máximo — largura × comprimento. No orçamento, folha maior que a área só gera
        alerta; peça maior que a área bloqueia o cálculo.
      </p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="field in ([
          ['minWidth', 'Largura mín.'],
          ['maxWidth', 'Largura máx.'],
          ['minLength', 'Comprimento mín.'],
          ['maxLength', 'Comprimento máx.'],
        ] as const)" :key="field[0]">
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">{{ field[1] }}</label>
          <div class="relative">
            <input v-model.number="form.formatRange[field[0]]" type="number" min="0" step="0.001" :class="[inputClass(commonErrors[`formatRange.${field[0]}`]), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}</span>
          </div>
          <p v-if="commonErrors[`formatRange.${field[0]}`]" class="mt-1 text-xs text-rose-600">{{ commonErrors[`formatRange.${field[0]}`] }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Corte + Alimentação -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Ploter de meio corte</legend>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        A lâmina percorre o <strong>perímetro</strong> de cada peça: 15×20 = 70 por peça. O tempo de corte é o
        recorte total dividido pela velocidade.
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Velocidade da lâmina</label>
          <div class="relative">
            <input v-model.number="form.cuttingSpeed" type="number" min="0" step="0.001" :class="[inputClass(plotterErrors.cuttingSpeedMmPerSecond), 'pr-14']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}/s</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Lineares por segundo.</p>
          <p v-if="plotterErrors.cuttingSpeedMmPerSecond" class="mt-1 text-xs text-rose-600">{{ plotterErrors.cuttingSpeedMmPerSecond }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Setup de arquivo</label>
          <div class="relative">
            <input v-model.number="plotter.fileSetupMinutes" type="number" min="0" step="1" :class="[inputClass(plotterErrors.fileSetupMinutes), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">min</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Uma vez por trabalho.</p>
          <p v-if="plotterErrors.fileSetupMinutes" class="mt-1 text-xs text-rose-600">{{ plotterErrors.fileSetupMinutes }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Altura máx. da pilha <span class="text-rose-500">*</span></label>
          <div class="relative">
            <input v-model.number="form.maxStackHeight" type="number" min="0" step="0.001" :class="[inputClass(commonErrors['maxStackHeight']), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Altura de papel por alimentação.</p>
          <p v-if="commonErrors['maxStackHeight']" class="mt-1 text-xs text-rose-600">{{ commonErrors['maxStackHeight'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Tempo por alimentação</label>
          <div class="relative">
            <input v-model.number="plotter.feedTimeSecondsPerLoad" type="number" min="0" step="1" :class="[inputClass(plotterErrors.feedTimeSecondsPerLoad), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">seg</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">A cada altura máxima da pilha.</p>
          <p v-if="plotterErrors.feedTimeSecondsPerLoad" class="mt-1 text-xs text-rose-600">{{ plotterErrors.feedTimeSecondsPerLoad }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Custo e logística -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Custo e logística</legend>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Custo-hora (R$/hora)</label>
          <input v-model="form.hourlyCost" type="number" min="0" step="0.01" :class="inputClass(commonErrors['hourlyCost'])" />
          <p v-if="commonErrors['hourlyCost']" class="mt-1 text-xs text-rose-600">{{ commonErrors['hourlyCost'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Transporte de insumos (min)</label>
          <input v-model.number="form.supplyTransportTimeMinutes" type="number" min="0" step="1" :class="inputClass(commonErrors['supplyTransportTimeMinutes'])" />
          <p v-if="commonErrors['supplyTransportTimeMinutes']" class="mt-1 text-xs text-rose-600">{{ commonErrors['supplyTransportTimeMinutes'] }}</p>
        </div>
      </div>
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
        {{ loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar ploter' }}
      </button>
    </div>
  </form>
</template>
