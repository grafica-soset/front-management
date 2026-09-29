<script setup lang="ts">
import { reactive, ref } from 'vue'
import { z } from 'zod'
import type { SaleOperationRequest } from '@/types/SaleOperation'
import { sanitizeSaleOperationCode } from '@/utils/salesFormatting'

// Limite do campo natOp na NF-e.
const DESCRIPTION_MAX_LENGTH = 60

const props = withDefaults(defineProps<{
  initial?: Partial<SaleOperationRequest> | null
  loading?: boolean
  serverError?: string | null
  submitLabel?: string
}>(), { initial: null, submitLabel: 'Salvar' })

const emit = defineEmits<{ submit: [payload: SaleOperationRequest]; cancel: [] }>()
const form = reactive({
  code: sanitizeSaleOperationCode(props.initial?.code),
  name: props.initial?.name ?? '',
  description: props.initial?.description ?? '',
})
const errors = ref<Record<string, string>>({})

// O primeiro dígito não é validado: 0000 (NF-e Complementar) e CFOPs de entrada são aceitos.
const schema = z.object({
  code: z.string().regex(/^[0-9]{4}$/u, 'O código deve ter exatamente 4 números.'),
  name: z.string().trim().min(1, 'Informe o nome do CFOP.').max(255, 'Use no máximo 255 caracteres.'),
  description: z.string().trim()
    .min(1, 'Informe a descrição na NF-e.')
    .max(DESCRIPTION_MAX_LENGTH, `Use no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`),
})

function updateCode(event: Event) {
  const input = event.target as HTMLInputElement
  form.code = sanitizeSaleOperationCode(input.value)
  input.value = form.code
}

function handleSubmit() {
  errors.value = {}
  const result = schema.safeParse(form)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = String(issue.path[0])
      if (!errors.value[key]) errors.value[key] = issue.message
    }
    return
  }
  emit('submit', { code: form.code, name: form.name.trim(), description: form.description.trim() })
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="handleSubmit">
    <div class="max-w-[140px]">
      <label for="sale-operation-code" class="label">CFOP <span class="text-rose-500">*</span></label>
      <input id="sale-operation-code" :value="form.code" type="text" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="5101" class="field" :class="{ 'field-error': errors.code }" @input="updateCode" />
      <p v-if="errors.code" class="error">{{ errors.code }}</p>
    </div>
    <div>
      <label for="sale-operation-name" class="label">Nome <span class="text-rose-500">*</span></label>
      <input id="sale-operation-name" v-model="form.name" type="text" maxlength="255" autocomplete="off" placeholder="Venda de Produção" class="field" :class="{ 'field-error': errors.name }" />
      <p v-if="errors.name" class="error">{{ errors.name }}</p>
    </div>
    <div>
      <label for="sale-operation-description" class="label">Descrição na NF-e <span class="text-rose-500">*</span></label>
      <input id="sale-operation-description" v-model="form.description" type="text" :maxlength="DESCRIPTION_MAX_LENGTH" autocomplete="off" placeholder="Venda de produção do estabelecimento" class="field" :class="{ 'field-error': errors.description }" />
      <div class="mt-1 flex justify-between gap-3">
        <p v-if="errors.description" class="error !mt-0">{{ errors.description }}</p>
        <p v-else class="text-xs text-slate-500 dark:text-slate-400">Texto impresso no campo natureza da operação da nota.</p>
        <span class="shrink-0 text-xs text-slate-500 dark:text-slate-400">{{ form.description.length }}/{{ DESCRIPTION_MAX_LENGTH }}</span>
      </div>
    </div>

    <div v-if="serverError" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">{{ serverError }}</div>
    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button type="button" class="btn-secondary" :disabled="loading" @click="emit('cancel')">Cancelar</button>
      <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Salvando...' : submitLabel }}</button>
    </div>
  </form>
</template>

<style scoped>
.label { @apply mb-2 block text-sm font-medium text-slate-900 dark:text-white; }
.field { @apply block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white; }
.field-error { @apply border-rose-500 focus:border-rose-500 focus:ring-rose-500; }
.error { @apply mt-1 text-xs text-rose-600 dark:text-rose-400; }
.btn-primary { @apply rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60; }
.btn-secondary { @apply rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700; }
</style>
