<script setup lang="ts">
/**
 * Botão liga/desliga (atividade 046): um checkbox de verdade — acessível pelo teclado e lido como
 * "switch" pelo leitor de tela —, desenhado como um interruptor. Desligado é o estado de repouso.
 *
 * Uso: `<ToggleSwitch v-model="ligado" label="Tem numeração?" />`.
 */
const model = defineModel<boolean>({ required: true })

defineProps<{
  /** Rótulo ao lado do interruptor. */
  label?: string
  disabled?: boolean
}>()
</script>

<template>
  <label class="inline-flex cursor-pointer items-center gap-3" :class="disabled ? 'cursor-not-allowed opacity-60' : ''">
    <input v-model="model" type="checkbox" role="switch" class="peer sr-only" :disabled="disabled" />
    <span
      class="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-4 peer-focus-visible:ring-indigo-300 dark:bg-slate-600 dark:peer-focus-visible:ring-indigo-800"
      aria-hidden="true"
    />
    <span v-if="label" class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ label }}</span>
    <slot />
  </label>
</template>
