<script setup lang="ts">
/**
 * Cadastro de novo usuário interno da empresa (POST /customer-users).
 *
 * Requer empresa ativa selecionada. A guarda de "caller é ADMIN do tenant"
 * é feita pelo backend — se o usuário logado não for ADMIN da empresa atual,
 * a chamada retorna 403 e exibimos a mensagem no próprio formulário.
 */
import { ref } from 'vue'
import CustomerUserForm from '@/components/forms/CustomerUserForm.vue'
import { useCustomerUsers } from '@/composables/useCustomerUsers'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import type { CreateCustomerUserRequest } from '@/types/CustomerUser'

definePageMeta({
  middleware: 'auth',
})

const auth = useAuthStore()
const toast = useToast()
const { createUser } = useCustomerUsers()

const loading = ref(false)
const serverError = ref<string | null>(null)

const handleSubmit = async (payload: CreateCustomerUserRequest) => {
  if (!auth.activeCompanyId) {
    serverError.value = 'Selecione uma empresa antes de cadastrar usuários.'
    return
  }
  loading.value = true
  serverError.value = null
  try {
    const response = await createUser(payload)
    toast.success(`Usuário "${response.person.name}" cadastrado.`)
    await navigateTo('/usuarios')
  } catch (err) {
    serverError.value = extractApiError(err, 'Falha ao cadastrar usuário.')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => navigateTo('/usuarios')
</script>

<template>
  <div class="max-w-3xl space-y-6">
    <header>
      <NuxtLink
        to="/usuarios"
        class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
        Voltar para a lista
      </NuxtLink>
      <h1 class="mt-3 text-2xl font-bold text-slate-900 dark:text-white">Novo usuário</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Cadastra um usuário interno em <span class="font-medium">{{ auth.activeCompany?.value ?? '—' }}</span>.
        Apenas administradores da empresa podem realizar esta ação.
      </p>
    </header>

    <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
      <CustomerUserForm
        :loading="loading"
        :server-error="serverError"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>
  </div>
</template>
