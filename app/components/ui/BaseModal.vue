<script setup lang="ts">
/**
 * Modal genérico controlado por props/emits.
 * Uso:
 *   <BaseModal :is-open="show" title="Editar" @close="show = false">
 *     <MyForm ... />
 *   </BaseModal>
 *
 * Comportamento:
 * - Bloqueia o scroll do body enquanto está aberto.
 * - Fecha ao pressionar ESC ou clicar no backdrop (controlado por
 *   `closeOnBackdrop`, default true).
 * - Renderiza via Teleport para escapar do contexto local.
 */

interface Props {
  isOpen: boolean
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  description: '',
  size: 'md',
  closeOnBackdrop: true,
})

const emit = defineEmits<{
  close: []
}>()

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'max-w-md'
    case 'md': return 'max-w-2xl'
    case 'lg': return 'max-w-4xl'
    case 'xl': return 'max-w-6xl'
    default: return 'max-w-2xl'
  }
})

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) emit('close')
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isOpen) emit('close')
}

watch(
  () => props.isOpen,
  (open) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = open ? 'hidden' : ''
  },
)

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
  }
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        role="dialog"
        aria-modal="true"
        @click.self="handleBackdropClick"
      >
        <Transition
          enter-active-class="transition duration-200"
          enter-from-class="translate-y-2 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-150"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="translate-y-2 opacity-0"
          appear
        >
          <div
            class="card flex max-h-[90vh] w-full flex-col overflow-hidden"
            :class="sizeClass"
          >
            <header
              v-if="title || $slots.header"
              class="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-3"
            >
              <slot name="header">
                <div>
                  <h2 class="text-base font-semibold text-slate-800">{{ title }}</h2>
                  <p v-if="description" class="text-xs text-slate-500">
                    {{ description }}
                  </p>
                </div>
              </slot>
              <button
                type="button"
                class="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar"
                @click="emit('close')"
              >
                <Icon name="lucide:x" class="size-4" />
              </button>
            </header>

            <div class="flex-1 overflow-y-auto p-5">
              <slot />
            </div>

            <footer
              v-if="$slots.footer"
              class="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3"
            >
              <slot name="footer" />
            </footer>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
