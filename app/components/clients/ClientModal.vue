<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

const props = defineProps<{
  isOpen: boolean
  title: string
}>()

const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)
const titleId = `client-modal-title-${useId()}`
let previouslyFocused: HTMLElement | null = null
let previousOverflow = ''

function close() {
  emit('close')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab' || !panel.value) return
  const focusable = [...panel.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )]
  if (!focusable.length) return
  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function restoreDocumentState() {
  if (typeof document === 'undefined') return
  document.body.style.overflow = previousOverflow
  previouslyFocused?.focus()
  previouslyFocused = null
}

watch(() => props.isOpen, async (open) => {
  if (typeof document === 'undefined') return
  if (open) {
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    panel.value?.querySelector<HTMLElement>('button, input, select, textarea, a[href]')?.focus()
  } else {
    restoreDocumentState()
  }
})

onBeforeUnmount(restoreDocumentState)
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/50 p-4 dark:bg-gray-900/80"
    @keydown.stop="handleKeydown"
  >
    <div
      ref="panel"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      class="relative max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-lg bg-white shadow dark:bg-gray-800"
    >
      <header class="flex items-start justify-between border-b p-4 dark:border-gray-700">
        <h3 :id="titleId" class="text-xl font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
        <button
          type="button"
          aria-label="Fechar modal"
          class="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-gray-600 dark:hover:text-white"
          @click="close"
        >
          <svg class="h-3 w-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
          </svg>
        </button>
      </header>
      <div class="space-y-6 p-6">
        <slot />
      </div>
    </div>
  </div>
</template>
