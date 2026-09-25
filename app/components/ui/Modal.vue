<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  isOpen: boolean
  title: string
  /**
   * Largura máxima. O padrão (2xl) serve aos formulários curtos; os longos — como o Modelo de
   * Produto, com estrutura, atividades e a tabela de impostos — pedem mais espaço.
   */
  size?: 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl'
}>()

// Classes escritas por extenso: o Tailwind só gera as que encontra literalmente no código.
const WIDTHS = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
} as const

const widthClass = computed(() => WIDTHS[props.size ?? '2xl'])

const emit = defineEmits<{
  (e: 'close'): void
}>()

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <!--
    O fundo rola; a centralização fica num filho com min-h-full. Centralizar direto no container
    que rola (flex items-center) cortava o TOPO de um conteúdo mais alto que a tela, sem como
    rolar até ele.
  -->
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto outline-none focus:outline-none bg-gray-900/50 dark:bg-gray-900/80">
    <div class="flex min-h-full items-center justify-center">
      <div class="relative w-full p-4" :class="widthClass">
        <!-- Modal content -->
        <div class="relative bg-white rounded-lg shadow dark:bg-gray-800">
          <!-- Modal header -->
          <div class="flex items-start justify-between p-4 border-b rounded-t dark:border-gray-700">
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ title }}
            </h3>
            <button @click="handleClose" type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white">
              <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
              </svg>
              <span class="sr-only">Close modal</span>
            </button>
          </div>
          <!-- Modal body -->
          <div class="p-6 space-y-6">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
