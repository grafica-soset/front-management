<script setup lang="ts">
import type {
  CreatePaperRequest,
  PaperResponse,
  UpdatePaperRequest,
} from '~/types/paper'
import type { KeyValueDto, PageResponse } from '~/types/shared'

const papersApi = usePapers()
const paperTypesApi = usePaperTypes()

const page = ref(0)
const size = ref(20)
const nameFilter = ref('')
const debouncedFilter = ref('')
const typeFilter = ref<number | null>(null)

const data = ref<PageResponse<PaperResponse> | null>(null)
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const types = ref<KeyValueDto[]>([])

const showForm = ref(false)
const editing = ref<PaperResponse | null>(null)
const saving = ref(false)

const typeSelectOptions = computed(() =>
  types.value.map((type) => ({ value: type.id, label: type.value })),
)

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

watch(typeFilter, () => {
  page.value = 0
})

const fetchPapers = async () => {
  loading.value = true
  errorMessage.value = null
  try {
    data.value = await papersApi.list({
      page: page.value,
      size: size.value,
      name: debouncedFilter.value || undefined,
      typeId: typeFilter.value ?? undefined,
    })
  } catch (err) {
    errorMessage.value = 'Não foi possível carregar a lista de papéis.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const fetchTypes = async () => {
  try {
    types.value = await paperTypesApi.list()
  } catch (err) {
    // Endpoint pode ainda não existir no backend; apenas registra e segue.
    console.warn('Falha ao carregar tipos de papel:', err)
  }
}

watch([page, size, debouncedFilter, typeFilter], fetchPapers, { immediate: true })
onMounted(fetchTypes)

const totalPages = computed(() => data.value?.totalPages ?? 0)

const goToPage = (target: number) => {
  if (target < 0 || target >= totalPages.value) return
  page.value = target
}

const openCreate = () => {
  editing.value = null
  showForm.value = true
}

const openEdit = (paper: PaperResponse) => {
  editing.value = paper
  showForm.value = true
}

const closeForm = () => {
  showForm.value = false
  editing.value = null
}

const handleSubmit = async (payload: CreatePaperRequest | UpdatePaperRequest) => {
  saving.value = true
  errorMessage.value = null
  try {
    if (editing.value?.id) {
      await papersApi.update(editing.value.id, payload as UpdatePaperRequest)
    } else {
      await papersApi.create(payload as CreatePaperRequest)
    }
    closeForm()
    await fetchPapers()
  } catch (err) {
    errorMessage.value = 'Falha ao salvar papel.'
    console.error(err)
  } finally {
    saving.value = false
  }
}

const handleDelete = async (paper: PaperResponse) => {
  if (!confirm(`Excluir o papel "${paper.sku?.name}"?`)) return
  try {
    await papersApi.remove(paper.id)
    await fetchPapers()
  } catch (err) {
    errorMessage.value = 'Falha ao excluir papel.'
    console.error(err)
  }
}

const formatPrice = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : currencyFormatter.format(value)
</script>

<template>
  <section class="flex flex-col gap-4">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Papéis / Insumos</h1>
        <p class="text-sm text-slate-500">Catálogo de papéis utilizados na produção.</p>
      </div>
      <BaseButton @click="openCreate">
        <Icon name="lucide:plus" class="size-4" />
        Novo papel
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
          v-model="typeFilter"
          :options="typeSelectOptions"
          placeholder="Todos os tipos"
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
              <th class="px-4 py-3">SKU</th>
              <th class="px-4 py-3">Tipo</th>
              <th class="px-4 py-3">Formato (mm)</th>
              <th class="px-4 py-3">Gramatura</th>
              <th class="px-4 py-3">Preço/kg</th>
              <th class="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr v-if="loading">
              <td colspan="7" class="px-4 py-10 text-center text-slate-500">
                <Icon name="lucide:loader-2" class="mr-2 inline size-4 animate-spin" />
                Carregando...
              </td>
            </tr>
            <tr v-else-if="!data || data.content.length === 0">
              <td colspan="7" class="px-4 py-10 text-center text-slate-400">
                Nenhum papel encontrado.
              </td>
            </tr>
            <tr v-for="paper in data?.content ?? []" v-else :key="paper.id" class="hover:bg-slate-50">
              <td class="px-4 py-3 text-slate-500">{{ paper.id }}</td>
              <td class="px-4 py-3 font-medium text-slate-800">{{ paper.sku?.name }}</td>
              <td class="px-4 py-3 text-slate-600">{{ paper.type?.name }}</td>
              <td class="px-4 py-3 text-slate-600">
                {{ paper.formatWidth }} × {{ paper.formatHeight }}
              </td>
              <td class="px-4 py-3 text-slate-600">{{ paper.grammageG }} g/m²</td>
              <td class="px-4 py-3 text-slate-600">{{ formatPrice(paper.pricePerKg) }}</td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <button
                    class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                    title="Editar"
                    @click="openEdit(paper)"
                  >
                    <Icon name="lucide:pencil" class="size-4" />
                  </button>
                  <button
                    class="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    title="Excluir"
                    @click="handleDelete(paper)"
                  >
                    <Icon name="lucide:trash-2" class="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="data && totalPages > 1"
        class="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm"
      >
        <div class="text-slate-500">Página {{ page + 1 }} de {{ totalPages }}</div>
        <div class="flex items-center gap-1">
          <button class="btn-secondary" :disabled="page === 0" @click="goToPage(page - 1)">
            <Icon name="lucide:chevron-left" class="size-4" />
            Anterior
          </button>
          <button class="btn-secondary" :disabled="page + 1 >= totalPages" @click="goToPage(page + 1)">
            Próximo
            <Icon name="lucide:chevron-right" class="size-4" />
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      @click.self="closeForm"
    >
      <div class="card max-h-[90vh] w-full max-w-4xl overflow-y-auto">
        <div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <h2 class="text-base font-semibold text-slate-800">
            {{ editing ? 'Editar papel' : 'Novo papel' }}
          </h2>
          <button
            class="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            @click="closeForm"
          >
            <Icon name="lucide:x" class="size-4" />
          </button>
        </div>
        <div class="p-5">
          <PaperForm
            :initial-value="editing"
            :loading="saving"
            :type-options="types"
            @submit="handleSubmit"
            @cancel="closeForm"
          />
        </div>
      </div>
    </div>
  </section>
</template>
