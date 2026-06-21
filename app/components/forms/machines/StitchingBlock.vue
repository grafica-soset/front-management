<script setup lang="ts">
/**
 * Campos do bloco GRAMPEADEIRA (STITCHING).
 *
 * A grampeadeira tem uma bancada com "área de manuseio" (largura útil) onde ficam os cabeçotes:
 * quanto mais blocos cabem lado a lado, mais blocos são grampeados de uma vez, reduzindo o tempo.
 * Pode ser manual ou automática. NÃO há rampa de velocidade. A área de manuseio é editada na
 * unidade da empresa; arame e espessura de grampeação em µm; cabeçotes de 1 a 4.
 */
import { computed } from 'vue'
import type { StitchingBlockRequest } from '@/types/Machine'
import { useUnitConverter } from '@/composables/useUnitConverter'

const props = defineProps<{
  block: StitchingBlockRequest
  errors: Record<string, string>
}>()

const { suffix: lengthUnit, fromMillimeters, toMillimeters } = useUnitConverter()

const handlingAreaWidth = computed<number>({
  get: () => fromMillimeters(props.block.handlingAreaWidthMm) ?? 0,
  set: (v) => (props.block.handlingAreaWidthMm = toMillimeters(v) ?? 0),
})

const inputClass = (err?: string) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-3 pr-14 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  err ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]
</script>

<template>
  <div class="space-y-6">
    <p class="text-xs text-slate-500 dark:text-slate-400">
      A <strong>área de manuseio</strong> (largura da bancada) define quantos blocos são grampeados
      de uma vez — quanto mais blocos cabem lado a lado, menor o tempo. Cada <strong>descida</strong>
      do cabeçote aplica até um grampo por cabeçote (1 a 4).
    </p>

    <!-- Tipo e bancada -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Bancada e operação</legend>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Tipo de máquina</label>
          <select v-model="block.automatic" class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
            <option :value="true">Automática</option>
            <option :value="false">Manual</option>
          </select>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Área de manuseio (largura)</label>
          <div class="relative">
            <input v-model.number="handlingAreaWidth" type="number" min="0" step="0.001" :class="inputClass(errors.handlingAreaWidthMm)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{{ lengthUnit }}</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Largura útil da bancada.</p>
          <p v-if="errors.handlingAreaWidthMm" class="mt-1 text-xs text-rose-600">{{ errors.handlingAreaWidthMm }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Cabeçotes</label>
          <select v-model.number="block.headCount" class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
            <option :value="1">1</option>
            <option :value="2">2</option>
            <option :value="3">3</option>
            <option :value="4">4</option>
          </select>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Grampos por descida (1 a 4).</p>
          <p v-if="errors.headCount" class="mt-1 text-xs text-rose-600">{{ errors.headCount }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Tempos -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Tempos</legend>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Setup dos grampos</label>
          <div class="relative">
            <input v-model.number="block.stapleSetupMinutes" type="number" min="0" step="1" :class="inputClass(errors.stapleSetupMinutes)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">min</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Fixo por trabalho.</p>
          <p v-if="errors.stapleSetupMinutes" class="mt-1 text-xs text-rose-600">{{ errors.stapleSetupMinutes }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Alimentação (largura máx.)</label>
          <div class="relative">
            <input v-model.number="block.feedTimeSecondsPerLoad" type="number" min="0" step="1" :class="inputClass(errors.feedTimeSecondsPerLoad)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">seg</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Tempo p/ 1 bloco; dividido pelo nº de blocos.</p>
          <p v-if="errors.feedTimeSecondsPerLoad" class="mt-1 text-xs text-rose-600">{{ errors.feedTimeSecondsPerLoad }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Descida do cabeçote</label>
          <div class="relative">
            <input v-model.number="block.headDescentSeconds" type="number" min="0" step="1" :class="inputClass(errors.headDescentSeconds)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">seg</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Tempo de uma descida.</p>
          <p v-if="errors.headDescentSeconds" class="mt-1 text-xs text-rose-600">{{ errors.headDescentSeconds }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Arame e espessura -->
    <fieldset class="rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Arame e espessura</legend>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Espessura mín. do arame</label>
          <div class="relative">
            <input v-model.number="block.minWireThicknessMicrons" type="number" min="0" step="1" :class="inputClass(errors.minWireThicknessMicrons)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">µm</span>
          </div>
          <p v-if="errors.minWireThicknessMicrons" class="mt-1 text-xs text-rose-600">{{ errors.minWireThicknessMicrons }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Espessura máx. do arame</label>
          <div class="relative">
            <input v-model.number="block.maxWireThicknessMicrons" type="number" min="0" step="1" :class="inputClass(errors.maxWireThicknessMicrons)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">µm</span>
          </div>
          <p v-if="errors.maxWireThicknessMicrons" class="mt-1 text-xs text-rose-600">{{ errors.maxWireThicknessMicrons }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Espessura máx. de grampeação</label>
          <div class="relative">
            <input v-model.number="block.maxStaplingThicknessMicrons" type="number" min="0" step="1" :class="inputClass(errors.maxStaplingThicknessMicrons)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">µm</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Altura máxima do bloco.</p>
          <p v-if="errors.maxStaplingThicknessMicrons" class="mt-1 text-xs text-rose-600">{{ errors.maxStaplingThicknessMicrons }}</p>
        </div>
      </div>
    </fieldset>
  </div>
</template>
