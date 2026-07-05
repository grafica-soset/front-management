<script setup lang="ts">
/**
 * Cadastro de novo insumo (atividade 027). Requer empresa ativa (o `customerId` é preenchido pelo
 * composable). Aceita `?type=INK|PLATE|OTHER` para pré-selecionar o tipo vindo da aba de origem.
 */
import { computed, ref } from 'vue'
import SupplyForm from '@/components/forms/SupplyForm.vue'
import { useSupplies } from '@/composables/useSupplies'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import { SUPPLY_TYPES } from '@/utils/supplyCatalog'
import type { CreateSupplyRequest, Supply, SupplyType, UpdateSupplyRequest } from '@/types/Supply'

definePageMeta({ middleware: 'auth', key: (route) => route.fullPath })

const route = useRoute()
const auth = useAuthStore()
const toast = useToast()
const { create } = useSupplies()

const loading = ref(false)
const serverError = ref<string | null>(null)

// Tipo inicial vindo da aba de origem (query), com fallback para OUTROS.
const queryType = String(route.query.type ?? '')
const initialType: SupplyType = (SUPPLY_TYPES as string[]).includes(queryType)
  ? (queryType as SupplyType)
  : 'OTHER'

// Pré-preenche apenas o tipo; o formulário cuida do restante.
const prefill = computed<Supply>(() => ({
  id: 0,
  customerId: auth.activeCompanyId ?? 0,
  type: initialType,
  name: '',
  unitOfMeasure: 'UNIT',
  unitCost: 0,
  description: null,
  active: true,
  plate: null,
  supplyGroupId: null,
}))

const handleSubmit = async (payload: CreateSupplyRequest | UpdateSupplyRequest) => {
  if (!auth.activeCompanyId) {
    serverError.value = 'Selecione uma empresa antes de cadastrar insumos.'
    return
  }
  loading.value = true
  serverError.value = null
  try {
    const created = await create(payload as CreateSupplyRequest)
    toast.success(`Insumo "${created.name}" cadastrado.`)
    await navigateTo('/insumos')
  } catch (err) {
    serverError.value = extractApiError(err, 'Falha ao cadastrar o insumo.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <NuxtLink to="/insumos" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        Voltar para a lista
      </NuxtLink>
      <h1 class="mt-3 text-2xl font-bold text-slate-900 dark:text-white">Novo insumo</h1>
    </header>

    <div v-if="!auth.activeCompanyId" class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200">
      Selecione uma empresa antes de cadastrar insumos.
    </div>

    <div v-else class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
      <SupplyForm
        mode="create"
        :initial="prefill"
        :loading="loading"
        :server-error="serverError"
        @submit="handleSubmit"
        @cancel="navigateTo('/insumos')"
      />
    </div>
  </div>
</template>
