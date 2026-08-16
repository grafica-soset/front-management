<script setup lang="ts">
/**
 * Card de escolha de impressora (atividade 034).
 *
 * É o "combobox de impressoras" que o usuário desenhou, resolvido como CARD SELECIONÁVEL: total,
 * quebra, tempo e folha selecionada ficam todos visíveis ao mesmo tempo, em vez de aparecerem um
 * de cada vez ao abrir a lista. Comparar é a tarefa aqui — esconder os números atrapalharia.
 *
 * O mais barato vem marcado como "Melhor preço"; a diferença para ele aparece nos demais, que é
 * a informação que decide a troca.
 */
import { computed } from 'vue'
import type { MachineOption } from '@/utils/quoteDemoData'
import { brl } from '@/utils/quoteDemoData'

const props = defineProps<{
  option: MachineOption
  selected: boolean
  best: boolean
  /** Total da opção mais barata, para mostrar a diferença. */
  bestTotal: number
  /**
   * Card da máquina já escolhida: ganha o X que limpa a seleção. Depois de decidir, as outras
   * opções somem da tela — quem precisa trocar volta à lista pelo X.
   */
  clearable?: boolean
}>()

const emit = defineEmits<{
  (e: 'select'): void
  (e: 'clear'): void
}>()

const difference = computed(() => props.option.total - props.bestTotal)
</script>

<template>
  <component
    :is="clearable ? 'div' : 'button'"
    :type="clearable ? undefined : 'button'"
    @click="clearable ? undefined : emit('select')"
    class="relative w-full rounded-xl border p-4 text-left transition-colors"
    :class="
      selected
        ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500 dark:border-indigo-400 dark:bg-indigo-900/20'
        : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/50'
    "
  >
    <button
      v-if="clearable"
      type="button"
      @click.stop="emit('clear')"
      title="Trocar de impressora"
      class="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
    >
      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 14 14">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
      </svg>
      <span class="sr-only">Limpar a seleção de impressora</span>
    </button>
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-medium text-slate-900 dark:text-white">{{ option.machine.name }}</span>
          <span
            class="rounded-full px-2 py-0.5 text-xs font-medium"
            :class="
              option.machine.type === 'DIGITAL'
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
            "
          >
            {{ option.machine.type === 'DIGITAL' ? 'Digital' : 'Off-set' }}
          </span>
          <span v-if="best" class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Melhor preço
          </span>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Folha selecionada: {{ option.machine.sheetLabel }} · {{ option.piecesPerSheet }} peça(s) por folha
        </p>
      </div>
      <div class="shrink-0 text-right" :class="clearable ? 'pr-8' : ''">
        <div class="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{{ brl(option.total) }}</div>
        <div v-if="!best" class="text-xs tabular-nums text-amber-600 dark:text-amber-400">+ {{ brl(difference) }}</div>
      </div>
    </div>

    <dl class="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
      <div>
        <dt class="text-xs text-slate-500 dark:text-slate-400">Quebra</dt>
        <dd class="text-sm tabular-nums text-slate-800 dark:text-slate-100">{{ option.waste }} folhas</dd>
      </div>
      <div>
        <dt class="text-xs text-slate-500 dark:text-slate-400">Tempo</dt>
        <dd class="text-sm tabular-nums text-slate-800 dark:text-slate-100">{{ Math.round(option.minutes) }} min</dd>
      </div>
      <div>
        <dt class="text-xs text-slate-500 dark:text-slate-400">Folhas</dt>
        <dd class="text-sm tabular-nums text-slate-800 dark:text-slate-100">{{ option.sheets.toLocaleString('pt-BR') }}</dd>
      </div>
    </dl>
  </component>
</template>
