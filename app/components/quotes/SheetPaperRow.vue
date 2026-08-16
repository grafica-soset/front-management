<script setup lang="ts">
/**
 * Linha de papel de uma folha do produto — via, lâmina ou capa (atividade 034).
 *
 * Repete-se por folha no passo 1. Aqui só se escolhe a FAMÍLIA de papéis: o tamanho da folha é
 * decisão do cálculo, e lados/cores/tintas são do passo 3 (dependem da impressora escolhida).
 */
import { computed } from 'vue'
import type { QuoteSheet } from '@/types/QuoteDraft'
import { DEMO_PAPER_TYPES, sheetLabel } from '@/utils/quoteDemoData'

const props = defineProps<{
  sheet: QuoteSheet
  /** Quantas folhas desta via/lâmina/capa a tiragem consome. */
  sheetCount: number
}>()

const emit = defineEmits<{ (e: 'update', paperTypeId: number | null): void }>()

const label = computed(() => sheetLabel(props.sheet))

const onChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  emit('update', value ? Number(value) : null)
}
</script>

<template>
  <div class="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center dark:border-slate-700">
    <div class="flex w-full items-center gap-2 sm:w-40">
      <span
        class="rounded-md px-2 py-0.5 text-xs font-semibold"
        :class="
          sheet.kind === 'COVER'
            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
        "
      >
        {{ label }}
      </span>
    </div>

    <select
      :value="sheet.paperTypeId ?? ''"
      @change="onChange"
      class="block w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
    >
      <option value="">Selecione a família de papéis...</option>
      <option v-for="paper in DEMO_PAPER_TYPES" :key="paper.id" :value="paper.id">{{ paper.name }}</option>
    </select>

    <span class="shrink-0 text-xs text-slate-500 sm:w-36 sm:text-right dark:text-slate-400">
      {{ sheetCount.toLocaleString('pt-BR') }} folhas
    </span>
  </div>
</template>
