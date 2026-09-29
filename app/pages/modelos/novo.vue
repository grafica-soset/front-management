<script setup lang="ts">
/**
 * Cadastro de MODELO DE PRODUTO pelo menu (atividade 037). O caminho mais comum é o "Salvar como
 * modelo" do orçamento; aqui é para quem quer montar o catálogo direto. Requer empresa ativa.
 */
import { ref } from 'vue'
import ProductTemplateForm from '@/components/forms/ProductTemplateForm.vue'
import { useProductTemplates } from '@/composables/useProductTemplates'
import { useProductCatalog } from '@/composables/useProductCatalog'
import { useQuoteCatalogs } from '@/composables/useQuoteCatalogs'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import type { ProductModelKeyValue } from '@/types/ProductModel'
import type { ProductTemplateRequest } from '@/types/ProductTemplate'

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const toast = useToast()
const { create } = useProductTemplates()
const productCatalog = useProductCatalog()
const catalogs = useQuoteCatalogs()

const loading = ref(false)
const serverError = ref<string | null>(null)
const createdModel = ref<ProductModelKeyValue | null>(null)

onMounted(() => {
  if (!auth.activeCompanyId) return
  productCatalog.load().catch(() => {})
  catalogs.load().catch(() => {})
})

const createModel = async (name: string) => {
  try {
    createdModel.value = await productCatalog.createModel(name)
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível cadastrar o modelo.'))
  }
}

const handleSubmit = async (payload: ProductTemplateRequest) => {
  loading.value = true
  serverError.value = null
  try {
    const created = await create(payload)
    toast.success(`Modelo de produto "${created.label}" cadastrado.`)
    await navigateTo('/modelos')
  } catch (err) {
    serverError.value = extractApiError(err, 'Falha ao cadastrar o modelo de produto.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <NuxtLink to="/modelos" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        Voltar para a lista
      </NuxtLink>
      <h1 class="mt-3 text-2xl font-bold text-slate-900 dark:text-white">Novo modelo de produto</h1>
    </header>

    <div v-if="!auth.activeCompanyId" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
      Selecione uma empresa antes de cadastrar modelos.
    </div>

    <div v-else class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <ProductTemplateForm
        mode="create"
        :loading="loading"
        :server-error="serverError"
        :models="productCatalog.models.value"
        :templates="productCatalog.templates.value"
        :creating-model="productCatalog.creatingModel.value"
        :created-model="createdModel"
        @submit="handleSubmit"
        @create-model="createModel"
        @cancel="navigateTo('/modelos')"
      />
    </div>
  </div>
</template>
