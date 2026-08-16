<script setup lang="ts">
/**
 * Trilho de preço do assistente (atividade 034).
 *
 * Fica fixo ao lado dos passos e se preenche conforme o usuário configura. É a peça que responde
 * à pergunta que ele faz o tempo todo — "quanto está dando?" — sem precisar chegar ao passo 4.
 *
 * Enquanto falta dado para calcular, mostra o que falta em vez de exibir zero: zero parece preço.
 */
import { computed } from 'vue'
import type { ProductCost } from '@/types/QuoteDraft'
import { brl } from '@/utils/quoteDemoData'

const props = defineProps<{
  cost: ProductCost
  /** Pendências que impedem o cálculo (ex.: "informe a tiragem"). */
  blockers: string[]
  sheetsPerUnit: number
  unitLabel: string
  canSave: boolean
  saveLabel: string
}>()

const emit = defineEmits<{ (e: 'save'): void }>()

const hasNumbers = computed(() => props.blockers.length === 0)
</script>

<template>
  <aside class="lg:sticky lg:top-6">
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Resumo</h2>
      </div>

      <div v-if="!hasNumbers" class="px-5 py-4">
        <p class="text-sm text-slate-500 dark:text-slate-400">Para calcular, falta:</p>
        <ul class="mt-2 space-y-1.5">
          <li v-for="blocker in blockers" :key="blocker" class="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
            <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            {{ blocker }}
          </li>
        </ul>
      </div>

      <template v-else>
        <dl class="divide-y divide-slate-100 dark:divide-slate-700/60">
          <div v-for="line in cost.lines" :key="line.label" class="flex items-baseline justify-between gap-3 px-5 py-2.5">
            <dt class="min-w-0">
              <span class="text-sm text-slate-700 dark:text-slate-200">{{ line.label }}</span>
              <span v-if="line.detail" class="block truncate text-xs text-slate-400 dark:text-slate-500">{{ line.detail }}</span>
            </dt>
            <dd class="shrink-0 text-sm tabular-nums text-slate-900 dark:text-white">{{ brl(line.value) }}</dd>
          </div>
        </dl>

        <div class="border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          <div class="flex items-baseline justify-between gap-3">
            <span class="text-sm font-semibold text-slate-900 dark:text-white">Total</span>
            <span class="text-xl font-bold tabular-nums text-indigo-700 dark:text-indigo-300">{{ brl(cost.total) }}</span>
          </div>
          <div class="mt-1 flex items-baseline justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>por {{ unitLabel }}</span>
            <span class="tabular-nums">{{ brl(cost.unitCost) }}</span>
          </div>
        </div>

        <dl class="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-100 text-center dark:border-slate-700 dark:bg-slate-700/60">
          <div class="bg-white px-3 py-3 dark:bg-slate-800">
            <dt class="text-xs text-slate-500 dark:text-slate-400">Folhas / {{ unitLabel }}</dt>
            <dd class="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{{ sheetsPerUnit }}</dd>
          </div>
          <div class="bg-white px-3 py-3 dark:bg-slate-800">
            <dt class="text-xs text-slate-500 dark:text-slate-400">Tempo</dt>
            <dd class="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{{ Math.round(cost.totalMinutes) }} min</dd>
          </div>
        </dl>
      </template>

      <div class="border-t border-slate-200 px-5 py-4 dark:border-slate-700">
        <button
          type="button"
          :disabled="!canSave"
          @click="emit('save')"
          class="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ saveLabel }}
        </button>
      </div>
    </div>
  </aside>
</template>
