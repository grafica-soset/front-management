<script setup lang="ts">
import { ref } from 'vue'
import ClientForm from '@/components/forms/ClientForm.vue'
import { useClients } from '@/composables/useClients'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import type { RegisterClientRequest } from '@/types/Client'
import { extractApiError } from '@/utils/apiError'

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const toast = useToast()
const { create } = useClients()
const loading = ref(false)
const error = ref<string | null>(null)

async function handleSubmit(payload: RegisterClientRequest) {
  const customerId = auth.activeCompanyId
  if (!customerId) return
  loading.value = true
  error.value = null
  try {
    const client = await create(payload)
    if (customerId !== auth.activeCompanyId) return
    toast.success(`Cliente "${client.name}" cadastrado.`)
    await navigateTo('/clientes')
  } catch (err) {
    if (customerId === auth.activeCompanyId) error.value = extractApiError(err, 'Não foi possível cadastrar o cliente.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <header>
      <NuxtLink to="/clientes" class="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200">
        <svg class="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 19-7-7 7-7M19 12H5" /></svg>
        Voltar para clientes
      </NuxtLink>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Novo cliente</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Cadastre um cliente de <span class="font-medium">{{ auth.activeCompany?.value ?? 'sua empresa' }}</span>. Nenhuma credencial de acesso será criada.
      </p>
    </header>

    <div v-if="!auth.activeCompanyId" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
      Selecione uma empresa antes de cadastrar um cliente.
    </div>
    <div v-else class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-700 dark:bg-slate-800">
      <ClientForm :loading="loading" :server-error="error" @submit="handleSubmit" @cancel="navigateTo('/clientes')" />
    </div>
  </div>
</template>
