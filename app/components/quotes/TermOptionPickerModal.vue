<script setup lang="ts">
/**
 * Popup de escolha de uma CONDIÇÃO DE FORNECIMENTO (atividade 038, configurações): lista as opções
 * que a empresa cadastrou para o campo. Escolher copia o texto para o orçamento — que continua
 * editável, para as condições exclusivas de um cliente.
 */
import Modal from '@/components/ui/Modal.vue'
import type { QuoteTermOptionKeyValue } from '@/types/QuoteTermOption'

defineProps<{
  isOpen: boolean
  title: string
  options: QuoteTermOptionKeyValue[]
  /** O texto que está no orçamento agora, para marcar a opção correspondente. */
  current: string | null
  /** Mostra "Deixar em branco": o campo vazio não sai na proposta. */
  clearable?: boolean
}>()
const emit = defineEmits<{ pick: [text: string]; close: [] }>()
</script>

<template>
  <Modal :is-open="isOpen" :title="title" size="xl" @close="emit('close')">
    <div v-if="options.length === 0" class="space-y-2 text-sm text-slate-500 dark:text-slate-400">
      <p>Nenhuma opção cadastrada para este campo.</p>
      <p>
        Cadastre em
        <NuxtLink to="/orcamentos/configuracoes" class="font-medium text-indigo-600 hover:underline dark:text-indigo-400">Orçamento &gt; Configurações</NuxtLink>
        — ou digite direto no orçamento.
      </p>
    </div>
    <ul v-else class="space-y-2">
      <li v-for="option in options" :key="option.id">
        <button
          type="button"
          class="flex w-full items-start justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors"
          :class="option.value === current
            ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-100'
            : 'border-slate-200 text-slate-800 hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700'"
          @click="emit('pick', option.value)"
        >
          <span class="whitespace-pre-line">{{ option.value }}</span>
          <span v-if="option.defaultOption" class="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Padrão</span>
        </button>
      </li>
    </ul>
    <button
      v-if="clearable"
      type="button"
      class="mt-3 flex w-full items-start justify-between gap-3 rounded-lg border border-dashed px-4 py-3 text-left text-sm transition-colors"
      :class="!current?.trim()
        ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-100'
        : 'border-slate-300 text-slate-600 hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'"
      @click="emit('pick', '')"
    >
      <span>
        <span class="font-medium">Deixar em branco</span>
        <span class="block text-xs text-slate-500 dark:text-slate-400">Não sai na proposta.</span>
      </span>
    </button>
  </Modal>
</template>
