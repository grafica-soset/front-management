<script setup lang="ts">
/**
 * Cadastro de nova máquina de furadeira. Requer empresa ativa (o `customerId` é preenchido
 * pelo composable a partir dela).
 *
 * Com `?duplicate=<id>`, busca a máquina de origem e pré-preenche o formulário (modo criação),
 * sugerindo um nome "… (cópia)". Reusa GET /{id} + POST.
 */
import { computed, ref } from 'vue'
import HolePunchingMachineForm from '@/components/forms/HolePunchingMachineForm.vue'
import { useMachines } from '@/composables/useMachines'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import { HOLE_PUNCHING_MACHINES_BASE } from '@/utils/machineCatalog'
import type { HolePunchingMachine, HolePunchingMachineRequest } from '@/types/Machine'

definePageMeta({ middleware: 'auth', key: (route) => route.fullPath })

const route = useRoute()
const auth = useAuthStore()
const toast = useToast()
const { getById, create } = useMachines<HolePunchingMachine, HolePunchingMachineRequest>(HOLE_PUNCHING_MACHINES_BASE)

const loading = ref(false)
const serverError = ref<string | null>(null)

const duplicateId = Number(route.query.duplicate)
const isDuplicating = Number.isFinite(duplicateId) && duplicateId > 0

const prefill = ref<HolePunchingMachine | null>(null)
const prefilling = ref(isDuplicating)
const prefillError = ref<string | null>(null)

const heading = computed(() =>
  isDuplicating ? 'Duplicar máquina de furadeira' : 'Nova máquina de furadeira',
)

onMounted(async () => {
  if (!isDuplicating || !auth.activeCompanyId) {
    prefilling.value = false
    return
  }
  try {
    const source = await getById(duplicateId)
    prefill.value = { ...source, name: `${source.name} (cópia)` }
  } catch (err) {
    prefillError.value = extractApiError(err, 'Não foi possível carregar a máquina para duplicar.')
  } finally {
    prefilling.value = false
  }
})

const handleSubmit = async (payload: HolePunchingMachineRequest) => {
  if (!auth.activeCompanyId) {
    serverError.value = 'Selecione uma empresa antes de cadastrar máquinas de furadeira.'
    return
  }
  loading.value = true
  serverError.value = null
  try {
    const created = await create(payload)
    toast.success(`Máquina "${created.name}" cadastrada.`)
    await navigateTo('/maquinas/furadeira')
  } catch (err) {
    serverError.value = extractApiError(err, 'Falha ao cadastrar a máquina de furadeira.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <NuxtLink to="/maquinas/furadeira" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        Voltar para a lista
      </NuxtLink>
      <h1 class="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{{ heading }}</h1>
      <p v-if="isDuplicating" class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Os parâmetros foram copiados da máquina de origem. Ajuste o que precisar e salve como uma nova máquina.
      </p>
    </header>

    <div v-if="!auth.activeCompanyId" class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200">
      Selecione uma empresa antes de cadastrar máquinas de furadeira.
    </div>

    <div v-else-if="prefilling" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando máquina para duplicar...</div>

    <div v-else-if="prefillError" class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300">
      {{ prefillError }}
    </div>

    <div v-else class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
      <HolePunchingMachineForm
        mode="create"
        :initial="prefill"
        :loading="loading"
        :server-error="serverError"
        @submit="handleSubmit"
        @cancel="navigateTo('/maquinas/furadeira')"
      />
    </div>
  </div>
</template>
