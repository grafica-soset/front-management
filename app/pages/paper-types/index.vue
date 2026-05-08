<script setup lang="ts">
import type {
  PageResponse,
  PaperTypeResponse,
  UpdatePaperTypeRequest,
} from '~/types'

const paperTypesApi = usePaperTypes()

const page = ref(0)
const size = ref(20)
const nameFilter = ref('')
const debouncedFilter = ref('')

const data = ref<PageResponse<PaperTypeResponse> | null>(null)
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const editing = ref<PaperTypeResponse | null>(null)
const editingOpen = ref(false)
const saving = ref(false)

let filterTimer: ReturnType<typeof setTimeout> | null = null
watch(nameFilter, (value) => {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    debouncedFilter.value = value.trim()
    page.value = 0
  }, 350)
})

const fetchPaperTypes = async () => {
  loading.value = true
  errorMessage.value = null
  try {
    data.value = await paperTypesApi.getPage({
      page: page.value,
      size: size.value,
      name: debouncedFilter.value || undefined,
    })
  } catch (err) {
    logApiError('Falha ao carregar tipos de papel', err)
    errorMessage.value = extractApiErrorMessage(
      err,
      'Não foi possível carregar a lista de tipos de papel.',
    )
  } finally {
    loading.value = false
  }
}

watch([page, size, debouncedFilter], fetchPaperTypes, { immediate: true })

const totalPages = computed(() => data.value?.totalPages ?? 0)

const openEdit = (paperType: PaperTypeResponse) => {
  editing.value = paperType
  editingOpen.value = true
}

const closeEdit = () => {
  editingOpen.value = false
  editing.value = null
}

const handleEditSubmit = async (payload: UpdatePaperTypeRequest) => {
  if (!editing.value) return
  saving.value = true
  errorMessage.value = null
  try {
    await paperTypesApi.update(editing.value.id, payload)
    closeEdit()
    await fetchPaperTypes()
  } catch (err) {
    logApiError('Falha ao salvar tipo de papel', err)
    errorMessage.value = extractApiErrorMessage(err, 'Falha ao salvar tipo de papel.')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (paperType: PaperTypeResponse) => {
  if (!confirm(`Excluir o tipo "${paperType.name}"?`)) return
  try {
    await paperTypesApi.remove(paperType.id)
    await fetchPaperTypes()
  } catch (err) {
    logApiError('Falha ao excluir tipo de papel', err)
    errorMessage.value = extractApiErrorMessage(err, 'Falha ao excluir tipo de papel.')
  }
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Tipos de papel</h1>
        <p class="text-sm text-slate-500">
          Catálogo de tipos usados na composição dos SKUs de papel.
        </p>
      </div>
      <BaseButton @click="$router.push('/paper-types/new')">
        <Icon name="lucide:plus" class="size-4" />
        Novo tipo
      </BaseButton>
    </header>

    <div class="card p-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="relative sm:col-span-2">
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
              <th class="px-4 py-3">Descrição</th>
              <th class="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr v-if="loading">
              <td colspan="4" class="px-4 py-10 text-center text-slate-500">
                <Icon name="lucide:loader-2" class="mr-2 inline size-4 animate-spin" />
                Carregando...
              </td>
            </tr>
            <tr v-else-if="!data || data.content.length === 0">
              <td colspan="4" class="px-4 py-10 text-center text-slate-400">
                Nenhum tipo de papel encontrado.
              </td>
            </tr>
            <tr
              v-for="paperType in data?.content ?? []"
              v-else
              :key="paperType.id"
              class="hover:bg-slate-50"
            >
              <td class="px-4 py-3 text-slate-500">{{ paperType.id }}</td>
              <td class="px-4 py-3 font-medium text-slate-800">{{ paperType.name }}</td>
              <td class="max-w-xl truncate px-4 py-3 text-slate-600">
                {{ paperType.description || '—' }}
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <button
                    class="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-brand-600"
                    title="Editar"
                    @click="openEdit(paperType)"
                  >
                    <Icon name="lucide:pencil" class="size-4" />
                  </button>
                  <button
                    class="rounded-md p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                    title="Excluir"
                    @click="handleDelete(paperType)"
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
      title="Editar tipo de papel"
      size="md"
      @close="closeEdit"
    >
      <PaperTypeForm
        :initial-value="editing"
        :loading="saving"
        @submit="handleEditSubmit"
        @cancel="closeEdit"
      />
    </BaseModal>
  </section>
</template>
