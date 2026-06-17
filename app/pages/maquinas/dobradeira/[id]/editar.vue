<script setup lang="ts">
/**
 * Edição de máquina de dobradeira. Busca a máquina completa (GET /folding-machines/{id})
 * para popular o formulário e salva via PUT.
 */
import { ref } from 'vue'
import FoldingMachineForm from '@/components/forms/FoldingMachineForm.vue'
import { useMachines } from '@/composables/useMachines'
import { useToast } from '@/composables/useToast'
import { extractApiError } from '@/utils/apiError'
import { FOLDING_MACHINES_BASE } from '@/utils/machineCatalog'
import type { FoldingMachine, FoldingMachineRequest } from '@/types/Machine'

definePageMeta({ middleware: 'auth', key: (route) => route.path })

const route = useRoute()
const machineId = Number(route.params.id)
if (!Number.isFinite(machineId) || machineId <= 0) {
  throw createError({ statusCode: 404, statusMessage: 'Máquina inválida', fatal: true })
}

const toast = useToast()
const { getById, update } = useMachines<FoldingMachine, FoldingMachineRequest>(FOLDING_MACHINES_BASE)

const machine = ref<FoldingMachine | null>(null)
const loadingDetail = ref(true)
const detailError = ref<string | null>(null)
const saving = ref(false)
const serverError = ref<string | null>(null)

onMounted(async () => {
  try {
    machine.value = await getById(machineId)
  } catch (err) {
    detailError.value = extractApiError(err, 'Máquina não encontrada.')
  } finally {
    loadingDetail.value = false
  }
})

const handleSubmit = async (payload: FoldingMachineRequest) => {
  saving.value = true
  serverError.value = null
  try {
    const updated = await update(machineId, payload)
    toast.success(`Máquina "${updated.name}" atualizada.`)
    await navigateTo('/maquinas/dobradeira')
  } catch (err) {
    serverError.value = extractApiError(err, 'Falha ao atualizar a máquina de dobradeira.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <NuxtLink to="/maquinas/dobradeira" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        Voltar para a lista
      </NuxtLink>
      <h1 class="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
        Editar dobradeira<span v-if="machine"> — {{ machine.name }}</span>
      </h1>
    </header>

    <div v-if="loadingDetail" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando máquina...</div>
    <div v-else-if="detailError" class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300">
      {{ detailError }}
    </div>
    <div v-else-if="machine" class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
      <FoldingMachineForm mode="edit" :initial="machine" :loading="saving" :server-error="serverError" @submit="handleSubmit" @cancel="navigateTo('/maquinas/dobradeira')" />
    </div>
  </div>
</template>
