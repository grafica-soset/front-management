<script setup lang="ts">
/**
 * Formulário de INSUMO (atividade 027): tipo (Tinta/Chapa/Outro) + nome + unidade de medida + custo
 * + descrição. Para CHAPA, mostra o tipo de matriz fotográfica e o tamanho (largura × comprimento,
 * editado na unidade da empresa e convertido para mm no envio).
 *
 * Componente autocontido: recebe dados iniciais por prop e emite o payload validado por @submit.
 */
import { computed, reactive, ref, watch } from 'vue'
import type { CreateSupplyRequest, Supply, UpdateSupplyRequest } from '@/types/Supply'
import type { PlateType } from '@/types/PlateType'
import {
  SUPPLY_TYPES,
  SUPPLY_TYPE_SINGULAR,
  SUPPLY_UNITS,
  supplyUnitLabel,
} from '@/utils/supplyCatalog'
import { PLATE_TYPES, PLATE_TYPE_LABELS } from '@/utils/plateTypes'
import { useUnitConverter } from '@/composables/useUnitConverter'

const props = defineProps<{
  initial?: Supply | null
  mode?: 'create' | 'edit'
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: CreateSupplyRequest | UpdateSupplyRequest, mode: 'create' | 'update'): void
  (e: 'cancel'): void
}>()

const isEditing = computed(() => props.mode === 'edit')
const { suffix: lengthUnit, currentUnit, fromMillimeters, toMillimeters } = useUnitConverter()

// Rótulo da unidade de medida, dinâmico para as unidades espaciais (atividade 027).
const unitLabel = (u: CreateSupplyRequest['unitOfMeasure']) => supplyUnitLabel(u, currentUnit.value)

const form = reactive({
  type: 'OTHER' as CreateSupplyRequest['type'],
  name: '',
  unitOfMeasure: 'UNIT' as CreateSupplyRequest['unitOfMeasure'],
  unitCost: '0',
  description: '',
  active: true,
  // Chapa (usado apenas quando type === 'PLATE').
  plateType: 'CTP' as PlateType,
  plateWidth: 0,
  plateHeight: 0,
  plateThicknessMicrometers: 0,
})

const errors = ref<Record<string, string>>({})

if (props.initial) hydrate(props.initial)

function hydrate(supply: Supply) {
  form.type = supply.type
  form.name = supply.name
  form.unitOfMeasure = supply.unitOfMeasure
  form.unitCost = String(supply.unitCost)
  form.description = supply.description ?? ''
  form.active = supply.active
  if (supply.plate) {
    form.plateType = supply.plate.plateType
    form.plateWidth = fromMillimeters(supply.plate.width.millimeters) ?? 0
    form.plateHeight = fromMillimeters(supply.plate.height.millimeters) ?? 0
    form.plateThicknessMicrometers = supply.plate.thicknessMicrometers
  }
}

const isPlate = computed(() => form.type === 'PLATE')

// Ao escolher um tipo que não seja chapa, zera os campos específicos de chapa.
watch(() => form.type, (t) => {
  if (t !== 'PLATE') {
    form.plateWidth = 0
    form.plateHeight = 0
    form.plateThicknessMicrometers = 0
  }
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

  const cost = Number(form.unitCost)
  if (!Number.isFinite(cost) || cost < 0) e['unitCost'] = 'Informe um custo válido (≥ 0).'

  if (form.description.length > 255) e['description'] = 'Máximo de 255 caracteres.'

  if (isPlate.value) {
    if (!(form.plateWidth > 0)) e['plateWidth'] = 'Informe a largura (> 0).'
    if (!(form.plateHeight > 0)) e['plateHeight'] = 'Informe o comprimento (> 0).'
    if (!(form.plateThicknessMicrometers > 0)) e['plateThickness'] = 'Informe a espessura (> 0).'
  }
  return e
}

const handleSubmit = () => {
  errors.value = validate()
  if (Object.keys(errors.value).length) return

  const base: CreateSupplyRequest = {
    customerId: 0,
    type: form.type,
    name: form.name.trim(),
    unitOfMeasure: form.unitOfMeasure,
    unitCost: String(form.unitCost),
    description: form.description.trim() ? form.description.trim() : null,
    plate: isPlate.value
      ? {
          plateType: form.plateType,
          widthMm: toMillimeters(form.plateWidth) ?? 0,
          heightMm: toMillimeters(form.plateHeight) ?? 0,
          thicknessMicrometers: form.plateThicknessMicrometers,
        }
      : null,
  }

  if (isEditing.value) {
    emit('submit', { ...base, active: form.active }, 'update')
  } else {
    emit('submit', base, 'create')
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Identificação -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Tipo <span class="text-rose-500">*</span>
        </label>
        <select v-model="form.type" class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
          <option v-for="t in SUPPLY_TYPES" :key="t" :value="t">{{ SUPPLY_TYPE_SINGULAR[t] }}</option>
        </select>
      </div>
      <div class="md:col-span-2">
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Nome <span class="text-rose-500">*</span>
        </label>
        <input v-model="form.name" type="text" maxlength="150" placeholder="Ex.: Cola Branca / Chapa CTP 52x36" :class="inputClass('name')" />
        <p v-if="errors['name']" class="mt-1 text-xs text-rose-600">{{ errors['name'] }}</p>
      </div>
    </div>

    <!-- Unidade de medida + custo -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Unidade de medida <span class="text-rose-500">*</span>
        </label>
        <select v-model="form.unitOfMeasure" class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
          <option v-for="u in SUPPLY_UNITS" :key="u" :value="u">{{ unitLabel(u) }}</option>
        </select>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Como o insumo é cobrado/medido.</p>
      </div>
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Custo por unidade (R$) <span class="text-rose-500">*</span>
        </label>
        <input v-model="form.unitCost" type="number" min="0" step="0.0001" :class="inputClass('unitCost')" />
        <p v-if="errors['unitCost']" class="mt-1 text-xs text-rose-600">{{ errors['unitCost'] }}</p>
      </div>
    </div>

    <!-- Bloco Chapa -->
    <fieldset v-if="isPlate" class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Chapa (matriz fotográfica)</legend>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Tipo de matriz</label>
          <select v-model="form.plateType" class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
            <option v-for="p in PLATE_TYPES" :key="p" :value="p">{{ PLATE_TYPE_LABELS[p] }}</option>
          </select>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Espessura (µm)</label>
          <div class="relative">
            <input v-model.number="form.plateThicknessMicrometers" type="number" min="0" step="1" :class="[inputClass('plateThickness'), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">µm</span>
          </div>
          <p v-if="errors['plateThickness']" class="mt-1 text-xs text-rose-600">{{ errors['plateThickness'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Largura ({{ lengthUnit }})</label>
          <div class="relative">
            <input v-model.number="form.plateWidth" type="number" min="0" step="0.001" :class="[inputClass('plateWidth'), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
          </div>
          <p v-if="errors['plateWidth']" class="mt-1 text-xs text-rose-600">{{ errors['plateWidth'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Comprimento ({{ lengthUnit }})</label>
          <div class="relative">
            <input v-model.number="form.plateHeight" type="number" min="0" step="0.001" :class="[inputClass('plateHeight'), 'pr-12']" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
          </div>
          <p v-if="errors['plateHeight']" class="mt-1 text-xs text-rose-600">{{ errors['plateHeight'] }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Descrição -->
    <div>
      <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Descrição</label>
      <textarea v-model="form.description" rows="2" maxlength="255" placeholder="Texto livre (opcional)" :class="inputClass('description')"></textarea>
      <p v-if="errors['description']" class="mt-1 text-xs text-rose-600">{{ errors['description'] }}</p>
    </div>

    <label v-if="isEditing" class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <input v-model="form.active" type="checkbox" class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600" />
      Insumo ativo
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
        {{ loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar insumo' }}
      </button>
    </div>
  </form>
</template>
