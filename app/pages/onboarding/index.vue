<script setup lang="ts">
import { ref } from 'vue'
import CompanyForm from '@/components/forms/CompanyForm.vue'
import { useOnboarding } from '@/composables/useOnboarding'
import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import type { CreateCustomerRequest } from '@/types/CreateCustomerRequest'

definePageMeta({
  layout: 'empty',
  middleware: 'onboarding',
})

const { createCustomer } = useOnboarding()
const { logout } = useAuth()
const auth = useAuthStore()

const loading = ref(false)
const serverError = ref<string | null>(null)

const handleSubmit = async (payload: CreateCustomerRequest) => {
  loading.value = true
  serverError.value = null
  try {
    await createCustomer(payload)
    // Empresa criada → role CUSTOMER já refletida no store → dashboard.
    await navigateTo('/')
  } catch (err) {
    serverError.value = extractApiError(err, 'Falha ao cadastrar a empresa.')
  } finally {
    loading.value = false
  }
}

const handleCancel = async () => {
  // Sem empresa não há para onde ir — interpreta cancelamento como sair.
  await logout()
  return navigateTo('/auth/login')
}
</script>

<template>
  <div class="w-full max-w-2xl bg-white rounded-2xl shadow-xl dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-8 sm:p-10">
    <div class="flex items-center justify-center mb-6">
      <div class="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
      </div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white ml-3">GraphicOS</h1>
    </div>

    <div class="text-center mb-8">
      <h2 class="text-xl font-bold text-slate-900 dark:text-white">
        Bem-vindo, {{ auth.user?.name?.split(' ')[0] ?? 'visitante' }}!
      </h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">
        Para começar, cadastre os dados da sua empresa. Você ficará como administrador do tenant.
      </p>
    </div>

    <CompanyForm
      :loading="loading"
      :server-error="serverError"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>
