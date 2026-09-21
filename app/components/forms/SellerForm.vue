<script setup lang="ts">
import { reactive, ref } from 'vue'
import { z } from 'zod'
import type { SellerRequest } from '@/types/Seller'
import { digitsOnly, formatPhone } from '@/utils/clientFormatting'
import { sanitizeSellerCode } from '@/utils/salesFormatting'

interface SellerFormInitial {
  name?: string
  lastName?: string
  phone?: string | null
  mobile?: string | null
  code?: string
}

const props = withDefaults(defineProps<{
  initial?: SellerFormInitial | null
  loading?: boolean
  serverError?: string | null
  submitLabel?: string
}>(), { initial: null, submitLabel: 'Salvar' })

const emit = defineEmits<{ submit: [payload: SellerRequest]; cancel: [] }>()
const form = reactive({
  name: props.initial?.name ?? '',
  lastName: props.initial?.lastName ?? '',
  phone: formatPhone(props.initial?.phone),
  mobile: formatPhone(props.initial?.mobile),
  code: sanitizeSellerCode(props.initial?.code),
})
const errors = ref<Record<string, string>>({})

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(255, 'Use no máximo 255 caracteres.'),
  lastName: z.string().trim().min(1, 'Informe o sobrenome.').max(255, 'Use no máximo 255 caracteres.'),
  phone: z.string().max(30, 'Use no máximo 30 caracteres.'),
  mobile: z.string().max(30, 'Use no máximo 30 caracteres.'),
  code: z.string().regex(/^[A-Z]{2}$/u, 'O código deve ter exatamente duas letras.'),
})

function updateCode(event: Event) {
  const input = event.target as HTMLInputElement
  form.code = sanitizeSellerCode(input.value)
  input.value = form.code
}
function updatePhone(field: 'phone' | 'mobile', event: Event) {
  form[field] = formatPhone((event.target as HTMLInputElement).value)
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
  emit('submit', {
    name: form.name.trim(),
    lastName: form.lastName.trim(),
    phone: digitsOnly(form.phone) || undefined,
    mobile: digitsOnly(form.mobile) || undefined,
    code: form.code,
  })
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="handleSubmit">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <label for="seller-code" class="label">Código <span class="text-rose-500">*</span></label>
        <input id="seller-code" :value="form.code" type="text" maxlength="2" autocomplete="off" placeholder="AC" class="field uppercase" :class="{ 'field-error': errors.code }" @input="updateCode" />
        <p v-if="errors.code" class="error">{{ errors.code }}</p>
      </div>
      <div>
        <label for="seller-name" class="label">Nome <span class="text-rose-500">*</span></label>
        <input id="seller-name" v-model="form.name" type="text" maxlength="255" autocomplete="given-name" class="field" :class="{ 'field-error': errors.name }" />
        <p v-if="errors.name" class="error">{{ errors.name }}</p>
      </div>
      <div>
        <label for="seller-last-name" class="label">Sobrenome <span class="text-rose-500">*</span></label>
        <input id="seller-last-name" v-model="form.lastName" type="text" maxlength="255" autocomplete="family-name" class="field" :class="{ 'field-error': errors.lastName }" />
        <p v-if="errors.lastName" class="error">{{ errors.lastName }}</p>
      </div>
    </div>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label for="seller-phone" class="label">Telefone</label>
        <input id="seller-phone" :value="form.phone" type="tel" inputmode="numeric" maxlength="15" autocomplete="tel" placeholder="(11) 3333-4444" class="field" @input="updatePhone('phone', $event)" />
      </div>
      <div>
        <label for="seller-mobile" class="label">Celular</label>
        <input id="seller-mobile" :value="form.mobile" type="tel" inputmode="numeric" maxlength="15" autocomplete="tel" placeholder="(11) 99999-8888" class="field" @input="updatePhone('mobile', $event)" />
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
