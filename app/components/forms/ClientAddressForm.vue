<script setup lang="ts">
import { reactive, ref } from 'vue'
import { z } from 'zod'
import type { AddressType, ClientAddressInput } from '@/types/Client'
import { digitsOnly, formatPostalCode } from '@/utils/clientFormatting'

const props = defineProps<{
  initial?: ClientAddressInput | null
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  submit: [payload: ClientAddressInput]
  cancel: []
}>()

const form = reactive<ClientAddressInput>({
  nickname: props.initial?.nickname ?? '',
  addressType: props.initial?.addressType ?? 'SHIPPING',
  street: props.initial?.street ?? '',
  number: props.initial?.number ?? '',
  complement: props.initial?.complement ?? '',
  neighborhood: props.initial?.neighborhood ?? '',
  city: props.initial?.city ?? '',
  state: props.initial?.state ?? '',
  country: props.initial?.country ?? 'BR',
  postalCode: formatPostalCode(props.initial?.postalCode),
})

const errors = ref<Record<string, string>>({})
const schema = z.object({
  nickname: z.string().max(150, 'Use no máximo 150 caracteres.').optional(),
  addressType: z.enum(['MAIN', 'BILLING', 'SHIPPING']),
  street: z.string().max(255, 'Use no máximo 255 caracteres.').optional(),
  number: z.string().max(20, 'Use no máximo 20 caracteres.').optional(),
  complement: z.string().max(255, 'Use no máximo 255 caracteres.').optional(),
  neighborhood: z.string().max(150, 'Use no máximo 150 caracteres.').optional(),
  city: z.string().max(150, 'Use no máximo 150 caracteres.').optional(),
  state: z.string().max(2, 'Use a sigla do estado com 2 letras.').optional(),
  country: z.string().min(2, 'Informe o país.').max(2, 'Use a sigla do país com 2 letras.'),
  postalCode: z.string().max(15, 'Use no máximo 15 caracteres.').optional(),
})

function optional(value?: string): string | undefined {
  return value?.trim() || undefined
}

function updatePostalCode(event: Event) {
  form.postalCode = formatPostalCode((event.target as HTMLInputElement).value)
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
    nickname: optional(form.nickname),
    addressType: form.addressType as AddressType,
    street: optional(form.street),
    number: optional(form.number),
    complement: optional(form.complement),
    neighborhood: optional(form.neighborhood),
    city: optional(form.city),
    state: optional(form.state)?.toUpperCase(),
    country: (form.country || 'BR').toUpperCase(),
    postalCode: digitsOnly(form.postalCode) || undefined,
  })
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="handleSubmit">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label for="client-address-nickname" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Apelido</label>
        <input id="client-address-nickname" v-model="form.nickname" type="text" maxlength="150" placeholder="Matriz, entrega, financeiro..." class="field" />
      </div>
      <div>
        <label for="client-address-type" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Tipo <span class="text-rose-500">*</span></label>
        <select id="client-address-type" v-model="form.addressType" class="field">
          <option value="MAIN">Principal</option>
          <option value="BILLING">Cobrança</option>
          <option value="SHIPPING">Entrega</option>
        </select>
      </div>
      <div class="sm:col-span-2">
        <label for="client-address-street" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Logradouro</label>
        <input id="client-address-street" v-model="form.street" type="text" maxlength="255" autocomplete="street-address" class="field" />
      </div>
      <div>
        <label for="client-address-number" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Número</label>
        <input id="client-address-number" v-model="form.number" type="text" maxlength="20" class="field" />
      </div>
      <div>
        <label for="client-address-complement" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Complemento</label>
        <input id="client-address-complement" v-model="form.complement" type="text" maxlength="255" class="field" />
      </div>
      <div>
        <label for="client-address-neighborhood" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Bairro</label>
        <input id="client-address-neighborhood" v-model="form.neighborhood" type="text" maxlength="150" class="field" />
      </div>
      <div>
        <label for="client-address-city" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Cidade</label>
        <input id="client-address-city" v-model="form.city" type="text" maxlength="150" autocomplete="address-level2" class="field" />
      </div>
      <div>
        <label for="client-address-state" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Estado</label>
        <input id="client-address-state" v-model="form.state" type="text" maxlength="2" autocomplete="address-level1" class="field uppercase" :class="{ 'field-error': errors.state }" />
        <p v-if="errors.state" class="mt-1 text-xs text-rose-600">{{ errors.state }}</p>
      </div>
      <div>
        <label for="client-address-postal" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">CEP</label>
        <input id="client-address-postal" :value="form.postalCode" type="text" inputmode="numeric" maxlength="9" autocomplete="postal-code" class="field" @input="updatePostalCode" />
      </div>
    </div>

    <div v-if="serverError" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">{{ serverError }}</div>
    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button type="button" class="btn-secondary" :disabled="loading" @click="emit('cancel')">Cancelar</button>
      <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Salvando...' : 'Salvar endereço' }}</button>
    </div>
  </form>
</template>

<style scoped>
.field { @apply block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white; }
.field-error { @apply border-rose-500 focus:border-rose-500 focus:ring-rose-500; }
.btn-primary { @apply rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60; }
.btn-secondary { @apply rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700; }
</style>
