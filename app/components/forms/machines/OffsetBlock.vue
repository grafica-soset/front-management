<script setup lang="ts">
/**
 * Bloco específico da impressora OFFSET — modelo de Rampa de Velocidade
 * (cf. .docs/offset-machines-api.md). Edita diretamente o objeto reativo
 * `block` recebido por prop (o pai detém a mesma referência e monta o payload).
 *
 * Organização: configuração geral → tempos de setup → parâmetros gerais da
 * rampa → uma seção por tipo de tinta (ajustes + matriz de 6 faixas de volume).
 */
import { computed } from 'vue'
import type { InkType, OffsetBlock, OffsetTier } from '@/types/Machine'
import {
  INK_TYPES,
  INK_TYPE_LABELS,
  QUANTITY_TIER_LABELS,
} from '@/utils/machineCatalog'

const props = defineProps<{
  block: OffsetBlock
  errors: Record<string, string>
}>()

const colorOptions = Array.from({ length: 10 }, (_, i) => i + 1)

/** Tiers agrupados por tipo de tinta (referências preservadas p/ v-model). */
const tiersByInk = computed<Record<InkType, OffsetTier[]>>(() => {
  const map = { LINE: [], CMYK: [], PANTONE: [] } as Record<InkType, OffsetTier[]>
  for (const tier of props.block.speedRamp.tiers) map[tier.inkType].push(tier)
  return map
})

const inkSettingFor = (ink: InkType) =>
  props.block.speedRamp.inkSettings.find((s) => s.inkType === ink)!

const inputClass = (errKey?: string) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  errKey && props.errors[errKey] ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]
const cellClass =
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white'
</script>

<template>
  <div class="space-y-6">
    <!-- Configuração geral -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Nº de cores (castelos)</label>
        <select v-model.number="block.numberOfColors" :class="inputClass('numberOfColors')">
          <option v-for="n in colorOptions" :key="n" :value="n">{{ n }}</option>
        </select>
        <p v-if="errors['numberOfColors']" class="mt-1 text-xs text-rose-600">{{ errors['numberOfColors'] }}</p>
      </div>
      <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 sm:pt-8">
        <input v-model="block.supportsNumbering" type="checkbox" class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600" />
        Possui módulo numerador?
      </label>
      <div v-if="block.supportsNumbering">
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Máx. de numeradores</label>
        <input v-model.number="block.maxNumberingUnits" type="number" min="0" step="1" :class="inputClass('maxNumberingUnits')" />
        <p v-if="errors['maxNumberingUnits']" class="mt-1 text-xs text-rose-600">{{ errors['maxNumberingUnits'] }}</p>
      </div>
    </div>

    <!-- Tempos de setup -->
    <fieldset class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Tempos de setup</legend>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Acerto geral (min)</label>
          <input v-model.number="block.setupTimes.setupMinutes" type="number" min="0" step="1" :class="inputClass('setupTimes.setupMinutes')" />
          <p v-if="errors['setupTimes.setupMinutes']" class="mt-1 text-xs text-rose-600">{{ errors['setupTimes.setupMinutes'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Ajuste do papel (min)</label>
          <input v-model.number="block.setupTimes.paperFeedSetupMinutes" type="number" min="0" step="1" :class="inputClass('setupTimes.paperFeedSetupMinutes')" />
          <p v-if="errors['setupTimes.paperFeedSetupMinutes']" class="mt-1 text-xs text-rose-600">{{ errors['setupTimes.paperFeedSetupMinutes'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Lavagem por cor (min)</label>
          <input v-model.number="block.setupTimes.washMinutesPerColor" type="number" min="0" step="1" :class="inputClass('setupTimes.washMinutesPerColor')" />
          <p v-if="errors['setupTimes.washMinutesPerColor']" class="mt-1 text-xs text-rose-600">{{ errors['setupTimes.washMinutesPerColor'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Carga do alimentador (s/leva)</label>
          <input v-model.number="block.setupTimes.feedTimeSecondsPerLoad" type="number" min="0" step="1" :class="inputClass('setupTimes.feedTimeSecondsPerLoad')" />
          <p v-if="errors['setupTimes.feedTimeSecondsPerLoad']" class="mt-1 text-xs text-rose-600">{{ errors['setupTimes.feedTimeSecondsPerLoad'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Altura da leva (mm)</label>
          <input v-model.number="block.setupTimes.feedLoadIncrementMm" type="number" min="1" step="1" :class="inputClass('setupTimes.feedLoadIncrementMm')" />
          <p v-if="errors['setupTimes.feedLoadIncrementMm']" class="mt-1 text-xs text-rose-600">{{ errors['setupTimes.feedLoadIncrementMm'] }}</p>
        </div>
        <div v-if="block.supportsNumbering">
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Setup por numerador (min)</label>
          <input v-model.number="block.setupTimes.numberingSetupMinutesPerUnit" type="number" min="0" step="1" :class="inputClass('setupTimes.numberingSetupMinutesPerUnit')" />
          <p v-if="errors['setupTimes.numberingSetupMinutesPerUnit']" class="mt-1 text-xs text-rose-600">{{ errors['setupTimes.numberingSetupMinutesPerUnit'] }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Parâmetros gerais da rampa -->
    <fieldset class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Rampa de velocidade — parâmetros gerais</legend>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Gramatura ideal mín. (g/m²)</label>
          <input v-model.number="block.speedRamp.idealWeightMinGsm" type="number" min="0" step="1" :class="inputClass('speedRamp.idealWeightMinGsm')" />
          <p v-if="errors['speedRamp.idealWeightMinGsm']" class="mt-1 text-xs text-rose-600">{{ errors['speedRamp.idealWeightMinGsm'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Gramatura ideal máx. (g/m²)</label>
          <input v-model.number="block.speedRamp.idealWeightMaxGsm" type="number" min="0" step="1" :class="inputClass('speedRamp.idealWeightMaxGsm')" />
          <p v-if="errors['speedRamp.idealWeightMaxGsm']" class="mt-1 text-xs text-rose-600">{{ errors['speedRamp.idealWeightMaxGsm'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Redutor abaixo do ideal (%)</label>
          <input v-model="block.speedRamp.belowIdealSpeedReducerPercent" type="number" min="0" step="any" :class="inputClass('speedRamp.belowIdealSpeedReducerPercent')" />
          <p v-if="errors['speedRamp.belowIdealSpeedReducerPercent']" class="mt-1 text-xs text-rose-600">{{ errors['speedRamp.belowIdealSpeedReducerPercent'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Redutor acima do ideal (%)</label>
          <input v-model="block.speedRamp.aboveIdealSpeedReducerPercent" type="number" min="0" step="any" :class="inputClass('speedRamp.aboveIdealSpeedReducerPercent')" />
          <p v-if="errors['speedRamp.aboveIdealSpeedReducerPercent']" class="mt-1 text-xs text-rose-600">{{ errors['speedRamp.aboveIdealSpeedReducerPercent'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Redutor impressão chapada (%)</label>
          <input v-model="block.speedRamp.fullCoverageSpeedReducerPercent" type="number" min="0" step="any" :class="inputClass('speedRamp.fullCoverageSpeedReducerPercent')" />
          <p v-if="errors['speedRamp.fullCoverageSpeedReducerPercent']" class="mt-1 text-xs text-rose-600">{{ errors['speedRamp.fullCoverageSpeedReducerPercent'] }}</p>
        </div>
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Redutor numeração (%)</label>
          <input v-model="block.speedRamp.numberingSpeedReducerPercent" type="number" min="0" step="any" :class="inputClass('speedRamp.numberingSpeedReducerPercent')" />
          <p v-if="errors['speedRamp.numberingSpeedReducerPercent']" class="mt-1 text-xs text-rose-600">{{ errors['speedRamp.numberingSpeedReducerPercent'] }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Matriz por tipo de tinta -->
    <fieldset class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Velocidade e quebra por tipo de tinta</legend>
      <p v-if="errors['matrix']" class="mb-3 text-xs text-rose-600">{{ errors['matrix'] }}</p>

      <div v-for="ink in INK_TYPES" :key="ink" class="mb-6 last:mb-0">
        <h4 class="mb-3 text-sm font-semibold text-indigo-700 dark:text-indigo-300">{{ INK_TYPE_LABELS[ink] }}</h4>

        <!-- Ajustes do tipo de tinta -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label class="block mb-2 text-xs text-slate-600 dark:text-slate-400">Teto c/ numeração (folhas/h)</label>
            <input v-model.number="inkSettingFor(ink).numberingMaxSheetsPerHour" type="number" min="0" step="1" :class="cellClass" />
          </div>
          <div>
            <label class="block mb-2 text-xs text-slate-600 dark:text-slate-400">Quebra inicial (folhas)</label>
            <input v-model.number="inkSettingFor(ink).initialWasteSheets" type="number" min="0" step="1" :class="cellClass" />
          </div>
          <div>
            <label class="block mb-2 text-xs text-slate-600 dark:text-slate-400">Quebra extra chapado (%)</label>
            <input v-model="inkSettingFor(ink).fullCoverageExtraWastePercent" type="number" min="0" step="any" :class="cellClass" />
          </div>
        </div>

        <!-- Matriz de faixas -->
        <div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table class="w-full text-sm">
            <thead class="text-xs text-slate-600 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-300">
              <tr>
                <th class="px-3 py-2 text-left font-semibold">Faixa de quantidade</th>
                <th class="px-3 py-2 text-left font-semibold">Velocidade (folhas/h)</th>
                <th class="px-3 py-2 text-left font-semibold">Quebra (%)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
              <tr v-for="tier in tiersByInk[ink]" :key="tier.quantityTier">
                <td class="px-3 py-2 text-slate-700 dark:text-slate-200 whitespace-nowrap">{{ QUANTITY_TIER_LABELS[tier.quantityTier] }}</td>
                <td class="px-3 py-2">
                  <input v-model.number="tier.sheetsPerHour" type="number" min="0" step="1" :class="cellClass" />
                </td>
                <td class="px-3 py-2">
                  <input v-model="tier.wastePercent" type="number" min="0" step="any" :class="cellClass" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </fieldset>
  </div>
</template>
