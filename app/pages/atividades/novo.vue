<script setup lang="ts">
/**
 * Cadastro de nova atividade (atividade 028). Requer empresa ativa (customerId preenchido pelo composable).
 */
import { ref } from 'vue'
import ActivityForm from '@/components/forms/ActivityForm.vue'
import { useActivities } from '@/composables/useActivities'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import type { CreateActivityRequest, UpdateActivityRequest } from '@/types/Activity'

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const toast = useToast()
const { create } = useActivities()

const loading = ref(false)
const serverError = ref<string | null>(null)

const handleSubmit = async (payload: CreateActivityRequest | UpdateActivityRequest) => {
  if (!auth.activeCompanyId) {
    serverError.value = 'Selecione uma empresa antes de cadastrar atividades.'
    return
  }
  loading.value = true
  serverError.value = null
  try {
    const created = await create(payload as CreateActivityRequest)
    toast.success(`Atividade "${created.name}" cadastrada.`)
    await navigateTo('/atividades')
  } catch (err) {
    serverError.value = extractApiError(err, 'Falha ao cadastrar a atividade.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <NuxtLink to="/atividades" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        Voltar para a lista
      </NuxtLink>
      <h1 class="mt-3 text-2xl font-bold text-slate-900 dark:text-white">Nova atividade</h1>
    </header>

    <div v-if="!auth.activeCompanyId" class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200">
      Selecione uma empresa antes de cadastrar atividades.
    </div>

    <div v-else class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
      <ActivityForm mode="create" :loading="loading" :server-error="serverError" @submit="handleSubmit" @cancel="navigateTo('/atividades')" />
    </div>
  </div>
</template>
