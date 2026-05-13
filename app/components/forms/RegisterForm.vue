<script setup lang="ts">
import { reactive, ref } from 'vue'
import { z } from 'zod'
import type { RegisterUserRequest } from '@/types/RegisterUserRequest'

const props = defineProps<{
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: RegisterUserRequest): void
}>()

// Estado local do formulário. Inclui confirmPassword (não vai para a API).
const form = reactive({
  name: '',
  document: '',
  email: '',
  phone: '',
  username: '',
  password: '',
  confirmPassword: '',
})

const errors = ref<Partial<Record<keyof typeof form, string>>>({})

// Schema de validação alinhado ao backend (RegisterUserRequest).
const schema = z
  .object({
    name: z.string().min(1, 'Informe seu nome completo.'),
    document: z
      .string()
      .regex(/^\d{11}$/, 'CPF deve conter 11 dígitos (somente números).'),
    email: z.union([z.literal(''), z.string().email('E-mail inválido.')]),
    phone: z.string().optional(),
    username: z
      .string()
      .min(3, 'Usuário deve ter pelo menos 3 caracteres.')
      .max(100, 'Usuário muito longo.'),
    password: z
      .string()
      .min(8, 'Senha deve ter pelo menos 8 caracteres.')
      .max(200, 'Senha muito longa.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })

// Mantém apenas dígitos no campo documento enquanto digita.
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
  const { confirmPassword: _confirm, ...payload } = result.data
  emit('submit', {
    ...payload,
    email: payload.email || undefined,
    phone: payload.phone || undefined,
  })
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <!-- Nome completo -->
    <div>
      <label for="register-name" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Nome completo</label>
      <input
        v-model="form.name"
        type="text"
        id="register-name"
        placeholder="João da Silva"
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors"
        :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.name }"
      />
      <p v-if="errors.name" class="mt-1 text-xs text-rose-600">{{ errors.name }}</p>
    </div>

    <!-- CPF / Username em grid responsivo -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div>
        <label for="register-document" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">CPF</label>
        <input
          :value="form.document"
          @input="handleDocumentInput"
          type="text"
          inputmode="numeric"
          maxlength="11"
          id="register-document"
          placeholder="11122233344"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors"
          :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.document }"
        />
        <p v-if="errors.document" class="mt-1 text-xs text-rose-600">{{ errors.document }}</p>
      </div>

      <div>
        <label for="register-username" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Usuário</label>
        <input
          v-model="form.username"
          type="text"
          id="register-username"
          placeholder="joao.silva"
          autocomplete="username"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors"
          :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.username }"
        />
        <p v-if="errors.username" class="mt-1 text-xs text-rose-600">{{ errors.username }}</p>
      </div>
    </div>

    <!-- E-mail / Telefone -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div>
        <label for="register-email" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">E-mail</label>
        <input
          v-model="form.email"
          type="email"
          id="register-email"
          placeholder="nome@empresa.com"
          autocomplete="email"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors"
          :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.email }"
        />
        <p v-if="errors.email" class="mt-1 text-xs text-rose-600">{{ errors.email }}</p>
      </div>

      <div>
        <label for="register-phone" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Telefone</label>
        <input
          v-model="form.phone"
          type="tel"
          id="register-phone"
          placeholder="+5519999990000"
          autocomplete="tel"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors"
        />
      </div>
    </div>

    <!-- Senha / Confirmação -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div>
        <label for="register-password" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Senha</label>
        <input
          v-model="form.password"
          type="password"
          id="register-password"
          placeholder="••••••••"
          autocomplete="new-password"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors"
          :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.password }"
        />
        <p v-if="errors.password" class="mt-1 text-xs text-rose-600">{{ errors.password }}</p>
      </div>

      <div>
        <label for="register-confirm" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Confirmar senha</label>
        <input
          v-model="form.confirmPassword"
          type="password"
          id="register-confirm"
          placeholder="••••••••"
          autocomplete="new-password"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors"
          :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.confirmPassword }"
        />
        <p v-if="errors.confirmPassword" class="mt-1 text-xs text-rose-600">{{ errors.confirmPassword }}</p>
      </div>
    </div>

    <!-- Erro vindo do servidor (ex.: documento ou username duplicado) -->
    <div v-if="serverError" class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300">
      {{ serverError }}
    </div>

    <button
      type="submit"
      :disabled="loading"
      class="w-full text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed font-medium rounded-lg text-sm px-5 py-3 text-center dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:focus:ring-indigo-800 transition-colors shadow-md shadow-indigo-500/20"
    >
      {{ loading ? 'Cadastrando...' : 'Criar conta' }}
    </button>
  </form>
</template>
