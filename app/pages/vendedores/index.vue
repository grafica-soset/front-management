<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import SellerForm from '@/components/forms/SellerForm.vue'
import { useSellers } from '@/composables/useSellers'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import type { RecordStatusFilter, Seller, SellerPage, SellerPageItem, SellerRequest } from '@/types/Seller'
import { extractApiError } from '@/utils/apiError'
import { createClientListSearch } from '@/utils/clientListSearch'
import {
  addStatusMutation,
  canRefreshAfterStatusMutation,
  pageToReloadAfterEmptyResult,
  removeStatusMutation,
} from '@/utils/clientPageState'
import { formatBrazilianDocument, formatPhone } from '@/utils/clientFormatting'

definePageMeta({ middleware: 'auth' })

const PAGE_SIZE = 20
// A busca por nome ou documento começa a partir de dois caracteres.
const MIN_SEARCH_CHARS = 2
const auth = useAuthStore()
const toast = useToast()
const sellers = useSellers()
const data = ref<SellerPage | null>(null)
const loading = ref(false)
const listError = ref<string | null>(null)
const page = ref(0)
const searchInput = ref('')
const search = ref('')
const status = ref<RecordStatusFilter>('ALL')
const changingStatusIds = ref<number[]>([])

const modalOpen = ref(false)
const editing = ref<Seller | null>(null)
const modalLoading = ref(false)
const modalError = ref<string | null>(null)
let requestVersion = 0
let tenantVersion = 0
let editRequestVersion = 0

// USER da empresa só consulta: cadastrar, editar, inativar e reativar ficam escondidos.
const canManage = computed(() => auth.canManageActiveCompany)
const items = computed<SellerPageItem[]>(() => data.value?.items ?? [])
const totalPages = computed(() => data.value?.totalPages ?? 0)
const modalTitle = computed(() => editing.value ? `Editar vendedor — ${editing.value.name}` : 'Novo vendedor')

async function refresh(targetPage = page.value) {
  const customerId = auth.activeCompanyId
  if (!customerId) return
  const version = ++requestVersion
  loading.value = true
  listError.value = null
  try {
    const result = await sellers.listPage({ page: targetPage, size: PAGE_SIZE, search: search.value, status: status.value })
    if (version !== requestVersion || customerId !== auth.activeCompanyId) return
    const fallbackPage = pageToReloadAfterEmptyResult({
      requestedPage: targetPage,
      totalPages: result.totalPages,
      itemCount: result.items.length,
    })
    if (fallbackPage !== null) {
      await refresh(fallbackPage)
      return
    }
    data.value = result
    page.value = result.page
  } catch (err) {
    if (version !== requestVersion || customerId !== auth.activeCompanyId) return
    listError.value = extractApiError(err, 'Não foi possível carregar os vendedores.')
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

onMounted(() => refresh(0))
const listSearch = createClientListSearch({
  search: async (term) => {
    search.value = term
    await refresh(0)
    return []
  },
  invalidate: () => {
    requestVersion += 1
    loading.value = false
    listError.value = null
  },
  onStateChange: () => undefined,
  minChars: MIN_SEARCH_CHARS,
})

function currentSearchTerm(): string {
  const term = searchInput.value.trim()
  return term.length >= MIN_SEARCH_CHARS ? term : ''
}

watch(searchInput, (term) => listSearch.schedule(term))
watch(status, () => {
  search.value = currentSearchTerm()
  listSearch.cancel(search.value)
  refresh(0)
})
watch(() => auth.activeCompanyId, (customerId) => {
  search.value = currentSearchTerm()
  listSearch.cancel(search.value)
  tenantVersion += 1
  requestVersion += 1
  editRequestVersion += 1
  data.value = null
  modalOpen.value = false
  editing.value = null
  modalError.value = null
  modalLoading.value = false
  changingStatusIds.value = []
  if (!customerId) loading.value = false
  else refresh(0)
})
onBeforeUnmount(() => listSearch.cancel())

function openCreate() {
  editRequestVersion += 1
  editing.value = null
  modalError.value = null
  modalOpen.value = true
}

async function openEdit(item: SellerPageItem) {
  const currentTenantVersion = tenantVersion
  const currentEditVersion = ++editRequestVersion
  modalError.value = null
  try {
    const result = await sellers.getById(item.id)
    if (currentTenantVersion !== tenantVersion || currentEditVersion !== editRequestVersion) return
    editing.value = result
    modalOpen.value = true
  } catch (err) {
    if (currentTenantVersion === tenantVersion && currentEditVersion === editRequestVersion) {
      toast.error(extractApiError(err, 'Não foi possível abrir o vendedor.'))
    }
  }
}

function closeModal() {
  if (modalLoading.value) return
  editRequestVersion += 1
  modalOpen.value = false
  editing.value = null
  modalError.value = null
}

async function save(payload: SellerRequest) {
  const currentTenantVersion = tenantVersion
  const sellerId = editing.value?.id
  modalLoading.value = true
  modalError.value = null
  try {
    if (sellerId) await sellers.update(sellerId, payload)
    else await sellers.create(payload)
    if (currentTenantVersion !== tenantVersion) return
    toast.success(sellerId ? 'Vendedor atualizado.' : 'Vendedor cadastrado.')
    modalLoading.value = false
    closeModal()
    await refresh(sellerId ? page.value : 0)
  } catch (err) {
    if (currentTenantVersion === tenantVersion) modalError.value = extractApiError(err, 'Não foi possível salvar o vendedor.')
  } finally {
    if (currentTenantVersion === tenantVersion) modalLoading.value = false
  }
}

async function changeStatus(item: SellerPageItem) {
  const action = item.active ? 'inativar' : 'reativar'
  if (typeof window !== 'undefined' && !window.confirm(`Deseja ${action} o vendedor "${item.name}"?`)) return
  const currentTenantVersion = tenantVersion
  changingStatusIds.value = addStatusMutation(changingStatusIds.value, item.id)
  try {
    if (item.active) await sellers.deactivate(item.id)
    else await sellers.activate(item.id)
    if (!canRefreshAfterStatusMutation(currentTenantVersion, tenantVersion)) return
    toast.success(`Vendedor ${item.active ? 'inativado' : 'reativado'}.`)
    await refresh()
  } catch (err) {
    if (canRefreshAfterStatusMutation(currentTenantVersion, tenantVersion)) {
      toast.error(extractApiError(err, `Não foi possível ${action} o vendedor.`))
    }
  } finally {
    changingStatusIds.value = removeStatusMutation(changingStatusIds.value, item.id)
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Vendedores</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Vendedores de <span class="font-medium">{{ auth.activeCompany?.value ?? 'sua empresa' }}</span>.</p>
      </div>
      <button v-if="auth.activeCompanyId && canManage" type="button" class="btn-primary" @click="openCreate">
        <svg class="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" /></svg>
        Novo vendedor
      </button>
    </header>

    <div v-if="!auth.activeCompanyId" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">Selecione uma empresa para visualizar os vendedores.</div>

    <template v-else>
      <div class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_180px] dark:border-slate-700 dark:bg-slate-800" role="search">
        <div>
          <label for="seller-search" class="sr-only">Buscar vendedor</label>
          <input id="seller-search" v-model="searchInput" type="search" placeholder="Buscar por nome ou documento" class="field" />
        </div>
        <div>
          <label for="seller-status" class="sr-only">Filtrar por status</label>
          <select id="seller-status" v-model="status" class="field">
            <option value="ALL">Todos os status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </select>
        </div>
      </div>

      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div v-if="loading" class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Carregando vendedores...</div>
        <div v-else-if="listError" role="alert" class="bg-rose-50 p-6 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">{{ listError }}</div>
        <div v-else-if="items.length === 0" class="p-10 text-center">
          <svg class="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          <p class="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">Nenhum vendedor encontrado</p>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ canManage ? 'Altere os filtros ou cadastre um novo vendedor.' : 'Altere os filtros da busca.' }}</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[640px] text-left text-sm text-slate-700 dark:text-slate-200">
            <thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
              <tr>
                <th scope="col" class="px-5 py-3">Nome</th><th scope="col" class="px-5 py-3">Documento</th><th scope="col" class="px-5 py-3">Celular</th><th scope="col" class="px-5 py-3">Status</th><th v-if="canManage" scope="col" class="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              <tr v-for="item in items" :key="item.id" class="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30" :class="{ 'opacity-65': !item.active }">
                <td class="px-5 py-3 font-medium text-slate-900 dark:text-white">{{ item.name }}</td>
                <td class="px-5 py-3 font-mono">{{ formatBrazilianDocument(item.document) }}</td>
                <td class="px-5 py-3">{{ formatPhone(item.mobile) || '—' }}</td>
                <td class="px-5 py-3"><span class="status-badge" :class="item.active ? 'status-active' : 'status-inactive'">{{ item.active ? 'Ativo' : 'Inativo' }}</span></td>
                <td v-if="canManage" class="px-5 py-3"><div class="flex justify-end gap-1"><button type="button" class="link-button" @click="openEdit(item)">Editar</button><button type="button" class="link-button" :class="item.active ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'" :disabled="changingStatusIds.includes(item.id)" @click="changeStatus(item)">{{ changingStatusIds.includes(item.id) ? 'Aguarde...' : item.active ? 'Inativar' : 'Reativar' }}</button></div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="data && data.totalItems > 0" class="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row dark:border-slate-700 dark:text-slate-400">
          <span>{{ data?.totalItems ?? 0 }} vendedor(es) — página {{ page + 1 }} de {{ Math.max(totalPages, 1) }}</span>
          <div class="flex gap-2"><button type="button" class="pager" :disabled="page === 0 || loading" @click="refresh(page - 1)">Anterior</button><button type="button" class="pager" :disabled="page + 1 >= totalPages || loading" @click="refresh(page + 1)">Próxima</button></div>
        </div>
      </div>
    </template>

    <Modal :is-open="modalOpen" :title="modalTitle" @close="closeModal">
      <SellerForm v-if="modalOpen" :key="editing?.id ?? 'new-seller'" :initial="editing" :loading="modalLoading" :server-error="modalError" :submit-label="editing ? 'Salvar alterações' : 'Cadastrar vendedor'" @submit="save" @cancel="closeModal" />
    </Modal>
  </div>
</template>

<style scoped>
.field { @apply block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white; }
.btn-primary { @apply inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300; }
.link-button { @apply rounded-md px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 dark:text-indigo-300 dark:hover:bg-slate-700; }
.status-badge { @apply inline-flex rounded-full px-2 py-0.5 text-xs font-medium; }
.status-active { @apply bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200; }
.status-inactive { @apply bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200; }
.pager { @apply rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-700; }
</style>
