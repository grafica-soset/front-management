<script setup lang="ts">
/**
 * Formulário de OPÇÃO DE CONDIÇÃO DE FORNECIMENTO (atividade 038, Orçamento > Configurações):
 * o texto que vai para o orçamento e se é a padrão do tipo. O tipo vem da seção que abriu o form
 * e não muda na edição.
 */
import { computed, reactive, ref } from 'vue'
import { z } from 'zod'
import type { QuoteTermKind, QuoteTermOptionFormValue } from '@/types/QuoteTermOption'
import { quoteTermKindInfo } from '@/utils/quoteTermOptions'

const props = defineProps<{
  kind: QuoteTermKind
  initial?: QuoteTermOptionFormValue | null
  loading?: boolean
  serverError?: string | null
}>()
const emit = defineEmits<{ submit: [payload: QuoteTermOptionFormValue]; cancel: [] }>()

const info = computed(() => quoteTermKindInfo(props.kind))
const form = reactive<QuoteTermOptionFormValue>({
  text: props.initial?.text ?? '',
  defaultOption: props.initial?.defaultOption ?? false,
})
const error = ref<string | null>(null)

function handleSubmit() {
  const schema = z
    .string()
    .trim()
    .min(1, 'Informe o texto da opção.')
    .max(info.value.maxLength, `Use no máximo ${info.value.maxLength} caracteres.`)
  const result = schema.safeParse(form.text)
  if (!result.success) {
    error.value = result.error.issues[0]?.message ?? 'Texto inválido.'
    return
  }
  error.value = null
  emit('submit', { text: result.data, defaultOption: form.defaultOption })
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="handleSubmit">
    <div>
      <label for="quote-term-text" class="label">{{ info.label }} <span class="text-rose-500">*</span></label>
      <textarea
        id="quote-term-text"
        v-model="form.text"
        rows="3"
        :maxlength="info.maxLength"
        :placeholder="info.placeholder"
        class="field"
        :class="{ 'field-error': error }"
      />
      <div class="mt-1 flex justify-between gap-3 text-xs">
        <p class="text-rose-600">{{ error }}</p>
        <p class="text-slate-500 dark:text-slate-400">{{ form.text.length }}/{{ info.maxLength }}</p>
      </div>
    </div>
    <label class="flex items-start gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-200">
      <input v-model="form.defaultOption" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
      <span>
        Opção padrão
        <span class="block text-xs text-slate-500 dark:text-slate-400">Já vem preenchida no orçamento novo. Só uma por tipo: marcar esta tira a marca da anterior.</span>
      </span>
    </label>
    <div v-if="serverError" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">{{ serverError }}</div>
    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button type="button" class="btn-secondary" :disabled="loading" @click="emit('cancel')">Cancelar</button>
      <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Salvando...' : 'Salvar opção' }}</button>
    </div>
  </form>
</template>

<style scoped>
.label { @apply mb-2 block text-sm font-medium text-slate-900 dark:text-white; }
.field { @apply block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white; }
.field-error { @apply border-rose-500 focus:border-rose-500 focus:ring-rose-500; }
.btn-primary { @apply rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60; }
.btn-secondary { @apply rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700; }
</style>
