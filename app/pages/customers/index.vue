<script setup lang="ts">
import type {
  CustomerResponse,
  PageResponse,
  UpdateCustomerRequest,
} from '~/types'

const customersApi = useCustomers()

const page = ref(0)
const size = ref(20)
const nameFilter = ref('')
const debouncedFilter = ref('')
const activeFilter = ref<string | null>(null)

const data = ref<PageResponse<CustomerResponse> | null>(null)
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const editing = ref<CustomerResponse | null>(null)
const editingOpen = ref(false)
const saving = ref(false)

const statusOptions = [
  { value: 'true', label: 'Ativos' },
  { value: 'false', label: 'Inativos' },
]

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

let filterTimer: ReturnType<typeof setTimeout> | null = null
watch(nameFilter, (value) => {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    debouncedFilter.value = value.trim()
    page.value = 0
  }, 350)
})

watch(activeFilter, () => {
  page.value = 0
})

const fetchCustomers = async () => {
  loading.value = true
  errorMessage.value = null
  try {
    data.value = await customersApi.getPage({
      page: page.value,
      size: size.value,
      name: debouncedFilter.value || undefined,
      active: activeFilter.value === null ? undefined : activeFilter.value === 'true',
    })
  } catch (err) {
    logApiError('Falha ao carregar clientes', err)
    errorMessage.value = extractApiErrorMessage(
      err,
      'Não foi possível carregar a lista de clientes.',
    )
  } finally {
    loading.value = false
  }
}

watch([page, size, debouncedFilter, activeFilter], fetchCustomers, { immediate: true })

const totalPages = computed(() => data.value?.totalPages ?? 0)

const openEdit = (customer: CustomerResponse) => {
  editing.value = customer
  editingOpen.value = true
}

const closeEdit = () => {
  editingOpen.value = false
  editing.value = null
}

const handleEditSubmit = async (payload: UpdateCustomerRequest) => {
  if (!editing.value) return
  saving.value = true
  errorMessage.value = null
  try {
    await customersApi.update(editing.value.id, payload)
    closeEdit()
    await fetchCustomers()
  } catch (err) {
    logApiError('Falha ao salvar cliente', err)
    errorMessage.value = extractApiErrorMessage(err, 'Falha ao salvar cliente.')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (customer: CustomerResponse) => {
  const label = customer.person?.corporateName || customer.person?.name
  if (!confirm(`Excluir o cliente "${label}"?`)) return
  try {
    await customersApi.remove(customer.id)
    await fetchCustomers()
  } catch (err) {
    logApiError('Falha ao excluir cliente', err)
    errorMessage.value = extractApiErrorMessage(err, 'Falha ao excluir cliente.')
  }
}

const displayName = (customer: CustomerResponse) =>
  customer.person?.corporateName || customer.person?.name
</script>

<template>
  <section class="flex flex-col gap-4">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Clientes</h1>
        <p class="text-sm text-slate-500">Cadastro de clientes e dados fiscais.</p>
      </div>
      <BaseButton @click="$router.push('/customers/new')">
        <Icon name="lucide:plus" class="size-4" />
        Novo cliente
      </BaseButton>
    </header>

    <div class="card p-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="relative">
          <Icon
            name="lucide:search"
            class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
          <input
            v-model="nameFilter"
            type="text"
            placeholder="Filtrar por nome..."
            class="input-base pl-9"
          />
        </div>
        <BaseSelect
          v-model="activeFilter"
          :options="statusOptions"
          placeholder="Todos os status"
        />
        <div class="flex items-center justify-end text-xs text-slate-500">
          <span v-if="data">{{ data.totalElements }} registro(s)</span>
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3">ID</th>
              <th class="px-4 py-3">Nome / Razão Social</th>
              <th class="px-4 py-3">Documento</th>
              <th class="px-4 py-3">Limite de crédito</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr v-if="loading">
              <td colspan="6" class="px-4 py-10 text-center text-slate-500">
                <Icon name="lucide:loader-2" class="mr-2 inline size-4 animate-spin" />
                Carregando...
              </td>
            </tr>
            <tr v-else-if="!data || data.content.length === 0">
              <td colspan="6" class="px-4 py-10 text-center text-slate-400">
                Nenhum cliente encontrado.
              </td>
            </tr>
            <tr
              v-for="customer in data?.content ?? []"
              v-else
              :key="customer.id"
              class="hover:bg-slate-50"
            >
              <td class="px-4 py-3 text-slate-500">{{ customer.id }}</td>
              <td class="px-4 py-3 font-medium text-slate-800">
                {{ displayName(customer) }}
              </td>
              <td class="px-4 py-3 text-slate-600">{{ customer.person?.document || '—' }}</td>
              <td class="px-4 py-3 text-slate-600">
                {{ currencyFormatter.format(customer.creditLimit ?? 0) }}
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="customer.active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'"
                >
                  <span
                    class="size-1.5 rounded-full"
                    :class="customer.active ? 'bg-emerald-500' : 'bg-slate-400'"
                  />
                  {{ customer.active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <button
                    class="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-brand-600"
                    title="Editar"
                    @click="openEdit(customer)"
                  >
                    <Icon name="lucide:pencil" class="size-4" />
                  </button>
                  <button
                    class="rounded-md p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                    title="Excluir"
                    @click="handleDelete(customer)"
                  >
                    <Icon name="lucide:trash-2" class="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <BasePagination
        :page="page"
        :total-pages="totalPages"
        :total-elements="data?.totalElements"
        @update:page="page = $event"
      />
    </div>

    <BaseModal
      :is-open="editingOpen"
      title="Editar cliente"
      size="lg"
      @close="closeEdit"
    >
      <CustomerForm
        :initial-value="editing"
        :loading="saving"
        @submit="handleEditSubmit"
        @cancel="closeEdit"
      />
    </BaseModal>
  </section>
</template>
