<script setup lang="ts">
import { ref } from 'vue'
import RegisterForm from '@/components/forms/RegisterForm.vue'
import { useAuth } from '@/composables/useAuth'
import { extractApiError } from '@/utils/apiError'
import type { RegisterUserRequest } from '@/types/RegisterUserRequest'

definePageMeta({
  layout: 'empty',
  middleware: 'guest',
})

const { registerUser } = useAuth()

const loading = ref(false)
const serverError = ref<string | null>(null)

const handleRegister = async (payload: RegisterUserRequest) => {
  loading.value = true
  serverError.value = null
  try {
    await registerUser(payload)
    // Cadastro OK → manda para o login, já preenchendo o usuário.
    await navigateTo({
      path: '/auth/login',
      query: { username: payload.username },
    })
  } catch (err) {
    serverError.value = extractApiError(err, 'Falha ao cadastrar.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-xl bg-white rounded-2xl shadow-xl dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-8 sm:p-10">
    <div class="flex items-center justify-center mb-6">
      <div class="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
      </div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white ml-3">GraphicOS</h1>
    </div>

    <div class="text-center mb-8">
      <h2 class="text-xl font-bold text-slate-900 dark:text-white">Crie sua conta</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">
        Cadastre-se como pessoa física. Em seguida, você poderá registrar sua empresa.
      </p>
    </div>

    <RegisterForm
      :loading="loading"
      :server-error="serverError"
      @submit="handleRegister"
    />

    <p class="text-sm font-light text-center text-slate-500 dark:text-slate-400 pt-6">
      Já tem uma conta?
      <NuxtLink to="/auth/login" class="font-medium text-indigo-600 hover:underline dark:text-indigo-400">Faça login</NuxtLink>
    </p>
  </div>
</template>
