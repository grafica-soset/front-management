<script setup lang="ts">
/**
 * Formulário da PLASTIFICADORA (categoria FINISHING): identificação + formato de papel +
 * custo-hora + transporte de insumos + bloco plastificadora (setup e velocidade m/min).
 *
 * A plastificadora é manual (sem alimentador) e NÃO tem margem da pinça, cores, quebra ou rampa.
 * O formato de papel é editado na unidade da empresa ativa e convertido para milímetros no envio.
 */
import { computed, reactive, ref } from 'vue'
import type { LaminatingBlock, LaminatingMachine, LaminatingMachineRequest } from '@/types/Machine'
import {
  MACHINE_TYPE_LABELS,
  defaultLaminatingBlock,
  hydrateLaminatingBlock,
  validateLaminating,
} from '@/utils/machineCatalog'
import LaminatingBlockFields from '@/components/forms/machines/LaminatingBlock.vue'
import { useUnitConverter } from '@/composables/useUnitConverter'

const props = defineProps<{
  /** Dados para pré-preencher o formulário (edição ou duplicação). */
  initial?: LaminatingMachine | null
  /** 'edit' → PUT (mostra "ativa"); 'create' → POST, mesmo com `initial` (duplicação). */
  mode?: 'create' | 'edit'
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: LaminatingMachineRequest, mode: 'create' | 'update'): void
  (e: 'cancel'): void
}>()

const isEditing = computed(() => props.mode === 'edit')

const { suffix, fromMillimeters, toMillimeters } = useUnitConverter()

const form = reactive({
  name: '',
  widthRange: { minWidth: 0, maxWidth: 0 },
  hourlyCost: '0',
  supplyTransportTimeMinutes: 0,
  active: true,
})

const laminating = reactive<LaminatingBlock>(defaultLaminatingBlock())

const commonErrors = ref<Record<string, string>>({})
const laminatingErrors = ref<Record<string, string>>({})

if (props.initial) hydrate(props.initial)

function hydrate(machine: LaminatingMachine) {
  form.name = machine.name
  form.widthRange = {
    minWidth: fromMillimeters(machine.widthRange.minWidth.millimeters) ?? 0,
    maxWidth: fromMillimeters(machine.widthRange.maxWidth.millimeters) ?? 0,
  }
  form.hourlyCost = String(machine.hourlyCost)
  form.supplyTransportTimeMinutes = machine.supplyTransportTimeMinutes ?? 0
  form.active = machine.active
  Object.assign(laminating, hydrateLaminatingBlock(machine.laminating))
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

  const wr = form.widthRange
  if (wr.minWidth < 0) e['widthRange.minWidth'] = 'Valor mínimo: 0.'
  if (wr.maxWidth < wr.minWidth) e['widthRange.maxWidth'] = 'Deve ser ≥ largura mínima.'

  const cost = Number(form.hourlyCost)
  if (!Number.isFinite(cost) || cost < 0) e['hourlyCost'] = 'Informe um custo-hora válido (≥ 0).'

  if (!(form.supplyTransportTimeMinutes >= 0)) e['supplyTransportTimeMinutes'] = 'Valor mínimo: 0.'
  return e
}

const handleSubmit = () => {
  commonErrors.value = validateCommon()
  laminatingErrors.value = validateLaminating(laminating)

  if (Object.keys(commonErrors.value).length || Object.keys(laminatingErrors.value).length) return

  const payload: LaminatingMachineRequest = {
    customerId: 0,
    machineType: 'LAMINATING',
    name: form.name.trim(),
    widthRange: {
      minWidthMm: toMillimeters(form.widthRange.minWidth) ?? 0,
      maxWidthMm: toMillimeters(form.widthRange.maxWidth) ?? 0,
    },
    hourlyCost: String(form.hourlyCost),
    supplyTransportTimeMinutes: form.supplyTransportTimeMinutes,
    laminating: JSON.parse(JSON.stringify(laminating)) as LaminatingBlock,
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
          :value="MACHINE_TYPE_LABELS.LAMINATING"
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
          placeholder="Ex.: Plastificadora"
          :class="inputClass('name')"
        />
        <p v-if="commonErrors['name']" class="mt-1 text-xs text-rose-600">{{ commonErrors['name'] }}</p>
      </div>
    </div>

    <!-- Formato de papel: máquina contínua, só largura -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Largura do papel ({{ suffix }})</legend>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Faixa de largura aceita. A máquina é <strong>contínua</strong> — não há limite de comprimento.
      </p>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Largura mín.</label>
          <div class="relative">
            <input v-model.number="form.widthRange.minWidth" type="number" min="0" step="0.001" :class="[inputClass('widthRange.minWidth'), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}</span>
          </div>
          <p v-if="commonErrors['widthRange.minWidth']" class="mt-1 text-xs text-rose-600">{{ commonErrors['widthRange.minWidth'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Largura máx.</label>
          <div class="relative">
            <input v-model.number="form.widthRange.maxWidth" type="number" min="0" step="0.001" :class="[inputClass('widthRange.maxWidth'), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ suffix }}</span>
          </div>
          <p v-if="commonErrors['widthRange.maxWidth']" class="mt-1 text-xs text-rose-600">{{ commonErrors['widthRange.maxWidth'] }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Custo/Logística -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Custo e logística</legend>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Custo-hora (R$/hora)</label>
          <input v-model="form.hourlyCost" type="number" min="0" step="0.01" :class="inputClass('hourlyCost')" />
          <p v-if="commonErrors['hourlyCost']" class="mt-1 text-xs text-rose-600">{{ commonErrors['hourlyCost'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Transporte de insumos (min)</label>
          <input v-model.number="form.supplyTransportTimeMinutes" type="number" min="0" step="1" :class="inputClass('supplyTransportTimeMinutes')" />
          <p v-if="commonErrors['supplyTransportTimeMinutes']" class="mt-1 text-xs text-rose-600">{{ commonErrors['supplyTransportTimeMinutes'] }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Bloco plastificadora -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Plastificadora</legend>
      <LaminatingBlockFields :block="laminating" :errors="laminatingErrors" />
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
        {{ loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar plastificadora' }}
      </button>
    </div>
  </form>
</template>
