<script setup lang="ts">
/**
 * Campos do bloco CORTE E VINCO (DIE_CUTTING).
 *
 * A máquina não tem velocidade fixa: ela depende do TAMANHO DO FORMATO. O usuário calibra
 * dois pontos — o formato mínimo e o máximo — cada um com sua velocidade (folhas/h) e seu
 * tempo de setup de faca. Entre eles, o orçamento interpola; fora deles aplica o redutor.
 *
 * A máquina pode ser MANUAL ou AUTOMÁTICA. Só a automática tem alimentação de papel (e, no
 * formulário pai, a altura máxima da pilha).
 */
import { computed, watch } from 'vue'
import type { DieCuttingBlockRequest, DieCuttingFormatPointRequest } from '@/types/Machine'
import { defaultDieCuttingFeed } from '@/utils/machineCatalog'
import { useUnitConverter } from '@/composables/useUnitConverter'

const props = defineProps<{
  block: DieCuttingBlockRequest
  errors: Record<string, string>
}>()

const { suffix: lengthUnit, fromMillimeters, toMillimeters } = useUnitConverter()

// Liga/desliga o bloco de alimentação conforme a máquina é automática.
watch(
  () => props.block.automatic,
  (automatic) => {
    if (automatic && !props.block.feed) props.block.feed = defaultDieCuttingFeed()
    if (!automatic) props.block.feed = null
  },
)

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
const feedLoadIncrement = computed<number>({
  get: () => fromMillimeters(props.block.feed?.feedLoadIncrementMm ?? 0) ?? 0,
  set: (v) => {
    if (props.block.feed) props.block.feed.feedLoadIncrementMm = toMillimeters(v) ?? 0
  },
})

const inputClass = (err?: string, withSuffix = false) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  withSuffix ? 'pr-12' : '',
  err ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]

/** Chave de erro de cada ponto da matriz. */
const formatErr = (which: 'minFormat' | 'maxFormat', field: keyof DieCuttingFormatPointRequest) =>
  props.errors[`${which}.${field}`]
</script>

<template>
  <div class="space-y-6">
    <!-- Tipo de funcionamento -->
    <div>
      <span class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Funcionamento</span>
      <div class="flex flex-wrap gap-4">
        <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input v-model="block.automatic" type="radio" :value="false" class="w-4 h-4 text-indigo-600" />
          Manual
        </label>
        <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input v-model="block.automatic" type="radio" :value="true" class="w-4 h-4 text-indigo-600" />
          Automática
        </label>
      </div>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        A automática possui alimentador (altura da pilha e tempos de alimentação); a manual não.
      </p>
    </div>

    <!-- Esquadro -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Setup de esquadros Frontal e Lateral</label>
        <div class="relative">
          <input v-model.number="block.squareSetupMinutes" type="number" min="0" step="1" :class="inputClass(errors.squareSetupMinutes, true)" />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">min</span>
        </div>
        <p v-if="errors.squareSetupMinutes" class="mt-1 text-xs text-rose-600">{{ errors.squareSetupMinutes }}</p>
      </div>
    </div>

    <!-- Matriz de formato -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Matriz de formato</legend>
      <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Calibre dois formatos (largura × comprimento) com a velocidade e o tempo de setup de faca
        medidos em cada um. Entre eles o orçamento interpola pelo tamanho; fora deles aplica o redutor.
      </p>

      <!-- Formato mínimo -->
      <div class="mb-4">
        <p class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Formato mínimo</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div>
            <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Setup de faca</label>
            <div class="relative">
              <input v-model.number="block.minFormat.dieSetupMinutes" type="number" min="0" step="1" :class="inputClass(formatErr('minFormat', 'dieSetupMinutes'), true)" />
              <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">min</span>
            </div>
            <p v-if="formatErr('minFormat', 'dieSetupMinutes')" class="mt-1 text-xs text-rose-600">{{ formatErr('minFormat', 'dieSetupMinutes') }}</p>
          </div>
        </div>
      </div>

      <!-- Formato máximo -->
      <div>
        <p class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Formato máximo</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div>
            <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Setup de faca</label>
            <div class="relative">
              <input v-model.number="block.maxFormat.dieSetupMinutes" type="number" min="0" step="1" :class="inputClass(formatErr('maxFormat', 'dieSetupMinutes'), true)" />
              <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">min</span>
            </div>
            <p v-if="formatErr('maxFormat', 'dieSetupMinutes')" class="mt-1 text-xs text-rose-600">{{ formatErr('maxFormat', 'dieSetupMinutes') }}</p>
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

    <!-- Alimentação de papel (apenas automática) -->
    <fieldset v-if="block.automatic && block.feed" class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Alimentação de papel</legend>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        O operador alimenta a máquina em levas até o limite máximo de altura da pilha (definido acima).
      </p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Setup de alimentação</label>
          <div class="relative">
            <input v-model.number="block.feed.paperFeedSetupMinutes" type="number" min="0" step="1" :class="inputClass(errors['feed.paperFeedSetupMinutes'], true)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">min</span>
          </div>
          <p v-if="errors['feed.paperFeedSetupMinutes']" class="mt-1 text-xs text-rose-600">{{ errors['feed.paperFeedSetupMinutes'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Tempo por alimentação</label>
          <div class="relative">
            <input v-model.number="block.feed.feedTimeSecondsPerLoad" type="number" min="0" step="1" :class="inputClass(errors['feed.feedTimeSecondsPerLoad'], true)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">seg</span>
          </div>
          <p v-if="errors['feed.feedTimeSecondsPerLoad']" class="mt-1 text-xs text-rose-600">{{ errors['feed.feedTimeSecondsPerLoad'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Altura de alimentação</label>
          <div class="relative">
            <input v-model.number="feedLoadIncrement" type="number" min="0" step="0.001" :class="inputClass(errors['feed.feedLoadIncrementMm'], true)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
          </div>
          <p v-if="errors['feed.feedLoadIncrementMm']" class="mt-1 text-xs text-rose-600">{{ errors['feed.feedLoadIncrementMm'] }}</p>
        </div>
      </div>
    </fieldset>
  </div>
</template>
