<script setup lang="ts">
/**
 * Combobox de CLIENTE do orçamento (atividade 037).
 *
 * São muitos clientes: o usuário digita nome, e-mail ou documento e escolhe na lista. Cada opção
 * mostra nome, e-mail e documento, para confirmar que é o cliente certo — duas "Papelaria Central"
 * se distinguem pelo CNPJ. Escolhido, o cliente continua visível com os mesmos três dados.
 *
 * Sem API aqui: o texto sai em `search`, a lista volta em `results`.
 */
import { ref } from 'vue'
import type { ClientSearchItem } from '@/types/Client'
import { formatBrazilianDocument } from '@/utils/clientFormatting'

const props = defineProps<{
  selected: ClientSearchItem | null
  results: ClientSearchItem[]
  loading?: boolean
  error?: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'search', term: string): void
  (e: 'select', client: ClientSearchItem | null): void
}>()

const term = ref('')
const open = ref(false)
const highlighted = ref(0)

const startSearch = () => {
  open.value = true
  highlighted.value = 0
  emit('search', term.value)
}

const choose = (client: ClientSearchItem) => {
  emit('select', client)
  open.value = false
  term.value = ''
}

const change = () => {
  emit('select', null)
  term.value = ''
  startSearch()
}

const onKeydown = (event: KeyboardEvent) => {
  if (!open.value) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    highlighted.value = Math.min(props.results.length - 1, highlighted.value + 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    highlighted.value = Math.max(0, highlighted.value - 1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const client = props.results[highlighted.value]
    if (client) choose(client)
  } else if (event.key === 'Escape') {
    open.value = false
  }
}

const onBlur = () => window.setTimeout(() => { open.value = false }, 150)

const secondLine = (client: ClientSearchItem) =>
  [client.email, formatBrazilianDocument(client.document)].filter(Boolean).join(' · ')
</script>

<template>
  <div class="relative">
    <!-- Escolhido: os três dados à vista, para conferir. -->
    <div
      v-if="selected"
      class="flex items-start justify-between gap-3 rounded-lg border border-slate-300 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700"
    >
      <div class="min-w-0">
        <p class="truncate text-sm font-medium text-slate-900 dark:text-white">{{ selected.name }}</p>
        <p v-if="selected.corporateName && selected.corporateName !== selected.name" class="truncate text-xs text-slate-500 dark:text-slate-400">
          {{ selected.corporateName }}
        </p>
        <p class="truncate text-xs text-slate-600 dark:text-slate-300">{{ secondLine(selected) }}</p>
      </div>
      <button
        v-if="!disabled"
        type="button"
        class="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-600"
        @click="change"
      >
        Trocar
      </button>
    </div>

    <template v-else>
      <input
        v-model="term"
        type="search"
        :disabled="disabled"
        placeholder="Buscar por nome, e-mail ou CPF/CNPJ"
        autocomplete="off"
        role="combobox"
        :aria-expanded="open"
        class="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        @focus="startSearch"
        @input="startSearch"
        @keydown="onKeydown"
        @blur="onBlur"
      />
      <div
        v-if="open"
        class="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
      >
        <p v-if="error" class="px-3 py-2.5 text-sm text-rose-600 dark:text-rose-400">{{ error }}</p>
        <p v-else-if="loading && results.length === 0" class="px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400">Buscando...</p>
        <p v-else-if="results.length === 0" class="px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400">
          Nenhum cliente ativo encontrado.
        </p>
        <ul v-else class="max-h-72 overflow-y-auto py-1" role="listbox">
          <li
            v-for="(client, index) in results"
            :key="client.id"
            role="option"
            :aria-selected="index === highlighted"
            class="cursor-pointer px-3 py-2"
            :class="index === highlighted ? 'bg-indigo-50 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700/60'"
            @mouseenter="highlighted = index"
            @mousedown.prevent="choose(client)"
          >
            <p class="truncate text-sm font-medium text-slate-900 dark:text-white">{{ client.name }}</p>
            <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ secondLine(client) }}</p>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
