<script setup lang="ts">
/**
 * Campos do bloco SERIGRAFIA (SCREEN_PRINTING).
 *
 * A serigrafia imprime por TELAS (uma por cor). A velocidade vem de uma MATRIZ DE FORMATO
 * (formato mínimo e máximo, cada um com sua velocidade em folhas/h); entre eles o orçamento
 * interpola pelo tamanho, fora deles aplica o redutor. Os setups (tela, lavagem) e a quebra são
 * POR TELA — multiplicados pelo nº de telas no orçamento. A máquina é manual (sem alimentador).
 */
import { computed } from 'vue'
import type { ScreenPrintingBlockRequest, ScreenPrintingFormatPointRequest } from '@/types/Machine'
import { useUnitConverter } from '@/composables/useUnitConverter'

const props = defineProps<{
  block: ScreenPrintingBlockRequest
  errors: Record<string, string>
}>()

const { suffix: lengthUnit, fromMillimeters, toMillimeters } = useUnitConverter()

/** Cria um par get/set que edita uma dimensão (mm) na unidade da empresa. */
function dimensionModel(get: () => number, set: (mm: number) => void) {
  return computed<number>({
    get: () => fromMillimeters(get()) ?? 0,
    set: (v) => set(toMillimeters(v) ?? 0),
  })
}

// Dimensões (largura × comprimento) dos pontos da matriz, editadas na unidade da empresa.
const minFormatWidth = dimensionModel(
  () => props.block.minFormat.widthMm,
  (mm) => (props.block.minFormat.widthMm = mm),
)
const minFormatLength = dimensionModel(
  () => props.block.minFormat.lengthMm,
  (mm) => (props.block.minFormat.lengthMm = mm),
)
const maxFormatWidth = dimensionModel(
  () => props.block.maxFormat.widthMm,
  (mm) => (props.block.maxFormat.widthMm = mm),
)
const maxFormatLength = dimensionModel(
  () => props.block.maxFormat.lengthMm,
  (mm) => (props.block.maxFormat.lengthMm = mm),
)

const inputClass = (err?: string, withSuffix = false) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  withSuffix ? 'pr-12' : '',
  err ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]

/** Chave de erro de cada ponto da matriz. */
const formatErr = (which: 'minFormat' | 'maxFormat', field: keyof ScreenPrintingFormatPointRequest) =>
  props.errors[`${which}.${field}`]
</script>

<template>
  <div class="space-y-6">
    <p class="text-xs text-slate-500 dark:text-slate-400">
      A serigrafia é <strong>manual</strong> e conta por <strong>telas</strong> (uma por cor). Os
      tempos de tela, a lavagem e a quebra são <strong>por tela</strong> — informados por tela aqui
      e multiplicados pelo número de telas no orçamento.
    </p>

    <!-- Setups e por tela -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Setup de esquadros Frontal e Lateral</label>
        <div class="relative">
          <input v-model.number="block.squareSetupMinutes" type="number" min="0" step="1" :class="inputClass(errors.squareSetupMinutes, true)" />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">min</span>
        </div>
        <p v-if="errors.squareSetupMinutes" class="mt-1 text-xs text-rose-600">{{ errors.squareSetupMinutes }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Tempo de setup de tela</label>
        <div class="relative">
          <input v-model.number="block.screenSetupMinutes" type="number" min="0" step="1" :class="inputClass(errors.screenSetupMinutes, true)" />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">min</span>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Por tela.</p>
        <p v-if="errors.screenSetupMinutes" class="mt-1 text-xs text-rose-600">{{ errors.screenSetupMinutes }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Lavagem por cor</label>
        <div class="relative">
          <input v-model.number="block.washMinutesPerColor" type="number" min="0" step="1" :class="inputClass(errors.washMinutesPerColor, true)" />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">min</span>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Por tela.</p>
        <p v-if="errors.washMinutesPerColor" class="mt-1 text-xs text-rose-600">{{ errors.washMinutesPerColor }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Quebra por cor</label>
        <div class="relative">
          <input v-model.number="block.wasteSheetsPerColor" type="number" min="0" step="1" :class="inputClass(errors.wasteSheetsPerColor, true)" />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">folhas</span>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Por tela.</p>
        <p v-if="errors.wasteSheetsPerColor" class="mt-1 text-xs text-rose-600">{{ errors.wasteSheetsPerColor }}</p>
      </div>
    </div>

    <!-- Matriz de formato -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Matriz de formato</legend>
      <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Calibre dois formatos (largura × comprimento) com a velocidade medida em cada um. Entre eles
        o orçamento interpola pelo tamanho; fora deles aplica o redutor.
      </p>

      <!-- Formato mínimo -->
      <div class="mb-4">
        <p class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Formato mínimo</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Largura</label>
            <div class="relative">
              <input v-model.number="minFormatWidth" type="number" min="0" step="0.001" :class="inputClass(formatErr('minFormat', 'widthMm'), true)" />
              <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
            </div>
            <p v-if="formatErr('minFormat', 'widthMm')" class="mt-1 text-xs text-rose-600">{{ formatErr('minFormat', 'widthMm') }}</p>
          </div>
          <div>
            <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Comprimento</label>
            <div class="relative">
              <input v-model.number="minFormatLength" type="number" min="0" step="0.001" :class="inputClass(formatErr('minFormat', 'lengthMm'), true)" />
              <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
            </div>
            <p v-if="formatErr('minFormat', 'lengthMm')" class="mt-1 text-xs text-rose-600">{{ formatErr('minFormat', 'lengthMm') }}</p>
          </div>
          <div>
            <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Velocidade</label>
            <div class="relative">
              <input v-model.number="block.minFormat.sheetsPerHour" type="number" min="0" step="1" :class="inputClass(formatErr('minFormat', 'sheetsPerHour'), true)" />
              <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">f/h</span>
            </div>
            <p v-if="formatErr('minFormat', 'sheetsPerHour')" class="mt-1 text-xs text-rose-600">{{ formatErr('minFormat', 'sheetsPerHour') }}</p>
          </div>
        </div>
      </div>

      <!-- Formato máximo -->
      <div>
        <p class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Formato máximo</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Largura</label>
            <div class="relative">
              <input v-model.number="maxFormatWidth" type="number" min="0" step="0.001" :class="inputClass(formatErr('maxFormat', 'widthMm'), true)" />
              <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
            </div>
            <p v-if="formatErr('maxFormat', 'widthMm')" class="mt-1 text-xs text-rose-600">{{ formatErr('maxFormat', 'widthMm') }}</p>
          </div>
          <div>
            <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Comprimento</label>
            <div class="relative">
              <input v-model.number="maxFormatLength" type="number" min="0" step="0.001" :class="inputClass(formatErr('maxFormat', 'lengthMm'), true)" />
              <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
            </div>
            <p v-if="formatErr('maxFormat', 'lengthMm')" class="mt-1 text-xs text-rose-600">{{ formatErr('maxFormat', 'lengthMm') }}</p>
          </div>
          <div>
            <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Velocidade</label>
            <div class="relative">
              <input v-model.number="block.maxFormat.sheetsPerHour" type="number" min="0" step="1" :class="inputClass(formatErr('maxFormat', 'sheetsPerHour'), true)" />
              <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">f/h</span>
            </div>
            <p v-if="formatErr('maxFormat', 'sheetsPerHour')" class="mt-1 text-xs text-rose-600">{{ formatErr('maxFormat', 'sheetsPerHour') }}</p>
          </div>
        </div>
      </div>

      <p v-if="errors.maxFormat" class="mt-2 text-xs text-rose-600">{{ errors.maxFormat }}</p>

      <!-- Redutores fora da faixa -->
      <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Redutor abaixo do mínimo</label>
          <div class="relative">
            <input v-model="block.belowMinSpeedReducerPercent" type="number" min="0" step="0.01" :class="inputClass(errors.belowMinSpeedReducerPercent, true)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">%</span>
          </div>
          <p v-if="errors.belowMinSpeedReducerPercent" class="mt-1 text-xs text-rose-600">{{ errors.belowMinSpeedReducerPercent }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Redutor acima do máximo</label>
          <div class="relative">
            <input v-model="block.aboveMaxSpeedReducerPercent" type="number" min="0" step="0.01" :class="inputClass(errors.aboveMaxSpeedReducerPercent, true)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">%</span>
          </div>
          <p v-if="errors.aboveMaxSpeedReducerPercent" class="mt-1 text-xs text-rose-600">{{ errors.aboveMaxSpeedReducerPercent }}</p>
        </div>
      </div>
    </fieldset>
  </div>
</template>
