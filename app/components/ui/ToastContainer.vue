<script setup lang="ts">
/**
 * Renderiza a fila de toasts mantida na store `useToastStore`.
 * Deve ser montado uma única vez no layout principal.
 */
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/toast'

const store = useToastStore()
const { items } = storeToRefs(store)

const variantClasses: Record<string, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-200',
  error: 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/40 dark:border-rose-700 dark:text-rose-200',
  info: 'bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-900/40 dark:border-sky-700 dark:text-sky-200',
  warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-200',
}

const iconPaths: Record<string, string> = {
  success: 'M5 13l4 4L19 7',
  error: 'M6 18L18 6M6 6l12 12',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  warning: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
}
</script>

<template>
  <div class="fixed top-20 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
    <transition-group
      enter-active-class="transition transform ease-out duration-150"
      enter-from-class="opacity-0 translate-x-4"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-for="toast in items"
        :key="toast.id"
        :class="['flex items-start gap-3 px-4 py-3 rounded-lg shadow-md border', variantClasses[toast.variant]]"
        role="status"
      >
        <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPaths[toast.variant]"/>
        </svg>
        <p class="flex-1 text-sm font-medium leading-snug">{{ toast.message }}</p>
        <button
          type="button"
          @click="store.dismiss(toast.id)"
          class="flex-shrink-0 ml-1 text-current opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Fechar"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </transition-group>
  </div>
</template>
