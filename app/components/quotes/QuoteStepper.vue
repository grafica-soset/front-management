<script setup lang="ts">
/**
 * Passo a passo do assistente de produto (atividade 034).
 *
 * Mostra onde o usuário está e deixa VOLTAR clicando — passo já visitado e válido é navegável.
 * Avançar continua sendo pelo botão, para o usuário não pular etapa sem preencher.
 */
const props = defineProps<{
  steps: { key: string; label: string }[]
  current: number
  /** Até qual passo o usuário pode saltar (o mais adiantado já liberado). */
  maxReachable: number
}>()

const emit = defineEmits<{ (e: 'go', index: number): void }>()

const go = (index: number) => {
  if (index <= props.maxReachable) emit('go', index)
}
</script>

<template>
  <ol class="flex flex-wrap items-center gap-x-2 gap-y-3">
    <li v-for="(step, index) in steps" :key="step.key" class="flex items-center gap-2">
      <button
        type="button"
        :disabled="index > maxReachable"
        @click="go(index)"
        class="group flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors disabled:cursor-not-allowed"
        :class="index <= maxReachable ? 'hover:bg-indigo-50 dark:hover:bg-slate-700' : ''"
      >
        <span
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          :class="[
            index === current
              ? 'bg-indigo-600 text-white'
              : index < current
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
          ]"
        >
          <svg v-if="index < current" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span
          class="text-sm font-medium"
          :class="
            index === current
              ? 'text-indigo-700 dark:text-indigo-300'
              : index <= maxReachable
                ? 'text-slate-700 dark:text-slate-200'
                : 'text-slate-400 dark:text-slate-500'
          "
        >
          {{ step.label }}
        </span>
      </button>
      <span v-if="index < steps.length - 1" class="hidden h-px w-6 bg-slate-200 sm:block dark:bg-slate-700" />
    </li>
  </ol>
</template>
