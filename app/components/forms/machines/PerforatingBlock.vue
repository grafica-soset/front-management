<script setup lang="ts">
/**
 * Campos do bloco PICOTADEIRA / SERRILHADEIRA (PERFORATING).
 *
 * A picotadeira faz PICOTES (serrilhas) no papel. Cada máquina tem uma quantidade de FERRAMENTAS
 * de picote; cada picote usa uma ferramenta. No orçamento informa-se quantos picotes — só pode ir
 * para uma máquina cuja capacidade comporte. A velocidade parte da máxima e é reduzida por
 * gramatura e formato fora do ideal, limitada à mínima. Tem alimentador e retirada na mesa de
 * saída por altura da pilha.
 */
import { computed } from 'vue'
import type { PerforatingBlockRequest } from '@/types/Machine'
import { useUnitConverter } from '@/composables/useUnitConverter'

const props = defineProps<{
  block: PerforatingBlockRequest
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
      Cada picote usa uma <strong>ferramenta</strong>. No orçamento informa-se quantos picotes; o
      trabalho só pode ir para uma máquina cuja capacidade comporte. A velocidade parte da máxima e
      é reduzida por gramatura e formato fora do ideal, limitada à mínima.
    </p>

    <!-- Ferramentas de picote -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Ferramentas de picote</legend>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Quantidade de ferramentas</label>
          <div class="relative">
            <input v-model.number="block.toolCount" type="number" min="1" step="1" :class="inputClass(errors.toolCount)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">picotes</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Capacidade máxima de picotes da máquina.</p>
          <p v-if="errors.toolCount" class="mt-1 text-xs text-rose-600">{{ errors.toolCount }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Setup por ferramenta</label>
          <div class="relative">
            <input v-model.number="block.toolSetupMinutes" type="number" min="0" step="1" :class="inputClass(errors.toolSetupMinutes)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">min</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Por ferramenta/picote usado.</p>
          <p v-if="errors.toolSetupMinutes" class="mt-1 text-xs text-rose-600">{{ errors.toolSetupMinutes }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Velocidade -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Velocidade</legend>
      <div class="grid grid-cols-2 gap-4">
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
      </div>
    </fieldset>

    <!-- Gramatura aceita -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Gramatura aceita</legend>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Gramatura mín.</label>
          <div class="relative">
            <input v-model.number="block.minWeightGsm" type="number" min="0" step="1" :class="inputClass(errors.minWeightGsm)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">g/m²</span>
          </div>
          <p v-if="errors.minWeightGsm" class="mt-1 text-xs text-rose-600">{{ errors.minWeightGsm }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Gramatura máx.</label>
          <div class="relative">
            <input v-model.number="block.maxWeightGsm" type="number" min="0" step="1" :class="inputClass(errors.maxWeightGsm)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">g/m²</span>
          </div>
          <p v-if="errors.maxWeightGsm" class="mt-1 text-xs text-rose-600">{{ errors.maxWeightGsm }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Gramatura ideal -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Gramatura ideal</legend>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">Fora desta faixa, aplica-se o redutor de velocidade correspondente.</p>
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

    <!-- Alimentação e saída -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Alimentação e saída</legend>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Retirada na saída</label>
          <div class="relative">
            <input v-model.number="block.outputRemovalMinutesPer10Cm" type="number" min="0" step="1" :class="inputClass(errors.outputRemovalMinutesPer10Cm)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">min/10cm</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Por cada 10 cm de altura da pilha de saída.</p>
          <p v-if="errors.outputRemovalMinutesPer10Cm" class="mt-1 text-xs text-rose-600">{{ errors.outputRemovalMinutesPer10Cm }}</p>
        </div>
      </div>
    </fieldset>
  </div>
</template>
