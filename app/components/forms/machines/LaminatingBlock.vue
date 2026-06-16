<script setup lang="ts">
/**
 * Campos do bloco PLASTIFICADORA (LAMINATING): tempo de setup e velocidade em metros/minuto.
 *
 * A plastificadora funciona com um rolo, 1 folha por vez. Por isso tem uma velocidade em
 * metros/minuto: o tempo de rodagem (calculado no orçamento) depende do comprimento total das
 * folhas. A máquina é manual (sem alimentador).
 */
import type { LaminatingBlock } from '@/types/Machine'

defineProps<{
  block: LaminatingBlock
  errors: Record<string, string>
}>()

const inputClass = (err?: string) => [
  'bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full min-w-0 p-3 pr-16 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
  err ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '',
]
</script>

<template>
  <div class="space-y-1">
    <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
      A plastificadora passa <strong>1 folha por vez</strong> no rolo. A velocidade é em
      <strong>metros por minuto</strong>; o tempo de rodagem é calculado no orçamento a partir do
      comprimento das folhas.
    </p>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Tempo de setup da máquina</label>
        <div class="relative">
          <input v-model.number="block.setupMinutes" type="number" min="0" step="1" :class="inputClass(errors.setupMinutes)" />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">min</span>
        </div>
        <p v-if="errors.setupMinutes" class="mt-1 text-xs text-rose-600">{{ errors.setupMinutes }}</p>
      </div>
      <div>
        <label class="block mb-2 text-sm text-slate-700 dark:text-slate-300">Velocidade</label>
        <div class="relative">
          <input v-model="block.speedMetersPerMinute" type="number" min="0" step="0.01" :class="inputClass(errors.speedMetersPerMinute)" />
          <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">m/min</span>
        </div>
        <p v-if="errors.speedMetersPerMinute" class="mt-1 text-xs text-rose-600">{{ errors.speedMetersPerMinute }}</p>
      </div>
    </div>
  </div>
</template>
