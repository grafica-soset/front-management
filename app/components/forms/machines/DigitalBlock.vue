<script setup lang="ts">
/**
 * Bloco específico DIGITAL. O `costModel` é polimórfico: ao trocar o tipo,
 * o objeto é substituído pelo default correspondente. Os campos de cada
 * variante usam computeds com get/set para preservar a tipagem do union.
 */
import { computed } from 'vue'
import type { DigitalBlock, DigitalCostModelType, ConsumableType } from '@/types/Machine'
import { CONSUMABLE_TYPE_LABELS, defaultCostModel } from '@/utils/machineCatalog'

const props = defineProps<{
  block: DigitalBlock
  errors: Record<string, string>
}>()

const COST_MODEL_OPTIONS: { value: DigitalCostModelType; label: string }[] = [
  { value: 'CLICK_CHARGE', label: 'Clique (contrato)' },
  { value: 'WEAR_CONSUMABLES', label: 'Consumíveis (peças)' },
  { value: 'INK_PURCHASE', label: 'Compra de Tinta' },
]

const CONSUMABLE_OPTIONS = Object.entries(CONSUMABLE_TYPE_LABELS) as [ConsumableType, string][]

const changeCostModelType = (event: Event) => {
  const type = (event.target as HTMLSelectElement).value as DigitalCostModelType
  if (type !== props.block.costModel.type) props.block.costModel = defaultCostModel(type)
}

// Variante CLICK_CHARGE
const pricePerMonoClick = computed({
  get: () => (props.block.costModel.type === 'CLICK_CHARGE' ? props.block.costModel.pricePerMonoClick : 0),
  set: (v: number) => { if (props.block.costModel.type === 'CLICK_CHARGE') props.block.costModel.pricePerMonoClick = v },
})
const pricePerColorClick = computed({
  get: () => (props.block.costModel.type === 'CLICK_CHARGE' ? props.block.costModel.pricePerColorClick : 0),
  set: (v: number) => { if (props.block.costModel.type === 'CLICK_CHARGE') props.block.costModel.pricePerColorClick = v },
})

// Variante INK_PURCHASE
const inkPricePerLiter = computed({
  get: () => (props.block.costModel.type === 'INK_PURCHASE' ? props.block.costModel.inkPricePerLiter : 0),
  set: (v: number) => { if (props.block.costModel.type === 'INK_PURCHASE') props.block.costModel.inkPricePerLiter = v },
})
const averageCoveragePerSheetMl = computed({
  get: () => (props.block.costModel.type === 'INK_PURCHASE' ? props.block.costModel.averageCoveragePerSheetMl : 0),
  set: (v: number) => { if (props.block.costModel.type === 'INK_PURCHASE') props.block.costModel.averageCoveragePerSheetMl = v },
})

// Variante WEAR_CONSUMABLES
const consumables = computed(() =>
  props.block.costModel.type === 'WEAR_CONSUMABLES' ? props.block.costModel.consumables : [],
)
const addConsumable = () => {
  if (props.block.costModel.type !== 'WEAR_CONSUMABLES') return
  props.block.costModel.consumables.push({
    consumableType: 'DRUM',
    description: '',
    price: 0,
    durabilityCopies: 1,
  })
}
const removeConsumable = (index: number) => {
  if (props.block.costModel.type !== 'WEAR_CONSUMABLES') return
  props.block.costModel.consumables.splice(index, 1)
}

const fieldClass = (hasError: boolean) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  hasError ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Velocidade (PPM)</label>
        <input
          v-model.number="block.pagesPerMinute"
          type="number"
          min="1"
          step="1"
          :class="fieldClass(!!errors['pagesPerMinute'])"
        />
        <p v-if="errors['pagesPerMinute']" class="mt-1 text-xs text-rose-600">{{ errors['pagesPerMinute'] }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Fator duplex</label>
        <input
          v-model.number="block.duplexMultiplier"
          type="number"
          min="0"
          step="0.01"
          :class="fieldClass(!!errors['duplexMultiplier'])"
        />
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Ex.: 2.0 quando frente e verso dobram o custo.</p>
        <p v-if="errors['duplexMultiplier']" class="mt-1 text-xs text-rose-600">{{ errors['duplexMultiplier'] }}</p>
      </div>
    </div>

    <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <input
        v-model="block.supportsNumbering"
        type="checkbox"
        class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
      />
      Suporta numeração?
    </label>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Folhas por calibração</label>
        <input
          v-model.number="block.calibration.sheetsPerCalibration"
          type="number"
          min="0"
          step="1"
          :class="fieldClass(!!errors['calibration.sheetsPerCalibration'])"
        />
        <p v-if="errors['calibration.sheetsPerCalibration']" class="mt-1 text-xs text-rose-600">{{ errors['calibration.sheetsPerCalibration'] }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Intervalo de calibração (min)</label>
        <input
          v-model.number="block.calibration.intervalMinutes"
          type="number"
          min="0"
          step="1"
          :class="fieldClass(!!errors['calibration.intervalMinutes'])"
        />
        <p v-if="errors['calibration.intervalMinutes']" class="mt-1 text-xs text-rose-600">{{ errors['calibration.intervalMinutes'] }}</p>
      </div>
    </div>

    <!-- Modelo de tarifação -->
    <div class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Modelo de tarifação</label>
      <select
        :value="block.costModel.type"
        @change="changeCostModelType"
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 mb-4 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
      >
        <option v-for="opt in COST_MODEL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>

      <!-- CLICK_CHARGE -->
      <div v-if="block.costModel.type === 'CLICK_CHARGE'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Preço por clique mono</label>
          <input v-model.number="pricePerMonoClick" type="number" min="0" step="0.0001" :class="fieldClass(!!errors['costModel.pricePerMonoClick'])" />
          <p v-if="errors['costModel.pricePerMonoClick']" class="mt-1 text-xs text-rose-600">{{ errors['costModel.pricePerMonoClick'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Preço por clique cor</label>
          <input v-model.number="pricePerColorClick" type="number" min="0" step="0.0001" :class="fieldClass(!!errors['costModel.pricePerColorClick'])" />
          <p v-if="errors['costModel.pricePerColorClick']" class="mt-1 text-xs text-rose-600">{{ errors['costModel.pricePerColorClick'] }}</p>
        </div>
      </div>

      <!-- INK_PURCHASE -->
      <div v-else-if="block.costModel.type === 'INK_PURCHASE'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Preço da tinta (R$/litro)</label>
          <input v-model.number="inkPricePerLiter" type="number" min="0" step="0.0001" :class="fieldClass(!!errors['costModel.inkPricePerLiter'])" />
          <p v-if="errors['costModel.inkPricePerLiter']" class="mt-1 text-xs text-rose-600">{{ errors['costModel.inkPricePerLiter'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Cobertura média por folha (ml)</label>
          <input v-model.number="averageCoveragePerSheetMl" type="number" min="0" step="0.0001" :class="fieldClass(!!errors['costModel.averageCoveragePerSheetMl'])" />
          <p v-if="errors['costModel.averageCoveragePerSheetMl']" class="mt-1 text-xs text-rose-600">{{ errors['costModel.averageCoveragePerSheetMl'] }}</p>
        </div>
      </div>

      <!-- WEAR_CONSUMABLES -->
      <div v-else class="space-y-3">
        <p v-if="errors['costModel.consumables']" class="text-xs text-rose-600">{{ errors['costModel.consumables'] }}</p>
        <div
          v-for="(item, index) in consumables"
          :key="index"
          class="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 text-xs font-medium text-slate-700 dark:text-slate-300">Peça</label>
              <select
                v-model="item.consumableType"
                class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              >
                <option v-for="[value, label] in CONSUMABLE_OPTIONS" :key="value" :value="value">{{ label }}</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 text-xs font-medium text-slate-700 dark:text-slate-300">Descrição</label>
              <input
                v-model="item.description"
                type="text"
                maxlength="150"
                class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
            </div>
            <div>
              <label class="block mb-1 text-xs font-medium text-slate-700 dark:text-slate-300">Preço da peça</label>
              <input
                v-model.number="item.price"
                type="number"
                min="0"
                step="0.0001"
                :class="fieldClass(!!errors[`costModel.consumables.${index}.price`])"
              />
              <p v-if="errors[`costModel.consumables.${index}.price`]" class="mt-1 text-xs text-rose-600">{{ errors[`costModel.consumables.${index}.price`] }}</p>
            </div>
            <div>
              <label class="block mb-1 text-xs font-medium text-slate-700 dark:text-slate-300">Durabilidade (milhares de cópias)</label>
              <input
                v-model.number="item.durabilityCopies"
                type="number"
                min="1"
                step="1"
                :class="fieldClass(!!errors[`costModel.consumables.${index}.durabilityCopies`])"
              />
              <p v-if="errors[`costModel.consumables.${index}.durabilityCopies`]" class="mt-1 text-xs text-rose-600">{{ errors[`costModel.consumables.${index}.durabilityCopies`] }}</p>
            </div>
          </div>
          <div class="mt-2 text-right">
            <button
              type="button"
              @click="removeConsumable(index)"
              class="text-xs font-medium text-rose-600 hover:text-rose-700"
            >
              Remover peça
            </button>
          </div>
        </div>
        <button
          type="button"
          @click="addConsumable"
          class="px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800 dark:hover:bg-indigo-900/50"
        >
          + Adicionar peça
        </button>
      </div>
    </div>
  </div>
</template>
