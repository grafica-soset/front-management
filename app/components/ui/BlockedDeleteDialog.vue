<script setup lang="ts">
/**
 * Exclusão bloqueada por vínculos (atividade 031). Mostra o que está impedindo a exclusão —
 * ex.: as atividades que consomem um grupo de insumo, ou os modelos que usam uma atividade.
 * Nada é excluído em cascata: o usuário vê a lista e vai resolver cada item.
 *
 * Autocontido: recebe a lista via prop e só emite o fechamento.
 */
import Modal from '@/components/ui/Modal.vue'

defineProps<{
  isOpen: boolean
  /** Título do modal, ex.: 'Não é possível excluir o grupo'. */
  title: string
  /** Frase que explica o bloqueio, ex.: 'O grupo "Colas" é usado pelas atividades abaixo.'. */
  message: string
  /** O que fazer para desbloquear. */
  hint: string
  /** Nomes dos itens bloqueadores (vêm de ErrorResponse.details). */
  items: string[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <Modal :is-open="isOpen" :title="title" @close="emit('close')">
    <div class="space-y-4">
      <p class="text-sm text-slate-700 dark:text-slate-200">{{ message }}</p>

      <ul v-if="items.length" class="max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-200 dark:border-slate-700 dark:divide-slate-700">
        <li v-for="(item, i) in items" :key="i" class="px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100">
          {{ item }}
        </li>
      </ul>

      <p class="text-xs text-slate-500 dark:text-slate-400">{{ hint }}</p>

      <div class="flex justify-end pt-2">
        <button type="button" @click="emit('close')" class="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 font-medium rounded-lg text-sm px-5 py-2.5 shadow-md shadow-indigo-500/20">
          Entendi
        </button>
      </div>
    </div>
  </Modal>
</template>
