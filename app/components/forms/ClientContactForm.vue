<script setup lang="ts">
import { reactive, ref } from 'vue'
import { z } from 'zod'
import type { ClientContactInput } from '@/types/Client'
import { digitsOnly, formatPhone } from '@/utils/clientFormatting'

const props = defineProps<{ initial?: ClientContactInput | null; loading?: boolean; serverError?: string | null }>()
const emit = defineEmits<{ submit: [payload: ClientContactInput]; cancel: [] }>()

const form = reactive<ClientContactInput>({
  name: props.initial?.name ?? '',
  position: props.initial?.position ?? '',
  email: props.initial?.email ?? '',
  phone: formatPhone(props.initial?.phone),
  mobile: formatPhone(props.initial?.mobile),
  notes: props.initial?.notes ?? '',
  primary: props.initial?.primary ?? false,
})
const errors = ref<Record<string, string>>({})
const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do contato.').max(255, 'Use no máximo 255 caracteres.'),
  position: z.string().max(150, 'Use no máximo 150 caracteres.').optional(),
  email: z.string().max(255, 'Use no máximo 255 caracteres.').email('E-mail inválido.').optional().or(z.literal('')),
  phone: z.string().max(30, 'Use no máximo 30 caracteres.').optional(),
  mobile: z.string().max(30, 'Use no máximo 30 caracteres.').optional(),
  notes: z.string().optional(),
  primary: z.boolean(),
})
const optional = (value?: string) => value?.trim() || undefined
const maskPhone = (field: 'phone' | 'mobile', event: Event) => {
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
    name: result.data.name,
    position: optional(form.position),
    email: optional(form.email),
    phone: digitsOnly(form.phone) || undefined,
    mobile: digitsOnly(form.mobile) || undefined,
    notes: optional(form.notes),
    primary: form.primary,
  })
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="handleSubmit">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label for="client-contact-name" class="label">Nome <span class="text-rose-500">*</span></label>
        <input id="client-contact-name" v-model="form.name" type="text" maxlength="255" autocomplete="name" class="field" :class="{ 'field-error': errors.name }" />
        <p v-if="errors.name" class="mt-1 text-xs text-rose-600">{{ errors.name }}</p>
      </div>
      <div>
        <label for="client-contact-position" class="label">Cargo ou função</label>
        <input id="client-contact-position" v-model="form.position" type="text" maxlength="150" class="field" />
      </div>
      <div>
        <label for="client-contact-email" class="label">E-mail</label>
        <input id="client-contact-email" v-model="form.email" type="email" maxlength="255" autocomplete="email" class="field" :class="{ 'field-error': errors.email }" />
        <p v-if="errors.email" class="mt-1 text-xs text-rose-600">{{ errors.email }}</p>
      </div>
      <div>
        <label for="client-contact-phone" class="label">Telefone</label>
        <input id="client-contact-phone" :value="form.phone" type="tel" maxlength="30" autocomplete="tel" class="field" @input="maskPhone('phone', $event)" />
      </div>
      <div>
        <label for="client-contact-mobile" class="label">Celular</label>
        <input id="client-contact-mobile" :value="form.mobile" type="tel" maxlength="30" autocomplete="tel" class="field" @input="maskPhone('mobile', $event)" />
      </div>
      <label class="flex items-center gap-3 self-end rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-200">
        <input v-model="form.primary" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
        Contato principal
      </label>
      <div class="sm:col-span-2">
        <label for="client-contact-notes" class="label">Observações</label>
        <textarea id="client-contact-notes" v-model="form.notes" rows="3" class="field" />
      </div>
    </div>
    <div v-if="serverError" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">{{ serverError }}</div>
    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button type="button" class="btn-secondary" :disabled="loading" @click="emit('cancel')">Cancelar</button>
      <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Salvando...' : 'Salvar contato' }}</button>
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
