<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { z } from 'zod'
import type { PersonType } from '@/types/Client'
import type { SellerRequest } from '@/types/Seller'
import { digitsOnly, formatBrazilianDocument, formatPhone } from '@/utils/clientFormatting'
import { isValidBrazilianDocument } from '@/utils/clientValidation'

interface SellerFormInitial {
  personType?: PersonType
  name?: string
  corporateName?: string | null
  document?: string
  email?: string | null
  phone?: string | null
  mobile?: string | null
}

const props = withDefaults(defineProps<{
  initial?: SellerFormInitial | null
  loading?: boolean
  serverError?: string | null
  submitLabel?: string
}>(), { initial: null, submitLabel: 'Salvar' })

const emit = defineEmits<{ submit: [payload: SellerRequest]; cancel: [] }>()
const form = reactive({
  personType: (props.initial?.personType ?? 'PHYSICAL') as PersonType,
  name: props.initial?.name ?? '',
  corporateName: props.initial?.corporateName ?? '',
  document: formatBrazilianDocument(props.initial?.document),
  email: props.initial?.email ?? '',
  phone: formatPhone(props.initial?.phone),
  mobile: formatPhone(props.initial?.mobile),
})
const errors = ref<Record<string, string>>({})
const isLegal = computed(() => form.personType === 'LEGAL')

watch(() => form.personType, (personType) => {
  const maxDigits = personType === 'PHYSICAL' ? 11 : 14
  form.document = formatBrazilianDocument(digitsOnly(form.document).slice(0, maxDigits))
  if (personType === 'PHYSICAL') form.corporateName = ''
})

const schema = z.object({
  personType: z.enum(['PHYSICAL', 'LEGAL']),
  name: z.string().trim().min(1, 'Informe o nome.').max(255, 'Use no máximo 255 caracteres.'),
  corporateName: z.string().max(255, 'Use no máximo 255 caracteres.'),
  document: z.string().min(1, 'Informe o documento.'),
  email: z.string().max(255, 'Use no máximo 255 caracteres.').email('E-mail inválido.').or(z.literal('')),
  phone: z.string().max(30, 'Use no máximo 30 caracteres.'),
  mobile: z.string().max(30, 'Use no máximo 30 caracteres.'),
})

function updateDocument(event: Event) {
  const maxDigits = form.personType === 'PHYSICAL' ? 11 : 14
  form.document = formatBrazilianDocument(digitsOnly((event.target as HTMLInputElement).value).slice(0, maxDigits))
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
  if (!isValidBrazilianDocument(form.document, form.personType)) {
    errors.value.document = isLegal.value ? 'Informe um CNPJ válido.' : 'Informe um CPF válido.'
    return
  }
  emit('submit', {
    personType: form.personType,
    name: form.name.trim(),
    corporateName: isLegal.value ? (form.corporateName.trim() || undefined) : undefined,
    document: digitsOnly(form.document),
    email: form.email.trim() || undefined,
    phone: digitsOnly(form.phone) || undefined,
    mobile: digitsOnly(form.mobile) || undefined,
  })
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="handleSubmit">
    <fieldset>
      <legend class="label">Tipo de pessoa <span class="text-rose-500">*</span></legend>
      <div class="grid grid-cols-2 gap-3">
        <label class="choice" :class="form.personType === 'PHYSICAL' ? 'choice-active' : ''">
          <input v-model="form.personType" type="radio" value="PHYSICAL" class="text-indigo-600 focus:ring-indigo-500" />
          Pessoa física
        </label>
        <label class="choice" :class="form.personType === 'LEGAL' ? 'choice-active' : ''">
          <input v-model="form.personType" type="radio" value="LEGAL" class="text-indigo-600 focus:ring-indigo-500" />
          Pessoa jurídica
        </label>
      </div>
    </fieldset>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div :class="{ 'sm:col-span-2': !isLegal }">
        <label for="seller-name" class="label">{{ isLegal ? 'Nome fantasia' : 'Nome' }} <span class="text-rose-500">*</span></label>
        <input id="seller-name" v-model="form.name" type="text" maxlength="255" autocomplete="name" class="field" :class="{ 'field-error': errors.name }" />
        <p v-if="errors.name" class="error">{{ errors.name }}</p>
      </div>
      <div v-if="isLegal">
        <label for="seller-corporate-name" class="label">Razão social</label>
        <input id="seller-corporate-name" v-model="form.corporateName" type="text" maxlength="255" class="field" :class="{ 'field-error': errors.corporateName }" />
        <p v-if="errors.corporateName" class="error">{{ errors.corporateName }}</p>
      </div>
      <div>
        <label for="seller-document" class="label">{{ isLegal ? 'CNPJ' : 'CPF' }} <span class="text-rose-500">*</span></label>
        <input id="seller-document" :value="form.document" type="text" inputmode="numeric" :maxlength="isLegal ? 18 : 14" class="field" :class="{ 'field-error': errors.document }" @input="updateDocument" />
        <p v-if="errors.document" class="error">{{ errors.document }}</p>
      </div>
      <div>
        <label for="seller-email" class="label">E-mail</label>
        <input id="seller-email" v-model="form.email" type="email" maxlength="255" autocomplete="email" class="field" :class="{ 'field-error': errors.email }" />
        <p v-if="errors.email" class="error">{{ errors.email }}</p>
      </div>
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
.choice { @apply flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700; }
.choice-active { @apply border-indigo-500 bg-indigo-50 text-indigo-800 dark:border-indigo-400 dark:bg-indigo-900/20 dark:text-indigo-200; }
.btn-primary { @apply rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60; }
.btn-secondary { @apply rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700; }
</style>
