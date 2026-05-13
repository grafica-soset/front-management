<script setup lang="ts">
import { reactive, ref } from 'vue'
import { z } from 'zod'
import type { CreateCustomerRequest } from '@/types/CreateCustomerRequest'

const props = defineProps<{
  loading?: boolean
  serverError?: string | null
  /** Dados iniciais — útil ao reaproveitar este form em telas de edição. */
  initial?: Partial<CreateCustomerRequest>
}>()

const emit = defineEmits<{
  (e: 'submit', payload: CreateCustomerRequest): void
  (e: 'cancel'): void
}>()

const form = reactive({
  name: props.initial?.name ?? '',
  corporateName: props.initial?.corporateName ?? '',
  document: props.initial?.document ?? '',
  email: props.initial?.email ?? '',
  phone: props.initial?.phone ?? '',
})

const errors = ref<Partial<Record<keyof typeof form, string>>>({})

// Documento: aceita exatamente 14 dígitos (CNPJ).
const schema = z.object({
  name: z.string().min(1, 'Informe o nome fantasia.'),
  corporateName: z.string().optional(),
  document: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos (somente números).'),
  email: z.union([z.literal(''), z.string().email('E-mail inválido.')]),
  phone: z.string().optional(),
})

const handleDocumentInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  form.document = target.value.replace(/\D/g, '')
}

const handleSubmit = () => {
  errors.value = {}
  const result = schema.safeParse(form)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof typeof form
      if (key && !errors.value[key]) errors.value[key] = issue.message
    }
    return
  }
  const data = result.data
  emit('submit', {
    name: data.name,
    corporateName: data.corporateName || undefined,
    document: data.document,
    email: data.email || undefined,
    phone: data.phone || undefined,
  })
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <div>
      <label for="company-name" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Nome fantasia <span class="text-rose-500">*</span></label>
      <input
        v-model="form.name"
        type="text"
        id="company-name"
        placeholder="GraphicOS"
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors"
        :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.name }"
      />
      <p v-if="errors.name" class="mt-1 text-xs text-rose-600">{{ errors.name }}</p>
    </div>

    <div>
      <label for="company-corporate" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Razão social</label>
      <input
        v-model="form.corporateName"
        type="text"
        id="company-corporate"
        placeholder="GraphicOS Indústria e Comércio Ltda."
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors"
      />
    </div>

    <div>
      <label for="company-document" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">CNPJ <span class="text-rose-500">*</span></label>
      <input
        :value="form.document"
        @input="handleDocumentInput"
        type="text"
        inputmode="numeric"
        maxlength="14"
        id="company-document"
        placeholder="12345678000199"
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors"
        :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.document }"
      />
      <p v-if="errors.document" class="mt-1 text-xs text-rose-600">{{ errors.document }}</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div>
        <label for="company-email" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">E-mail corporativo</label>
        <input
          v-model="form.email"
          type="email"
          id="company-email"
          placeholder="contato@empresa.com"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors"
          :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.email }"
        />
        <p v-if="errors.email" class="mt-1 text-xs text-rose-600">{{ errors.email }}</p>
      </div>

      <div>
        <label for="company-phone" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Telefone</label>
        <input
          v-model="form.phone"
          type="tel"
          id="company-phone"
          placeholder="+5519977776666"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors"
        />
      </div>
    </div>

    <div v-if="serverError" class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300">
      {{ serverError }}
    </div>

    <div class="flex flex-col-reverse sm:flex-row gap-3 pt-2">
      <button
        type="button"
        @click="emit('cancel')"
        class="w-full sm:w-auto text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 font-medium rounded-lg text-sm px-5 py-3 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors"
      >
        Cancelar
      </button>
      <button
        type="submit"
        :disabled="loading"
        class="w-full text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed font-medium rounded-lg text-sm px-5 py-3 text-center dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:focus:ring-indigo-800 transition-colors shadow-md shadow-indigo-500/20"
      >
        {{ loading ? 'Salvando...' : 'Cadastrar empresa' }}
      </button>
    </div>
  </form>
</template>
