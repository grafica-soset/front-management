<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ClientAddressForm from '@/components/forms/ClientAddressForm.vue'
import ClientContactForm from '@/components/forms/ClientContactForm.vue'
import ClientDataForm from '@/components/forms/ClientDataForm.vue'
import ClientModal from '@/components/clients/ClientModal.vue'
import { useClients } from '@/composables/useClients'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import type {
  Client,
  ClientAddress,
  ClientAddressInput,
  ClientContact,
  ClientContactInput,
  ClientPage,
  ClientPageItem,
  ClientStatusFilter,
  UpdateClientRequest,
} from '@/types/Client'
import { extractApiError } from '@/utils/apiError'
import { createClientListSearch } from '@/utils/clientListSearch'
import {
  addStatusMutation,
  canRefreshAfterStatusMutation,
  pageToReloadAfterEmptyResult,
  removeStatusMutation,
} from '@/utils/clientPageState'
import { formatBrazilianDocument, formatPhone, formatPostalCode } from '@/utils/clientFormatting'

definePageMeta({ middleware: 'auth' })

const PAGE_SIZE = 20
const auth = useAuthStore()
const toast = useToast()
const clients = useClients()
const data = ref<ClientPage | null>(null)
const loading = ref(false)
const listError = ref<string | null>(null)
const page = ref(0)
const searchInput = ref('')
const search = ref('')
const status = ref<ClientStatusFilter>('ALL')
const changingStatusIds = ref<number[]>([])

type ModalView = 'data' | 'addresses' | 'contacts' | 'address-form' | 'contact-form'
const selected = ref<Client | null>(null)
const modalView = ref<ModalView>('data')
const modalLoading = ref(false)
const modalError = ref<string | null>(null)
const editingAddress = ref<ClientAddress | null>(null)
const editingContact = ref<ClientContact | null>(null)
let requestVersion = 0
let tenantVersion = 0
let editRequestVersion = 0
const tabs = [
  { id: 'data' as const, label: 'Dados' },
  { id: 'addresses' as const, label: 'Endereços' },
  { id: 'contacts' as const, label: 'Contatos' },
]

const items = computed<ClientPageItem[]>(() => data.value?.items ?? [])
const totalPages = computed(() => data.value?.totalPages ?? 0)
const modalTitle = computed(() => {
  if (!selected.value) return 'Editar cliente'
  if (modalView.value === 'address-form') return editingAddress.value ? 'Editar endereço' : 'Novo endereço'
  if (modalView.value === 'contact-form') return editingContact.value ? 'Editar contato' : 'Novo contato'
  return `Editar cliente — ${selected.value.name}`
})

async function refresh(targetPage = page.value) {
  const customerId = auth.activeCompanyId
  if (!customerId) return
  const version = ++requestVersion
  loading.value = true
  listError.value = null
  try {
    const result = await clients.listPage({ page: targetPage, size: PAGE_SIZE, search: search.value, status: status.value })
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
    listError.value = extractApiError(err, 'Não foi possível carregar os clientes.')
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

onMounted(() => refresh(0))
const listSearch = createClientListSearch({
  search: async (term) => {
    search.value = term
    await refresh(0)
    return items.value
  },
  invalidate: () => {
    requestVersion += 1
    loading.value = false
    listError.value = null
  },
  onStateChange: () => undefined,
})

watch(searchInput, (term) => listSearch.schedule(term))
watch(status, () => {
  const term = searchInput.value.trim()
  search.value = term.length >= 3 ? term : ''
  listSearch.cancel(search.value)
  refresh(0)
})
watch(() => auth.activeCompanyId, (customerId) => {
  const term = searchInput.value.trim()
  search.value = term.length >= 3 ? term : ''
  listSearch.cancel(search.value)
  tenantVersion += 1
  requestVersion += 1
  editRequestVersion += 1
  data.value = null
  selected.value = null
  editingAddress.value = null
  editingContact.value = null
  modalError.value = null
  modalLoading.value = false
  changingStatusIds.value = []
  if (!customerId) loading.value = false
  else refresh(0)
})
onBeforeUnmount(() => listSearch.cancel())

async function openEdit(item: ClientPageItem) {
  const currentTenantVersion = tenantVersion
  const currentEditVersion = ++editRequestVersion
  modalError.value = null
  try {
    const result = await clients.getById(item.id)
    if (currentTenantVersion !== tenantVersion || currentEditVersion !== editRequestVersion) return
    selected.value = result
    modalView.value = 'data'
  } catch (err) {
    if (currentTenantVersion === tenantVersion && currentEditVersion === editRequestVersion) {
      toast.error(extractApiError(err, 'Não foi possível abrir o cliente.'))
    }
  }
}

function closeModal() {
  if (modalLoading.value) return
  editRequestVersion += 1
  selected.value = null
  modalError.value = null
  editingAddress.value = null
  editingContact.value = null
}

async function saveData(payload: UpdateClientRequest) {
  if (!selected.value) return
  const clientId = selected.value.id
  const currentTenantVersion = tenantVersion
  modalLoading.value = true
  modalError.value = null
  try {
    const result = await clients.update(clientId, payload)
    if (currentTenantVersion !== tenantVersion) return
    selected.value = result
    toast.success('Dados do cliente atualizados.')
    await refresh()
  } catch (err) {
    if (currentTenantVersion === tenantVersion) modalError.value = extractApiError(err, 'Não foi possível atualizar os dados do cliente.')
  } finally {
    if (currentTenantVersion === tenantVersion) modalLoading.value = false
  }
}

async function changeStatus(item: ClientPageItem) {
  const action = item.active ? 'inativar' : 'reativar'
  if (typeof window !== 'undefined' && !window.confirm(`Deseja ${action} o cliente "${item.name}"?`)) return
  const currentTenantVersion = tenantVersion
  changingStatusIds.value = addStatusMutation(changingStatusIds.value, item.id)
  try {
    if (item.active) await clients.deactivate(item.id)
    else await clients.activate(item.id)
    if (!canRefreshAfterStatusMutation(currentTenantVersion, tenantVersion)) return
    toast.success(`Cliente ${item.active ? 'inativado' : 'reativado'}.`)
    await refresh()
  } catch (err) {
    if (canRefreshAfterStatusMutation(currentTenantVersion, tenantVersion)) {
      toast.error(extractApiError(err, `Não foi possível ${action} o cliente.`))
    }
  } finally {
    changingStatusIds.value = removeStatusMutation(changingStatusIds.value, item.id)
  }
}

function openAddressForm(address: ClientAddress | null = null) {
  editingAddress.value = address
  modalError.value = null
  modalView.value = 'address-form'
}

async function saveAddress(payload: ClientAddressInput) {
  if (!selected.value) return
  const clientId = selected.value.id
  const currentTenantVersion = tenantVersion
  modalLoading.value = true
  modalError.value = null
  try {
    const result = editingAddress.value
      ? await clients.updateAddress(clientId, editingAddress.value.id, payload)
      : await clients.addAddress(clientId, payload)
    if (currentTenantVersion !== tenantVersion) return
    selected.value = result
    toast.success(editingAddress.value ? 'Endereço atualizado.' : 'Endereço adicionado.')
    editingAddress.value = null
    modalView.value = 'addresses'
    await refresh()
  } catch (err) {
    if (currentTenantVersion === tenantVersion) modalError.value = extractApiError(err, 'Não foi possível salvar o endereço.')
  } finally {
    if (currentTenantVersion === tenantVersion) modalLoading.value = false
  }
}

async function deleteAddress(address: ClientAddress) {
  if (!selected.value || (typeof window !== 'undefined' && !window.confirm('Remover este endereço?'))) return
  const clientId = selected.value.id
  const currentTenantVersion = tenantVersion
  modalLoading.value = true
  try {
    const result = await clients.removeAddress(clientId, address.id)
    if (currentTenantVersion !== tenantVersion) return
    selected.value = result
    toast.success('Endereço removido.')
    await refresh()
  } catch (err) {
    if (currentTenantVersion === tenantVersion) toast.error(extractApiError(err, 'Não foi possível remover o endereço.'))
  } finally {
    if (currentTenantVersion === tenantVersion) modalLoading.value = false
  }
}

function openContactForm(contact: ClientContact | null = null) {
  editingContact.value = contact
  modalError.value = null
  modalView.value = 'contact-form'
}

async function saveContact(payload: ClientContactInput) {
  if (!selected.value) return
  const clientId = selected.value.id
  const currentTenantVersion = tenantVersion
  modalLoading.value = true
  modalError.value = null
  try {
    const result = editingContact.value
      ? await clients.updateContact(clientId, editingContact.value.id, payload)
      : await clients.addContact(clientId, payload)
    if (currentTenantVersion !== tenantVersion) return
    selected.value = result
    toast.success(editingContact.value ? 'Contato atualizado.' : 'Contato adicionado.')
    editingContact.value = null
    modalView.value = 'contacts'
    await refresh()
  } catch (err) {
    if (currentTenantVersion === tenantVersion) modalError.value = extractApiError(err, 'Não foi possível salvar o contato.')
  } finally {
    if (currentTenantVersion === tenantVersion) modalLoading.value = false
  }
}

async function deleteContact(contact: ClientContact) {
  if (!selected.value || (typeof window !== 'undefined' && !window.confirm('Remover este contato?'))) return
  const clientId = selected.value.id
  const currentTenantVersion = tenantVersion
  modalLoading.value = true
  try {
    const result = await clients.removeContact(clientId, contact.id)
    if (currentTenantVersion !== tenantVersion) return
    selected.value = result
    toast.success('Contato removido.')
    await refresh()
  } catch (err) {
    if (currentTenantVersion === tenantVersion) toast.error(extractApiError(err, 'Não foi possível remover o contato.'))
  } finally {
    if (currentTenantVersion === tenantVersion) modalLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Clientes</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Gerencie quem compra de <span class="font-medium">{{ auth.activeCompany?.value ?? 'sua empresa' }}</span>.</p>
      </div>
      <NuxtLink v-if="auth.activeCompanyId" to="/clientes/novo" class="btn-primary">
        <svg class="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" /></svg>
        Novo cliente
      </NuxtLink>
    </header>

    <div v-if="!auth.activeCompanyId" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">Selecione uma empresa para visualizar os clientes.</div>

    <template v-else>
      <div class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_180px] dark:border-slate-700 dark:bg-slate-800" role="search">
        <div>
          <label for="client-search" class="sr-only">Buscar cliente</label>
          <input id="client-search" v-model="searchInput" type="search" placeholder="Buscar por nome, CPF ou CNPJ" class="field" />
        </div>
        <div>
          <label for="client-status" class="sr-only">Filtrar por status</label>
          <select id="client-status" v-model="status" class="field">
            <option value="ALL">Todos os status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </select>
        </div>
      </div>

      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div v-if="loading" class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Carregando clientes...</div>
        <div v-else-if="listError" role="alert" class="bg-rose-50 p-6 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">{{ listError }}</div>
        <div v-else-if="items.length === 0" class="p-10 text-center">
          <svg class="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          <p class="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">Nenhum cliente encontrado</p>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Altere os filtros ou cadastre um novo cliente.</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[860px] text-left text-sm text-slate-700 dark:text-slate-200">
            <thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
              <tr>
                <th scope="col" class="px-5 py-3">Nome</th><th scope="col" class="px-5 py-3">Documento</th><th scope="col" class="px-5 py-3">Contato principal</th><th scope="col" class="px-5 py-3">Cidade principal</th><th scope="col" class="px-5 py-3">Status</th><th scope="col" class="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              <tr v-for="item in items" :key="item.id" class="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30" :class="{ 'opacity-65': !item.active }">
                <td class="px-5 py-3 font-medium text-slate-900 dark:text-white">{{ item.name }}</td>
                <td class="px-5 py-3">{{ formatBrazilianDocument(item.document) }}</td>
                <td class="px-5 py-3">{{ item.primaryContact || '—' }}</td>
                <td class="px-5 py-3">{{ item.primaryCity || '—' }}</td>
                <td class="px-5 py-3"><span class="status-badge" :class="item.active ? 'status-active' : 'status-inactive'">{{ item.active ? 'Ativo' : 'Inativo' }}</span></td>
               <td class="px-5 py-3"><div class="flex justify-end gap-1"><button type="button" class="link-button" @click="openEdit(item)">Editar</button><button type="button" class="link-button" :class="item.active ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'" :disabled="changingStatusIds.includes(item.id)" @click="changeStatus(item)">{{ changingStatusIds.includes(item.id) ? 'Aguarde...' : item.active ? 'Inativar' : 'Reativar' }}</button></div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="data && data.totalItems > 0" class="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row dark:border-slate-700 dark:text-slate-400">
          <span>{{ data?.totalItems ?? 0 }} cliente(s) — página {{ page + 1 }} de {{ Math.max(totalPages, 1) }}</span>
          <div class="flex gap-2"><button type="button" class="pager" :disabled="page === 0 || loading" @click="refresh(page - 1)">Anterior</button><button type="button" class="pager" :disabled="page + 1 >= totalPages || loading" @click="refresh(page + 1)">Próxima</button></div>
        </div>
      </div>
    </template>

    <ClientModal :is-open="!!selected" :title="modalTitle" @close="closeModal">
      <template v-if="selected">
        <div v-if="modalView === 'address-form' || modalView === 'contact-form'" class="mb-5">
          <button type="button" class="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-indigo-900 dark:text-indigo-300" @click="modalView = modalView === 'address-form' ? 'addresses' : 'contacts'">
            <svg class="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 19-7-7 7-7M19 12H5" /></svg> Voltar para o cliente
          </button>
        </div>
        <div v-else class="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700" role="tablist" aria-label="Seções do cliente">
          <button v-for="tab in tabs" :key="tab.id" type="button" role="tab" :aria-selected="modalView === tab.id" class="whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium" :class="modalView === tab.id ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'" @click="modalView = tab.id">{{ tab.label }}</button>
        </div>

        <ClientDataForm v-if="modalView === 'data'" :key="`data-${selected.id}-${selected.document}`" :initial="selected" :loading="modalLoading" :server-error="modalError" @submit="saveData" @cancel="closeModal" />

        <div v-else-if="modalView === 'addresses'" class="space-y-4">
          <div class="flex justify-between gap-3"><p class="text-sm text-slate-500 dark:text-slate-400">O endereço principal é usado como referência na listagem.</p><button type="button" class="btn-secondary whitespace-nowrap" @click="openAddressForm()">Adicionar endereço</button></div>
          <div v-if="selected.addresses.length" class="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
            <div v-for="address in selected.addresses" :key="address.id" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div class="flex flex-wrap items-center gap-2"><span class="font-medium text-slate-900 dark:text-white">{{ address.nickname || address.street || 'Endereço' }}</span><span v-if="address.addressType === 'MAIN'" class="status-badge bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">Principal</span></div><p class="mt-1 text-sm text-slate-500">{{ [address.street, address.number, address.city, address.state, formatPostalCode(address.postalCode)].filter(Boolean).join(' · ') || 'Sem detalhes informados' }}</p></div><div class="flex gap-1"><button type="button" class="link-button" @click="openAddressForm(address)">Editar</button><button type="button" class="link-button text-rose-700 dark:text-rose-300" :disabled="modalLoading" @click="deleteAddress(address)">Remover</button></div></div>
          </div>
          <p v-else class="empty-state">Nenhum endereço cadastrado.</p>
        </div>
        <ClientAddressForm v-else-if="modalView === 'address-form'" :key="editingAddress?.id ?? 'new-address'" :initial="editingAddress" :loading="modalLoading" :server-error="modalError" @submit="saveAddress" @cancel="modalView = 'addresses'" />

        <div v-else-if="modalView === 'contacts'" class="space-y-4">
          <div class="flex justify-between gap-3"><p class="text-sm text-slate-500 dark:text-slate-400">Mantenha um contato principal para facilitar o atendimento.</p><button type="button" class="btn-secondary whitespace-nowrap" @click="openContactForm()">Adicionar contato</button></div>
          <div v-if="selected.contacts.length" class="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
            <div v-for="contact in selected.contacts" :key="contact.id" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div class="flex flex-wrap items-center gap-2"><span class="font-medium text-slate-900 dark:text-white">{{ contact.name }}</span><span v-if="contact.primary" class="status-badge bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">Principal</span></div><p class="mt-1 text-sm text-slate-500">{{ [contact.position, contact.email, formatPhone(contact.mobile || contact.phone)].filter(Boolean).join(' · ') || 'Sem dados adicionais' }}</p></div><div class="flex gap-1"><button type="button" class="link-button" @click="openContactForm(contact)">Editar</button><button type="button" class="link-button text-rose-700 dark:text-rose-300" :disabled="modalLoading" @click="deleteContact(contact)">Remover</button></div></div>
          </div>
          <p v-else class="empty-state">Nenhum contato cadastrado.</p>
        </div>
        <ClientContactForm v-else-if="modalView === 'contact-form'" :key="editingContact?.id ?? 'new-contact'" :initial="editingContact" :loading="modalLoading" :server-error="modalError" @submit="saveContact" @cancel="modalView = 'contacts'" />
      </template>
    </ClientModal>
  </div>
</template>

<style scoped>
.field { @apply block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white; }
.btn-primary { @apply inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300; }
.btn-secondary { @apply inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700; }
.link-button { @apply rounded-md px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 dark:text-indigo-300 dark:hover:bg-slate-700; }
.status-badge { @apply inline-flex rounded-full px-2 py-0.5 text-xs font-medium; }
.status-active { @apply bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200; }
.status-inactive { @apply bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200; }
.pager { @apply rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-700; }
.empty-state { @apply rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400; }
</style>
