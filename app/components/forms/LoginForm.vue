<script setup lang="ts">
import { reactive, ref } from 'vue'
import { z } from 'zod'
import type { LoginRequest } from '@/types/LoginRequest'

const props = defineProps<{
  loading?: boolean
  serverError?: string | null
  /** Permite pré-preencher o usuário (ex.: após cadastro bem-sucedido). */
  initialUsername?: string
}>()

const emit = defineEmits<{
  (e: 'submit', payload: LoginRequest): void
}>()

const form = reactive<LoginRequest>({
  username: props.initialUsername ?? '',
  password: '',
})

const errors = ref<Partial<Record<keyof LoginRequest, string>>>({})
const showPassword = ref(false)

const schema = z.object({
  username: z.string().min(1, 'Informe seu usuário.'),
  password: z.string().min(1, 'Informe sua senha.'),
})

const handleSubmit = () => {
  errors.value = {}
  const result = schema.safeParse(form)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof LoginRequest
      if (key && !errors.value[key]) errors.value[key] = issue.message
    }
    return
  }
  emit('submit', result.data)
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <div>
      <label for="login-username" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Usuário</label>
      <div class="relative">
        <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        </div>
        <input
          v-model="form.username"
          type="text"
          id="login-username"
          autocomplete="username"
          placeholder="seu.usuario"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full pl-10 p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors"
          :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.username }"
        />
      </div>
      <p v-if="errors.username" class="mt-1 text-xs text-rose-600">{{ errors.username }}</p>
    </div>

    <div>
      <label for="login-password" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Senha</label>
      <div class="relative">
        <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        <input
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          id="login-password"
          autocomplete="current-password"
          placeholder="••••••••"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full pl-10 pr-10 p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors"
          :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.password }"
        />
        <button
          type="button"
          @click="showPassword = !showPassword"
          :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
          :aria-pressed="showPassword"
          class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none focus:text-indigo-600 dark:focus:text-indigo-400 transition-colors"
        >
          <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
        </button>
      </div>
      <p v-if="errors.password" class="mt-1 text-xs text-rose-600">{{ errors.password }}</p>
    </div>

    <div v-if="serverError" class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300">
      {{ serverError }}
    </div>

    <button
      type="submit"
      :disabled="loading"
      class="w-full text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed font-medium rounded-lg text-sm px-5 py-3 text-center dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:focus:ring-indigo-800 transition-colors shadow-md shadow-indigo-500/20"
    >
      {{ loading ? 'Entrando...' : 'Entrar' }}
    </button>
  </form>
</template>
