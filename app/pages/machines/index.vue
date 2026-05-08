<script setup lang="ts">
import type {
  MachineResponse,
  PageResponse,
  UpdateMachineRequest,
} from '~/types'

const machinesApi = useMachines()

const page = ref(0)
const size = ref(20)
const nameFilter = ref('')
const debouncedFilter = ref('')
const activeFilter = ref<string | null>(null)

const data = ref<PageResponse<MachineResponse> | null>(null)
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const editing = ref<MachineResponse | null>(null)
const editingOpen = ref(false)
const saving = ref(false)

const statusOptions = [
  { value: 'true', label: 'Ativas' },
  { value: 'false', label: 'Inativas' },
]

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

const fetchMachines = async () => {
  loading.value = true
  errorMessage.value = null
  try {
    data.value = await machinesApi.getPage({
      page: page.value,
      size: size.value,
      name: debouncedFilter.value || undefined,
      active: activeFilter.value === null ? undefined : activeFilter.value === 'true',
    })
  } catch (err) {
    logApiError('Falha ao carregar máquinas', err)
    errorMessage.value = extractApiErrorMessage(
      err,
      'Não foi possível carregar a lista de máquinas.',
    )
  } finally {
    loading.value = false
  }
}

watch([page, size, debouncedFilter, activeFilter], fetchMachines, { immediate: true })

const totalPages = computed(() => data.value?.totalPages ?? 0)

const openEdit = (machine: MachineResponse) => {
  editing.value = machine
  editingOpen.value = true
}

const closeEdit = () => {
  editingOpen.value = false
  editing.value = null
}

const handleEditSubmit = async (payload: UpdateMachineRequest) => {
  if (!editing.value) return
  saving.value = true
  errorMessage.value = null
  try {
    await machinesApi.update(editing.value.id, payload)
    closeEdit()
    await fetchMachines()
  } catch (err) {
    logApiError('Falha ao salvar máquina', err)
    errorMessage.value = extractApiErrorMessage(err, 'Falha ao salvar máquina.')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (machine: MachineResponse) => {
  if (!confirm(`Inativar a máquina "${machine.name}"?`)) return
  try {
    await machinesApi.remove(machine.id)
    await fetchMachines()
  } catch (err) {
    logApiError('Falha ao excluir máquina', err)
    errorMessage.value = extractApiErrorMessage(err, 'Falha ao excluir máquina.')
  }
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Máquinas</h1>
        <p class="text-sm text-slate-500">
          Equipamentos disponíveis para produção (offset, digital, acabamento).
        </p>
      </div>
      <BaseButton @click="$router.push('/machines/new')">
        <Icon name="lucide:plus" class="size-4" />
        Nova máquina
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
              <th class="px-4 py-3">Nome</th>
              <th class="px-4 py-3">Fabricante</th>
              <th class="px-4 py-3">Modelo</th>
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
                Nenhuma máquina encontrada.
              </td>
            </tr>
            <tr
              v-for="machine in data?.content ?? []"
              v-else
              :key="machine.id"
              class="hover:bg-slate-50"
            >
              <td class="px-4 py-3 text-slate-500">{{ machine.id }}</td>
              <td class="px-4 py-3 font-medium text-slate-800">{{ machine.name }}</td>
              <td class="px-4 py-3 text-slate-600">{{ machine.manufacturer || '—' }}</td>
              <td class="px-4 py-3 text-slate-600">{{ machine.model || '—' }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="machine.active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'"
                >
                  <span
                    class="size-1.5 rounded-full"
                    :class="machine.active ? 'bg-emerald-500' : 'bg-slate-400'"
                  />
                  {{ machine.active ? 'Ativa' : 'Inativa' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <button
                    class="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-brand-600"
                    title="Editar"
                    @click="openEdit(machine)"
                  >
                    <Icon name="lucide:pencil" class="size-4" />
                  </button>
                  <button
                    class="rounded-md p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                    title="Inativar"
                    @click="handleDelete(machine)"
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
      title="Editar máquina"
      size="xl"
      @close="closeEdit"
    >
      <MachineForm
        :initial-value="editing"
        :loading="saving"
        @submit="handleEditSubmit"
        @cancel="closeEdit"
      />
    </BaseModal>
  </section>
</template>
