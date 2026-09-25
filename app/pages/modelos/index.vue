<script setup lang="ts">
/**
 * MODELO DE PRODUTOS (atividade 037) — o catálogo de produtos salvos, únicos por Modelo + Tipo.
 *
 * Grade paginada com busca por Modelo ou Tipo. Edição em modal (é aqui, e não no orçamento, que um
 * modelo salvo se altera); cadastro em página (/modelos/novo). A exclusão não mexe nos orçamentos
 * que partiram do modelo — eles guardam a configuração inteira.
 */
import { computed, ref } from 'vue'
import { useProductTemplates } from '@/composables/useProductTemplates'
import { useProductCatalog } from '@/composables/useProductCatalog'
import { useQuoteCatalogs } from '@/composables/useQuoteCatalogs'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import { formatPercent } from '@/utils/pricing'
import type { ProductModelKeyValue } from '@/types/ProductModel'
import type { ProductTemplate, ProductTemplateRequest } from '@/types/ProductTemplate'
import Modal from '@/components/ui/Modal.vue'
import ProductTemplateForm from '@/components/forms/ProductTemplateForm.vue'

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const toast = useToast()
const { listPage, getById, update, remove } = useProductTemplates()
const productCatalog = useProductCatalog()
const catalogs = useQuoteCatalogs()

const PAGE_SIZE = 20
const items = ref<ProductTemplate[]>([])
const page = ref(0)
const totalItems = ref(0)
const totalPages = ref(0)
const onlyActive = ref(false)
const search = ref('')
const loading = ref(false)
const listError = ref<string | null>(null)
const deletingId = ref<number | null>(null)

const editing = ref<ProductTemplate | null>(null)
const editOpen = ref(false)
const editLoading = ref(false)
const editError = ref<string | null>(null)
const createdModel = ref<ProductModelKeyValue | null>(null)

const hasCompany = computed(() => !!auth.activeCompanyId)

const refresh = async () => {
  if (!hasCompany.value) return
  loading.value = true
  listError.value = null
  try {
    const res = await listPage({
      page: page.value,
      size: PAGE_SIZE,
      onlyActive: onlyActive.value,
      search: search.value.trim() || undefined,
    })
    items.value = res.items
    totalItems.value = res.totalItems
    totalPages.value = res.totalPages
  } catch (err) {
    listError.value = extractApiError(err, 'Falha ao carregar os modelos de produto.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refresh()
  if (hasCompany.value) catalogs.load().catch(() => {})
})
watch(onlyActive, () => { page.value = 0; refresh() })

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 0; refresh() }, 300)
})

const goToPage = (next: number) => {
  if (next < 0 || next >= totalPages.value) return
  page.value = next
  refresh()
}

const structureOf = (t: ProductTemplate) => {
  const base = t.structure === 'BLADE' ? `Lâmina · ${t.blades} lâmina(s)` : `Bloco · ${t.vias} via(s)`
  const covers = t.hasCovers ? ` + ${t.coverCount} capa(s)` : ''
  const identical = t.identicalArtwork === true ? ' · iguais' : t.identicalArtwork === false ? ` · ${t.distinctArtworks ?? '?'} desenho(s)` : ''
  return `${base}${covers}${identical}`
}

const stepsOf = (t: ProductTemplate) =>
  t.activityIds.map((id) => catalogs.findActivity(id)?.value ?? `#${id}`).join(' · ')

const openEdit = async (t: ProductTemplate) => {
  editError.value = null
  createdModel.value = null
  try {
    await productCatalog.load()
    editing.value = await getById(t.id)
    editOpen.value = true
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível abrir o modelo de produto.'))
  }
}
const closeEdit = () => { editOpen.value = false; editing.value = null }

const createModel = async (name: string) => {
  try {
    createdModel.value = await productCatalog.createModel(name)
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível cadastrar o modelo.'))
  }
}

const handleUpdate = async (payload: ProductTemplateRequest) => {
  if (!editing.value) return
  editLoading.value = true
  editError.value = null
  try {
    const saved = await update(editing.value.id, payload)
    toast.success(`Modelo de produto "${saved.label}" atualizado.`)
    closeEdit()
    await refresh()
  } catch (err) {
    editError.value = extractApiError(err, 'Falha ao atualizar o modelo de produto.')
  } finally {
    editLoading.value = false
  }
}

const handleDelete = async (t: ProductTemplate) => {
  if (!window.confirm(`Remover o modelo de produto "${t.label}"? Os orçamentos que partiram dele não mudam.`)) return
  deletingId.value = t.id
  try {
    await remove(t.id)
    toast.success(`Modelo de produto "${t.label}" removido.`)
    if (items.value.length === 1 && page.value > 0) page.value -= 1
    await refresh()
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível remover o modelo de produto.'))
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Modelo de produtos</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Produtos salvos para reaproveitar no orçamento — um por Modelo + Tipo.
        </p>
      </div>
      <NuxtLink v-if="hasCompany" to="/modelos/novo" class="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Novo modelo de produto
      </NuxtLink>
    </header>

    <div v-if="!hasCompany" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
      Selecione uma empresa para ver e gerenciar os modelos.
    </div>

    <template v-else>
      <div class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-800">
        <input v-model="search" type="search" placeholder="Buscar por modelo ou tipo" class="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 sm:max-w-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
        <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input v-model="onlyActive" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          Apenas ativos
        </label>
      </div>

      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div v-if="loading" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando modelos...</div>
        <div v-else-if="listError" class="bg-rose-50 p-6 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">{{ listError }}</div>
        <div v-else-if="items.length === 0" class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Nenhum modelo de produto. Salve um a partir do orçamento ("Salvar como modelo") ou cadastre aqui.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-500 dark:text-slate-400">
            <thead class="bg-slate-50/50 text-xs uppercase text-slate-700 dark:bg-slate-700/50 dark:text-slate-300">
              <tr>
                <th class="px-5 py-3 font-semibold">Modelo &gt; Tipo</th>
                <th class="px-5 py-3 font-semibold">Estrutura</th>
                <th class="px-5 py-3 font-semibold">Atividades</th>
                <th class="px-5 py-3 text-right font-semibold">Com.+Imp.+Markup</th>
                <th class="px-5 py-3 text-center font-semibold">Status</th>
                <th class="px-5 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
              <tr v-for="t in items" :key="t.id" class="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                <td class="px-5 py-3">
                  <span class="block text-xs text-slate-500 dark:text-slate-400">{{ t.productModelName }}</span>
                  <span class="block font-medium text-slate-900 dark:text-white">{{ t.typeName }}</span>
                </td>
                <td class="px-5 py-3 text-slate-700 dark:text-slate-200">{{ structureOf(t) }}</td>
                <td class="max-w-xs truncate px-5 py-3 text-slate-700 dark:text-slate-200" :title="stepsOf(t)">{{ stepsOf(t) }}</td>
                <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{{ formatPercent(t.totalPricePercent) }}</td>
                <td class="px-5 py-3 text-center">
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="t.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'">
                    {{ t.active ? 'Ativo' : 'Inativo' }}
                  </span>
                </td>
                <td class="px-5 py-3 text-right">
                  <div class="inline-flex items-center gap-1">
                    <button type="button" class="rounded-md px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-700" @click="openEdit(t)">Editar</button>
                    <button type="button" :disabled="deletingId === t.id" class="rounded-md px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-slate-700" @click="handleDelete(t)">Excluir</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!loading && !listError && totalPages > 1" class="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-700/50">
          <span class="text-xs text-slate-500 dark:text-slate-400">{{ totalItems }} modelo(s) — página {{ page + 1 }} de {{ totalPages }}</span>
          <div class="flex gap-2">
            <button type="button" :disabled="page === 0" class="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700" @click="goToPage(page - 1)">Anterior</button>
            <button type="button" :disabled="page + 1 >= totalPages" class="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700" @click="goToPage(page + 1)">Próxima</button>
          </div>
        </div>
      </div>
    </template>

    <Modal :is-open="editOpen" title="Editar modelo de produto" size="5xl" @close="closeEdit">
      <ProductTemplateForm
        v-if="editing"
        mode="edit"
        :initial="editing"
        :loading="editLoading"
        :server-error="editError"
        :models="productCatalog.models.value"
        :templates="productCatalog.templates.value"
        :creating-model="productCatalog.creatingModel.value"
        :created-model="createdModel"
        @submit="handleUpdate"
        @create-model="createModel"
        @cancel="closeEdit"
      />
    </Modal>
  </div>
</template>
