<script setup lang="ts">
/**
 * Campos do bloco GUILLOTINE: os tempos unitários de corte (em segundos).
 *
 * A guilhotina corta o papel do formato maior para o menor em múltiplos. A cada descida
 * da lâmina há um corte (tempo de descida) e o operador move/vira o papel (movimento de
 * papel). O setup de medidas é aplicado a cada medida distinta. O número de descidas vem
 * da tabela de conversões do Formato (cutCount) no momento do orçamento.
 */
import { computed } from 'vue'
import type { GuillotineBlock } from '@/types/Machine'
import { useUnitConverter } from '@/composables/useUnitConverter'

const props = defineProps<{
  block: GuillotineBlock
  errors: Record<string, string>
}>()

const { suffix: lengthUnit, fromMillimeters, toMillimeters } = useUnitConverter()

/** Altura de cada leva de alimentação editada na unidade da empresa (armazenada em mm). */
const feedLoadIncrement = computed<number>({
  get: () => fromMillimeters(props.block.feedLoadIncrementMm) ?? 0,
  set: (v) => {
    props.block.feedLoadIncrementMm = toMillimeters(v) ?? 0
  },
})

const inputClass = (err?: string) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-3 pr-12 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  err ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]
</script>

<template>
  <div class="space-y-1">
    <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
      Tempos unitários usados no orçamento para calcular o tempo total de corte. O número de
      descidas vem da tabela de conversões do Formato.
    </p>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Tempo de descida da lâmina</label>
        <div class="relative">
          <input v-model.number="block.bladeDescentTimeSeconds" type="number" min="0" step="1" :class="inputClass(errors.bladeDescentTimeSeconds)" />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">seg</span>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">1x a cada descida (corte).</p>
        <p v-if="errors.bladeDescentTimeSeconds" class="mt-1 text-xs text-rose-600">{{ errors.bladeDescentTimeSeconds }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Movimentação de papel</label>
        <div class="relative">
          <input v-model.number="block.paperMovementTimeSeconds" type="number" min="0" step="1" :class="inputClass(errors.paperMovementTimeSeconds)" />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">seg</span>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Tempo para movimentar o papel dentro da máquina durante o uso — ex.: reposicionar/virar
          a pilha de folhas para o próximo corte. Aplicado 1x a cada descida.
        </p>
        <p v-if="errors.paperMovementTimeSeconds" class="mt-1 text-xs text-rose-600">{{ errors.paperMovementTimeSeconds }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Setup das medidas</label>
        <div class="relative">
          <input v-model.number="block.measureSetupTimeSeconds" type="number" min="0" step="1" :class="inputClass(errors.measureSetupTimeSeconds)" />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">seg</span>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">1x a cada medida distinta.</p>
        <p v-if="errors.measureSetupTimeSeconds" class="mt-1 text-xs text-rose-600">{{ errors.measureSetupTimeSeconds }}</p>
      </div>
    </div>

    <!-- Alimentação de papel (igual à offset): levas até o limite máximo da pilha -->
    <fieldset class="mt-4 rounded-lg border border-slate-200 p-4 min-w-0 dark:border-slate-700">
      <legend class="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Alimentação de papel</legend>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        O operador alimenta a guilhotina em levas (ex.: {{ lengthUnit === 'cm' ? '4 cm' : '40 mm' }} por manipulação)
        até o limite máximo de altura da pilha da máquina.
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Tempo por alimentação</label>
          <div class="relative">
            <input v-model.number="block.feedTimeSecondsPerLoad" type="number" min="0" step="1" :class="inputClass(errors.feedTimeSecondsPerLoad)" />
            <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">seg</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Tempo para carregar uma leva de papel.</p>
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
  </div>
</template>
