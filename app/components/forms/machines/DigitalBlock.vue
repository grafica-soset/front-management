<script setup lang="ts">
/**
 * Campos do bloco IMPRESSORA DIGITAL (DIGITAL).
 *
 * A velocidade vem da matriz de formato (rampa) limitada pelo envelope mín/máx. No orçamento
 * informam-se o tipo de impressão (traço/imagem) e a cobertura (%): cada tipo tem, a 100%, um
 * consumo de toner (g/m²) e um redutor de velocidade (%). Tem limites de gramatura/espessura.
 */
import { computed } from 'vue'
import type { DigitalBlockRequest, DigitalColorMode } from '@/types/Machine'
import { DIGITAL_COLOR_MODE_LABELS } from '@/utils/machineCatalog'
import { useUnitConverter } from '@/composables/useUnitConverter'

const props = defineProps<{
  block: DigitalBlockRequest
  errors: Record<string, string>
}>()

const { suffix: lengthUnit, fromMillimeters, toMillimeters } = useUnitConverter()

const COLOR_MODES: DigitalColorMode[] = ['MONOCOLOR', 'COLOR']

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
const selectClass = 'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white'
const fmtErr = (which: 'minFormat' | 'maxFormat', field: 'widthMm' | 'lengthMm' | 'sheetsPerHour') => props.errors[`${which}.${field}`]
const covErr = (which: 'lineCoverage' | 'imageCoverage', field: 'tonerGramsPerSquareMeterAt100' | 'speedReducerPercentAt100') => props.errors[`${which}.${field}`]
</script>

<template>
  <div class="space-y-6">
    <p class="text-xs text-slate-500 dark:text-slate-400">
      A velocidade vem da matriz de formato e é limitada pelo envelope mín/máx. No orçamento serão
      informados o tipo de impressão (traço/imagem) e a cobertura (%), aplicando o redutor de
      velocidade e o consumo de toner configurados abaixo.
    </p>

    <!-- Cor + setup -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Número de cores</label>
        <select v-model="block.colorMode" :class="selectClass">
          <option v-for="m in COLOR_MODES" :key="m" :value="m">{{ DIGITAL_COLOR_MODE_LABELS[m] }}</option>
        </select>
      </div>
      <div>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Setup</label>
        <div class="relative">
          <input v-model.number="block.setupMinutes" type="number" min="0" step="1" :class="inputClass(errors.setupMinutes)" />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">min</span>
        </div>
        <p v-if="errors.setupMinutes" class="mt-1 text-xs text-rose-600">{{ errors.setupMinutes }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Quebra de folhas</label>
        <div class="relative">
          <input v-model.number="block.wasteSheets" type="number" min="0" step="1" :class="inputClass(errors.wasteSheets)" />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">folhas</span>
        </div>
        <p v-if="errors.wasteSheets" class="mt-1 text-xs text-rose-600">{{ errors.wasteSheets }}</p>
      </div>
    </div>

    <!-- Velocidade + limites de papel -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Velocidade e limites de papel</legend>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Velocidade mín.</label>
          <div class="relative">
            <input v-model.number="block.minSpeedSheetsPerHour" type="number" min="0" step="1" :class="inputClass(errors.minSpeedSheetsPerHour)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">f/h</span>
          </div>
          <p v-if="errors.minSpeedSheetsPerHour" class="mt-1 text-xs text-rose-600">{{ errors.minSpeedSheetsPerHour }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Velocidade máx.</label>
          <div class="relative">
            <input v-model.number="block.maxSpeedSheetsPerHour" type="number" min="0" step="1" :class="inputClass(errors.maxSpeedSheetsPerHour)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">f/h</span>
          </div>
          <p v-if="errors.maxSpeedSheetsPerHour" class="mt-1 text-xs text-rose-600">{{ errors.maxSpeedSheetsPerHour }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Gramatura máx.</label>
          <div class="relative">
            <input v-model.number="block.maxWeightGsm" type="number" min="0" step="1" :class="inputClass(errors.maxWeightGsm)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">g/m²</span>
          </div>
          <p v-if="errors.maxWeightGsm" class="mt-1 text-xs text-rose-600">{{ errors.maxWeightGsm }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Espessura máx.</label>
          <div class="relative">
            <input v-model.number="block.maxThicknessMicrons" type="number" min="0" step="1" :class="inputClass(errors.maxThicknessMicrons)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">µm</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Acima da gramatura/espessura, não imprime.</p>
          <p v-if="errors.maxThicknessMicrons" class="mt-1 text-xs text-rose-600">{{ errors.maxThicknessMicrons }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Matriz de formato -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Matriz de formato</legend>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Calibre dois formatos com a velocidade de cada um; entre eles o orçamento interpola pelo
        tamanho, fora deles aplica o redutor. O resultado é limitado pelo envelope mín/máx acima.
      </p>
      <div class="mb-3">
        <p class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Formato mínimo</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Largura</label>
            <div class="relative">
              <input v-model.number="minFormatWidth" type="number" min="0" step="0.001" :class="inputClass(fmtErr('minFormat', 'widthMm'))" />
              <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
            </div>
            <p v-if="fmtErr('minFormat', 'widthMm')" class="mt-1 text-xs text-rose-600">{{ fmtErr('minFormat', 'widthMm') }}</p>
          </div>
          <div>
            <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Comprimento</label>
            <div class="relative">
              <input v-model.number="minFormatLength" type="number" min="0" step="0.001" :class="inputClass(fmtErr('minFormat', 'lengthMm'))" />
              <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
            </div>
            <p v-if="fmtErr('minFormat', 'lengthMm')" class="mt-1 text-xs text-rose-600">{{ fmtErr('minFormat', 'lengthMm') }}</p>
          </div>
          <div>
            <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Velocidade</label>
            <div class="relative">
              <input v-model.number="block.minFormat.sheetsPerHour" type="number" min="0" step="1" :class="inputClass(fmtErr('minFormat', 'sheetsPerHour'))" />
              <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">f/h</span>
            </div>
            <p v-if="fmtErr('minFormat', 'sheetsPerHour')" class="mt-1 text-xs text-rose-600">{{ fmtErr('minFormat', 'sheetsPerHour') }}</p>
          </div>
        </div>
      </div>
      <div class="mb-3">
        <p class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Formato máximo</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Largura</label>
            <div class="relative">
              <input v-model.number="maxFormatWidth" type="number" min="0" step="0.001" :class="inputClass(fmtErr('maxFormat', 'widthMm'))" />
              <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
            </div>
            <p v-if="fmtErr('maxFormat', 'widthMm')" class="mt-1 text-xs text-rose-600">{{ fmtErr('maxFormat', 'widthMm') }}</p>
          </div>
          <div>
            <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Comprimento</label>
            <div class="relative">
              <input v-model.number="maxFormatLength" type="number" min="0" step="0.001" :class="inputClass(fmtErr('maxFormat', 'lengthMm'))" />
              <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
            </div>
            <p v-if="fmtErr('maxFormat', 'lengthMm')" class="mt-1 text-xs text-rose-600">{{ fmtErr('maxFormat', 'lengthMm') }}</p>
          </div>
          <div>
            <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Velocidade</label>
            <div class="relative">
              <input v-model.number="block.maxFormat.sheetsPerHour" type="number" min="0" step="1" :class="inputClass(fmtErr('maxFormat', 'sheetsPerHour'))" />
              <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">f/h</span>
            </div>
            <p v-if="fmtErr('maxFormat', 'sheetsPerHour')" class="mt-1 text-xs text-rose-600">{{ fmtErr('maxFormat', 'sheetsPerHour') }}</p>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Redutor abaixo do mínimo</label>
          <div class="relative">
            <input v-model="block.belowMinFormatReducerPercent" type="number" min="0" step="0.01" :class="inputClass(errors.belowMinFormatReducerPercent)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">%</span>
          </div>
          <p v-if="errors.belowMinFormatReducerPercent" class="mt-1 text-xs text-rose-600">{{ errors.belowMinFormatReducerPercent }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Redutor acima do máximo</label>
          <div class="relative">
            <input v-model="block.aboveMaxFormatReducerPercent" type="number" min="0" step="0.01" :class="inputClass(errors.aboveMaxFormatReducerPercent)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">%</span>
          </div>
          <p v-if="errors.aboveMaxFormatReducerPercent" class="mt-1 text-xs text-rose-600">{{ errors.aboveMaxFormatReducerPercent }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Cobertura por tipo -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Cobertura por tipo de impressão (a 100%)</legend>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Traço</p>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Consumo de toner</label>
          <div class="relative">
            <input v-model="block.lineCoverage.tonerGramsPerSquareMeterAt100" type="number" min="0" step="0.01" :class="inputClass(covErr('lineCoverage', 'tonerGramsPerSquareMeterAt100'))" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">g/m²</span>
          </div>
          <p v-if="covErr('lineCoverage', 'tonerGramsPerSquareMeterAt100')" class="mt-1 text-xs text-rose-600">{{ covErr('lineCoverage', 'tonerGramsPerSquareMeterAt100') }}</p>
          <label class="block mt-3 mb-2 text-sm text-slate-700 dark:text-slate-300">Redutor de velocidade</label>
          <div class="relative">
            <input v-model="block.lineCoverage.speedReducerPercentAt100" type="number" min="0" step="0.01" :class="inputClass(covErr('lineCoverage', 'speedReducerPercentAt100'))" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">%</span>
          </div>
          <p v-if="covErr('lineCoverage', 'speedReducerPercentAt100')" class="mt-1 text-xs text-rose-600">{{ covErr('lineCoverage', 'speedReducerPercentAt100') }}</p>
        </div>
        <div>
          <p class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Imagem</p>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Consumo de toner</label>
          <div class="relative">
            <input v-model="block.imageCoverage.tonerGramsPerSquareMeterAt100" type="number" min="0" step="0.01" :class="inputClass(covErr('imageCoverage', 'tonerGramsPerSquareMeterAt100'))" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">g/m²</span>
          </div>
          <p v-if="covErr('imageCoverage', 'tonerGramsPerSquareMeterAt100')" class="mt-1 text-xs text-rose-600">{{ covErr('imageCoverage', 'tonerGramsPerSquareMeterAt100') }}</p>
          <label class="block mt-3 mb-2 text-sm text-slate-700 dark:text-slate-300">Redutor de velocidade</label>
          <div class="relative">
            <input v-model="block.imageCoverage.speedReducerPercentAt100" type="number" min="0" step="0.01" :class="inputClass(covErr('imageCoverage', 'speedReducerPercentAt100'))" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">%</span>
          </div>
          <p v-if="covErr('imageCoverage', 'speedReducerPercentAt100')" class="mt-1 text-xs text-rose-600">{{ covErr('imageCoverage', 'speedReducerPercentAt100') }}</p>
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
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Ao trocar o papel na gaveta.</p>
          <p v-if="errors.paperFeedSetupMinutes" class="mt-1 text-xs text-rose-600">{{ errors.paperFeedSetupMinutes }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Tempo por alimentação</label>
          <div class="relative">
            <input v-model.number="block.feedTimeSecondsPerLoad" type="number" min="0" step="1" :class="inputClass(errors.feedTimeSecondsPerLoad)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">seg</span>
          </div>
          <p v-if="errors.feedTimeSecondsPerLoad" class="mt-1 text-xs text-rose-600">{{ errors.feedTimeSecondsPerLoad }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Altura de alimentação</label>
          <div class="relative">
            <input v-model.number="feedLoadIncrement" type="number" min="0" step="0.001" :class="inputClass(errors.feedLoadIncrementMm)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
          </div>
          <p v-if="errors.feedLoadIncrementMm" class="mt-1 text-xs text-rose-600">{{ errors.feedLoadIncrementMm }}</p>
        </div>
      </div>
    </fieldset>
  </div>
</template>
