<script setup lang="ts">
import { ref } from 'vue'
import LoginForm from '@/components/forms/LoginForm.vue'
import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import type { LoginRequest } from '@/types/LoginRequest'

definePageMeta({
  layout: 'empty',
  middleware: 'guest',
})

const route = useRoute()
const { login } = useAuth()
const auth = useAuthStore()

const loading = ref(false)
const serverError = ref<string | null>(null)

// Pré-preenche o usuário quando o cadastro redireciona com ?username=...
const initialUsername = (route.query.username as string | undefined) ?? ''

const handleLogin = async (payload: LoginRequest) => {
  loading.value = true
  serverError.value = null
  try {
    await login(payload)
    // Usuário sem empresa cai no onboarding; com empresa, vai ao dashboard
    // (ou ao redirect original informado na query).
    const redirect = (route.query.redirect as string | undefined) ?? null
    if (redirect && redirect.startsWith('/')) {
      await navigateTo(redirect)
    } else {
      await navigateTo(auth.hasCustomer ? '/' : '/onboarding')
    }
  } catch (err) {
    serverError.value = extractApiError(err, 'Falha ao autenticar.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-md bg-white rounded-2xl shadow-xl dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-8 sm:p-10">
    <div class="flex items-center justify-center mb-8">
      <div class="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
      </div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white ml-3">GraphicOS</h1>
    </div>

    <div class="text-center mb-8">
      <h2 class="text-xl font-bold text-slate-900 dark:text-white">Acesse sua conta</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Use seu usuário e senha para entrar.</p>
    </div>

    <LoginForm
      :loading="loading"
      :server-error="serverError"
      :initial-username="initialUsername"
      @submit="handleLogin"
    />

    <p class="text-sm font-light text-center text-slate-500 dark:text-slate-400 pt-6">
      Ainda não tem uma conta?
      <NuxtLink to="/auth/cadastro" class="font-medium text-indigo-600 hover:underline dark:text-indigo-400">Cadastre-se</NuxtLink>
    </p>
  </div>
</template>
