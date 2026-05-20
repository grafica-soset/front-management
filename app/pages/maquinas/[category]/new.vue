<script setup lang="ts">
/**
 * Cadastro de nova máquina na categoria do slug. Requer empresa ativa
 * (o `customerId` é preenchido pelo composable a partir dela).
 */
import { ref } from 'vue'
import MachineForm from '@/components/forms/MachineForm.vue'
import { useMachines } from '@/composables/useMachines'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import { categoryMetaBySlug } from '@/utils/machineCatalog'
import type { MachineRequest } from '@/types/Machine'

definePageMeta({ middleware: 'auth', key: (route) => route.path })

const route = useRoute()
const meta = categoryMetaBySlug(String(route.params.category))
if (!meta) throw createError({ statusCode: 404, statusMessage: 'Categoria de máquina inválida', fatal: true })

const auth = useAuthStore()
const toast = useToast()
const { create } = useMachines(meta.base)

const loading = ref(false)
const serverError = ref<string | null>(null)

const listUrl = `/maquinas/${meta.slug}`

const handleSubmit = async (payload: MachineRequest) => {
  if (!auth.activeCompanyId) {
    serverError.value = 'Selecione uma empresa antes de cadastrar máquinas.'
    return
  }
  loading.value = true
  serverError.value = null
  try {
    const created = await create(payload)
    toast.success(`Máquina "${created.name}" cadastrada.`)
    await navigateTo(listUrl)
  } catch (err) {
    serverError.value = extractApiError(err, 'Falha ao cadastrar a máquina.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <NuxtLink :to="listUrl" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        Voltar para a lista
      </NuxtLink>
      <h1 class="mt-3 text-2xl font-bold text-slate-900 dark:text-white">Nova máquina — {{ meta.label }}</h1>
    </header>

    <div v-if="!auth.activeCompanyId" class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200">
      Selecione uma empresa antes de cadastrar máquinas.
    </div>

    <div v-else class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
      <MachineForm
        :category="meta.category"
        :loading="loading"
        :server-error="serverError"
        @submit="handleSubmit"
        @cancel="navigateTo(listUrl)"
      />
    </div>
  </div>
</template>
