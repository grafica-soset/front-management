<script setup lang="ts">
/**
 * Campos do bloco DOBRADEIRA (FOLDING).
 *
 * A dobradeira dobra o papel por BOLSAS (paralelas e cruzadas); cada dobra usa uma bolsa. A
 * velocidade parte da máxima e é reduzida por bolsa usada, gramatura e formato fora do ideal,
 * limitada à mínima. Tem alimentador, espessura máxima do papel, quebra de acerto e
 * movimentação de saída por maço. No orçamento informam-se as dobras paralelas e cruzadas.
 */
import { computed } from 'vue'
import type { FoldingBlockRequest } from '@/types/Machine'
import { useUnitConverter } from '@/composables/useUnitConverter'

const props = defineProps<{
  block: FoldingBlockRequest
  errors: Record<string, string>
}>()

const { suffix: lengthUnit, fromMillimeters, toMillimeters } = useUnitConverter()

function dimensionModel(get: () => number, set: (mm: number) => void) {
  return computed<number>({
    get: () => fromMillimeters(get()) ?? 0,
    set: (v) => set(toMillimeters(v) ?? 0),
  })
}

const feedLoadIncrement = dimensionModel(() => props.block.feedLoadIncrementMm, (mm) => (props.block.feedLoadIncrementMm = mm))
const minFormatWidth = dimensionModel(() => props.block.minFormat.widthMm, (mm) => (props.block.minFormat.widthMm = mm))
const minFormatLength = dimensionModel(() => props.block.minFormat.lengthMm, (mm) => (props.block.minFormat.lengthMm = mm))
const maxFormatWidth = dimensionModel(() => props.block.maxFormat.widthMm, (mm) => (props.block.maxFormat.widthMm = mm))
const maxFormatLength = dimensionModel(() => props.block.maxFormat.lengthMm, (mm) => (props.block.maxFormat.lengthMm = mm))

const inputClass = (err?: string) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-3 pr-14 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  err ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]
const fmtErr = (which: 'minFormat' | 'maxFormat', field: 'widthMm' | 'lengthMm') => props.errors[`${which}.${field}`]
</script>

<template>
  <div class="space-y-6">
    <p class="text-xs text-slate-500 dark:text-slate-400">
      Cada dobra passa por uma <strong>bolsa</strong>. No orçamento informam-se as dobras paralelas
      e cruzadas (bolsas usadas = paralelas + cruzadas). A velocidade parte da máxima e é reduzida
      por bolsa usada, gramatura e formato fora do ideal, limitada à mínima.
    </p>

    <!-- Bolsas -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Bolsas (dobras)</legend>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Bolsas paralelas</label>
          <input v-model.number="block.parallelPockets" type="number" min="0" step="1" :class="inputClass(errors.parallelPockets)" />
          <p v-if="errors.parallelPockets" class="mt-1 text-xs text-rose-600">{{ errors.parallelPockets }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Bolsas cruzadas</label>
          <input v-model.number="block.crossPockets" type="number" min="0" step="1" :class="inputClass(errors.crossPockets)" />
          <p v-if="errors.crossPockets" class="mt-1 text-xs text-rose-600">{{ errors.crossPockets }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Setup de bolsa</label>
          <div class="relative">
            <input v-model.number="block.pocketSetupMinutes" type="number" min="0" step="1" :class="inputClass(errors.pocketSetupMinutes)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">min</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Por bolsa usada.</p>
          <p v-if="errors.pocketSetupMinutes" class="mt-1 text-xs text-rose-600">{{ errors.pocketSetupMinutes }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Redutor por bolsa</label>
          <div class="relative">
            <input v-model="block.perPocketSpeedReducerPercent" type="number" min="0" step="0.01" :class="inputClass(errors.perPocketSpeedReducerPercent)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">%</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Reduz a velocidade por bolsa.</p>
          <p v-if="errors.perPocketSpeedReducerPercent" class="mt-1 text-xs text-rose-600">{{ errors.perPocketSpeedReducerPercent }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Velocidade + espessura -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Velocidade e espessura</legend>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Velocidade mínima</label>
          <div class="relative">
            <input v-model.number="block.minSpeedSheetsPerHour" type="number" min="0" step="1" :class="inputClass(errors.minSpeedSheetsPerHour)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">f/h</span>
          </div>
          <p v-if="errors.minSpeedSheetsPerHour" class="mt-1 text-xs text-rose-600">{{ errors.minSpeedSheetsPerHour }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Velocidade máxima</label>
          <div class="relative">
            <input v-model.number="block.maxSpeedSheetsPerHour" type="number" min="0" step="1" :class="inputClass(errors.maxSpeedSheetsPerHour)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">f/h</span>
          </div>
          <p v-if="errors.maxSpeedSheetsPerHour" class="mt-1 text-xs text-rose-600">{{ errors.maxSpeedSheetsPerHour }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Espessura máx. do papel</label>
          <div class="relative">
            <input v-model.number="block.maxPaperThicknessMicrons" type="number" min="0" step="1" :class="inputClass(errors.maxPaperThicknessMicrons)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">µm</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Acima disso o papel não passa pelas bolsas.</p>
          <p v-if="errors.maxPaperThicknessMicrons" class="mt-1 text-xs text-rose-600">{{ errors.maxPaperThicknessMicrons }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Gramatura ideal -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Gramatura ideal</legend>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Gramatura mín.</label>
          <div class="relative">
            <input v-model.number="block.idealWeightMinGsm" type="number" min="0" step="1" :class="inputClass(errors.idealWeightMinGsm)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">g/m²</span>
          </div>
          <p v-if="errors.idealWeightMinGsm" class="mt-1 text-xs text-rose-600">{{ errors.idealWeightMinGsm }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Gramatura máx.</label>
          <div class="relative">
            <input v-model.number="block.idealWeightMaxGsm" type="number" min="0" step="1" :class="inputClass(errors.idealWeightMaxGsm)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">g/m²</span>
          </div>
          <p v-if="errors.idealWeightMaxGsm" class="mt-1 text-xs text-rose-600">{{ errors.idealWeightMaxGsm }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Redutor abaixo</label>
          <div class="relative">
            <input v-model="block.belowIdealWeightReducerPercent" type="number" min="0" step="0.01" :class="inputClass(errors.belowIdealWeightReducerPercent)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">%</span>
          </div>
          <p v-if="errors.belowIdealWeightReducerPercent" class="mt-1 text-xs text-rose-600">{{ errors.belowIdealWeightReducerPercent }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Redutor acima</label>
          <div class="relative">
            <input v-model="block.aboveIdealWeightReducerPercent" type="number" min="0" step="0.01" :class="inputClass(errors.aboveIdealWeightReducerPercent)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">%</span>
          </div>
          <p v-if="errors.aboveIdealWeightReducerPercent" class="mt-1 text-xs text-rose-600">{{ errors.aboveIdealWeightReducerPercent }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Formato ideal -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Formato ideal ({{ lengthUnit }})</legend>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">Fora desta faixa (pelo tamanho), aplica-se o redutor correspondente.</p>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Largura mín.</label>
          <div class="relative">
            <input v-model.number="minFormatWidth" type="number" min="0" step="0.001" :class="inputClass(fmtErr('minFormat', 'widthMm'))" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
          </div>
          <p v-if="fmtErr('minFormat', 'widthMm')" class="mt-1 text-xs text-rose-600">{{ fmtErr('minFormat', 'widthMm') }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Comprimento mín.</label>
          <div class="relative">
            <input v-model.number="minFormatLength" type="number" min="0" step="0.001" :class="inputClass(fmtErr('minFormat', 'lengthMm'))" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
          </div>
          <p v-if="fmtErr('minFormat', 'lengthMm')" class="mt-1 text-xs text-rose-600">{{ fmtErr('minFormat', 'lengthMm') }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Redutor abaixo</label>
          <div class="relative">
            <input v-model="block.belowMinFormatReducerPercent" type="number" min="0" step="0.01" :class="inputClass(errors.belowMinFormatReducerPercent)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">%</span>
          </div>
          <p v-if="errors.belowMinFormatReducerPercent" class="mt-1 text-xs text-rose-600">{{ errors.belowMinFormatReducerPercent }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Largura máx.</label>
          <div class="relative">
            <input v-model.number="maxFormatWidth" type="number" min="0" step="0.001" :class="inputClass(fmtErr('maxFormat', 'widthMm'))" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
          </div>
          <p v-if="fmtErr('maxFormat', 'widthMm')" class="mt-1 text-xs text-rose-600">{{ fmtErr('maxFormat', 'widthMm') }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Comprimento máx.</label>
          <div class="relative">
            <input v-model.number="maxFormatLength" type="number" min="0" step="0.001" :class="inputClass(fmtErr('maxFormat', 'lengthMm'))" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
          </div>
          <p v-if="fmtErr('maxFormat', 'lengthMm')" class="mt-1 text-xs text-rose-600">{{ fmtErr('maxFormat', 'lengthMm') }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Redutor acima</label>
          <div class="relative">
            <input v-model="block.aboveMaxFormatReducerPercent" type="number" min="0" step="0.01" :class="inputClass(errors.aboveMaxFormatReducerPercent)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">%</span>
          </div>
          <p v-if="errors.aboveMaxFormatReducerPercent" class="mt-1 text-xs text-rose-600">{{ errors.aboveMaxFormatReducerPercent }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Alimentação -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Alimentação de papel</legend>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Setup de alimentação</label>
          <div class="relative">
            <input v-model.number="block.paperFeedSetupMinutes" type="number" min="0" step="1" :class="inputClass(errors.paperFeedSetupMinutes)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">min</span>
          </div>
          <p v-if="errors.paperFeedSetupMinutes" class="mt-1 text-xs text-rose-600">{{ errors.paperFeedSetupMinutes }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Tempo por alimentação</label>
          <div class="relative">
            <input v-model.number="block.feedTimeSecondsPerLoad" type="number" min="0" step="1" :class="inputClass(errors.feedTimeSecondsPerLoad)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">seg</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">A cada leva, até a altura máxima da pilha.</p>
          <p v-if="errors.feedTimeSecondsPerLoad" class="mt-1 text-xs text-rose-600">{{ errors.feedTimeSecondsPerLoad }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Altura de alimentação</label>
          <div class="relative">
            <input v-model.number="feedLoadIncrement" type="number" min="0" step="0.001" :class="inputClass(errors.feedLoadIncrementMm)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Altura de cada leva alimentada.</p>
          <p v-if="errors.feedLoadIncrementMm" class="mt-1 text-xs text-rose-600">{{ errors.feedLoadIncrementMm }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Quebra e saída -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Quebra de acerto e saída</legend>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Quebra de acerto (fixa)</label>
          <div class="relative">
            <input v-model.number="block.setupWasteSheets" type="number" min="0" step="1" :class="inputClass(errors.setupWasteSheets)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">folhas</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Distribuída de forma decrescente entre as bolsas usadas.</p>
          <p v-if="errors.setupWasteSheets" class="mt-1 text-xs text-rose-600">{{ errors.setupWasteSheets }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Movimentação de saída</label>
          <div class="relative">
            <input v-model.number="block.outputMovementMinutesPerBundle" type="number" min="0" step="1" :class="inputClass(errors.outputMovementMinutesPerBundle)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">min</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Da máquina até o balcão, por maço.</p>
          <p v-if="errors.outputMovementMinutesPerBundle" class="mt-1 text-xs text-rose-600">{{ errors.outputMovementMinutesPerBundle }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Maço de saída</label>
          <div class="relative">
            <input v-model.number="block.outputBundleSheets" type="number" min="1" step="1" :class="inputClass(errors.outputBundleSheets)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">folhas</span>
          </div>
          <p v-if="errors.outputBundleSheets" class="mt-1 text-xs text-rose-600">{{ errors.outputBundleSheets }}</p>
        </div>
      </div>
    </fieldset>
  </div>
</template>
