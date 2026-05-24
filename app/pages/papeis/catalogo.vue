<script setup lang="ts">
/**
 * Catálogo global de papéis.
 *
 * - Filtros: tipo de papel + busca textual (nome/código).
 * - CUSTOMER vê toggle de ativação por linha (PUT /customers/{id}/papers/{paperId}).
 * - Botões "Novo papel" / "Editar" para ADMIN e CUSTOMER (POST/PUT /papers).
 * - Modal interno alterna entre PaperForm e PaperTypeForm — quando o usuário
 *   pede um tipo novo durante o cadastro do papel, abrimos um modal sobre o
 *   modal e retornamos para o form com o tipo pré-selecionado.
 */
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import Modal from '@/components/ui/Modal.vue'
import PaperForm from '@/components/forms/PaperForm.vue'
import PaperTypeForm from '@/components/forms/PaperTypeForm.vue'
import { usePapers } from '@/composables/usePapers'
import { usePaperTypes } from '@/composables/usePaperTypes'
import { useCustomerPapers } from '@/composables/useCustomerPapers'
import { useUnitConverter } from '@/composables/useUnitConverter'
import { useToast } from '@/composables/useToast'
import { usePapersStore } from '@/stores/papers'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import { grainDirectionLabel } from '@/utils/grainDirection'
import type { CreatePaperRequest, Paper, UpdatePaperRequest } from '@/types/Paper'
import type { PaperType } from '@/types/PaperType'

definePageMeta({
  middleware: 'auth',
})

const auth = useAuthStore()
const store = usePapersStore()
const { papers, paperTypes, activePaperIds } = storeToRefs(store)

const { listPapers, createPaper, updatePaper } = usePapers()
const { listPaperTypes, createPaperType } = usePaperTypes()
const { listCustomerPapers, toggleCustomerPaper } = useCustomerPapers()
const { format } = useUnitConverter()
const toast = useToast()

const canManagePapers = computed(() => auth.isAdmin || auth.hasCustomer)
const canToggle = computed(() => auth.hasCustomer && !!auth.activeCompanyId)

const loadingList = ref(false)
const listError = ref<string | null>(null)

const search = ref('')
const filterPaperTypeId = ref<number | 0>(0)

/** Toggle: paperIds atualmente em atualização para desabilitar o switch. */
const togglingIds = ref<Set<number>>(new Set())

// ---------- Modais ----------
const isPaperModalOpen = ref(false)
const isPaperTypeModalOpen = ref(false)
const editingPaper = ref<Paper | null>(null)
const duplicatingPaper = ref<Paper | null>(null)
const newPaperTypeId = ref<number | null>(null)
const paperFormLoading = ref(false)
const paperFormError = ref<string | null>(null)
const paperTypeFormLoading = ref(false)
const paperTypeFormError = ref<string | null>(null)

const refresh = async () => {
  loadingList.value = true
  listError.value = null
  try {
    const tasks: Promise<unknown>[] = [
      listPapers(filterPaperTypeId.value ? { paperTypeId: filterPaperTypeId.value } : {}),
      listPaperTypes(),
    ]
    if (canToggle.value) tasks.push(listCustomerPapers({ onlyActive: false }))
    await Promise.all(tasks)
  } catch (err) {
    listError.value = extractApiError(err, 'Falha ao carregar o catálogo.')
  } finally {
    loadingList.value = false
  }
}

/**
 * Deep-link: `/papeis/catalogo?duplicate=<paperId>` abre direto o modal de
 * duplicação para o papel solicitado. Usado pela tela "Meus papéis" para
 * iniciar uma duplicação sem replicar o modal em outra página.
 */
const route = useRoute()
const router = useRouter()

const handleDuplicateQuery = () => {
  const raw = route.query.duplicate
  if (!raw) return
  const id = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(id) || id <= 0) return
  const paper = store.paperById(id)
  if (paper) openDuplicatePaper(paper)
  router.replace({ query: { ...route.query, duplicate: undefined } })
}

onMounted(async () => {
  await refresh()
  handleDuplicateQuery()
})

const filteredPapers = computed<Paper[]>(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return papers.value
  return papers.value.filter((p) =>
    p.longName.toLowerCase().includes(term)
    || p.code.toLowerCase().includes(term),
  )
})

const applyTypeFilter = () => {
  // Re-busca com filtro server-side (paperTypeId).
  refresh()
}

// ---------- Toggle ativação ----------
const isActive = (paperId: number) => activePaperIds.value.has(paperId)

const handleToggle = async (paper: Paper) => {
  if (!canToggle.value) return
  const next = !isActive(paper.id)
  togglingIds.value = new Set([...togglingIds.value, paper.id])
  try {
    await toggleCustomerPaper(paper.id, next)
    toast.success(next ? `Papel "${paper.longName}" ativado para a empresa.` : `Papel "${paper.longName}" desativado.`)
  } catch (err) {
    toast.error(extractApiError(err, 'Falha ao alternar o papel.'))
  } finally {
    const copy = new Set(togglingIds.value)
    copy.delete(paper.id)
    togglingIds.value = copy
  }
}

// ---------- CRUD de papel ----------
const openCreatePaper = () => {
  editingPaper.value = null
  duplicatingPaper.value = null
  paperFormError.value = null
  newPaperTypeId.value = null
  isPaperModalOpen.value = true
}

const openEditPaper = (paper: Paper) => {
  editingPaper.value = paper
  duplicatingPaper.value = null
  paperFormError.value = null
  newPaperTypeId.value = null
  isPaperModalOpen.value = true
}

const openDuplicatePaper = (paper: Paper) => {
  editingPaper.value = null
  duplicatingPaper.value = paper
  paperFormError.value = null
  newPaperTypeId.value = null
  isPaperModalOpen.value = true
}

const closePaperModal = () => {
  isPaperModalOpen.value = false
  editingPaper.value = null
  duplicatingPaper.value = null
}

const handlePaperSubmit = async (
  payload: CreatePaperRequest | UpdatePaperRequest,
  mode: 'create' | 'update',
) => {
  paperFormLoading.value = true
  paperFormError.value = null
  try {
    if (mode === 'update' && editingPaper.value) {
      await updatePaper(editingPaper.value.id, payload as UpdatePaperRequest)
      toast.success('Papel atualizado.')
    } else {
      const response = await createPaper(payload as CreatePaperRequest)
      toast.success(
        response.customerPaper
          ? 'Papel cadastrado e ativado para a empresa.'
          : 'Papel cadastrado.',
      )
    }
    closePaperModal()
  } catch (err) {
    paperFormError.value = extractApiError(err, 'Não foi possível salvar o papel.')
  } finally {
    paperFormLoading.value = false
  }
}

// ---------- "Novo tipo" inline ----------
const requestNewPaperType = () => {
  paperTypeFormError.value = null
  isPaperTypeModalOpen.value = true
}

const closePaperTypeModal = () => {
  isPaperTypeModalOpen.value = false
}

const handlePaperTypeSubmit = async (payload: {
  name: string
  description: string | null
  weightPerM2Grams: number
  thicknessMicrometers: number
  bothSidesEqual: boolean
}) => {
  paperTypeFormLoading.value = true
  paperTypeFormError.value = null
  try {
    const created = await createPaperType({
      name: payload.name,
      description: payload.description,
      weightPerM2Grams: payload.weightPerM2Grams,
      thicknessMicrometers: payload.thicknessMicrometers,
      bothSidesEqual: payload.bothSidesEqual,
    })
    newPaperTypeId.value = created.id
    toast.success('Agrupamento de medidas cadastrado e selecionado no formulário.')
    closePaperTypeModal()
  } catch (err) {
    paperTypeFormError.value = extractApiError(err, 'Não foi possível salvar o tipo.')
  } finally {
    paperTypeFormLoading.value = false
  }
}

const findPaperType = (id: number): PaperType | null => store.paperTypeById(id)
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Catálogo de papéis</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Biblioteca global do sistema. Dimensões exibidas na unidade da empresa ativa.
        </p>
      </div>
      <button
        v-if="canManagePapers"
        type="button"
        @click="openCreatePaper"
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Novo papel
      </button>
    </header>

    <!-- Filtros -->
    <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 dark:bg-slate-800 dark:border-slate-700">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="md:col-span-2">
          <label class="block mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Buscar</label>
          <input
            v-model="search"
            type="search"
            placeholder="Nome ou código..."
            class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          />
        </div>
        <div>
          <label class="block mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tipo</label>
          <select
            v-model.number="filterPaperTypeId"
            @change="applyTypeFilter"
            class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          >
            <option :value="0">Todos os tipos</option>
            <option v-for="type in paperTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Tabela -->
    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
      <div v-if="loadingList" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando catálogo...</div>
      <div v-else-if="listError" class="p-6 text-sm text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300">
        {{ listError }}
      </div>
      <div v-else-if="filteredPapers.length === 0" class="p-8 text-sm text-center text-slate-500 dark:text-slate-400">
        Nenhum papel encontrado com os filtros atuais.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead class="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50 dark:text-slate-300">
            <tr>
              <th class="px-5 py-3 font-semibold">Código</th>
              <th class="px-5 py-3 font-semibold">Nome</th>
              <th class="px-5 py-3 font-semibold">Tipo</th>
              <th class="px-5 py-3 font-semibold">Dimensões</th>
              <th class="px-5 py-3 font-semibold">Fibra</th>
              <th class="px-5 py-3 font-semibold">Gramatura</th>
              <th class="px-5 py-3 font-semibold">R$/folha</th>
              <th v-if="canToggle" class="px-5 py-3 font-semibold text-center">Ativo p/ empresa</th>
              <th v-if="canManagePapers" class="px-5 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
            <tr v-for="paper in filteredPapers" :key="paper.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
              <td class="px-5 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{{ paper.code }}</td>
              <td class="px-5 py-3">
                <div class="font-medium text-slate-900 dark:text-white">{{ paper.longName }}</div>
              </td>
              <td class="px-5 py-3 text-slate-700 dark:text-slate-200">
                {{ findPaperType(paper.paperType.id)?.name ?? paper.paperType.name }}
              </td>
              <td class="px-5 py-3 whitespace-nowrap">
                {{ format(paper.width.millimeters) }} × {{ format(paper.height.millimeters) }}
              </td>
              <td class="px-5 py-3 whitespace-nowrap">{{ grainDirectionLabel(paper.grainDirection) }}</td>
              <td class="px-5 py-3 whitespace-nowrap">{{ paper.paperType.weightPerM2Grams }} g/m²</td>
              <td class="px-5 py-3 whitespace-nowrap">{{ paper.pricePerSheet != null ? `R$ ${paper.pricePerSheet.toFixed(4)}` : '—' }}</td>
              <td v-if="canToggle" class="px-5 py-3 text-center">
                <button
                  type="button"
                  role="switch"
                  :aria-checked="isActive(paper.id)"
                  :disabled="togglingIds.has(paper.id)"
                  @click="handleToggle(paper)"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                  :class="isActive(paper.id) ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'"
                >
                  <span
                    class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                    :class="isActive(paper.id) ? 'translate-x-5' : 'translate-x-0.5'"
                  />
                </button>
              </td>
              <td v-if="canManagePapers" class="px-5 py-3 text-right">
                <div class="inline-flex items-center gap-1">
                  <button
                    type="button"
                    @click="openDuplicatePaper(paper)"
                    title="Duplicar este papel"
                    class="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    @click="openEditPaper(paper)"
                    class="px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded-md dark:text-indigo-300 dark:hover:bg-slate-700"
                  >
                    Editar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: criar/editar/duplicar papel -->
    <Modal
      :is-open="isPaperModalOpen"
      :title="editingPaper ? 'Editar papel' : duplicatingPaper ? 'Duplicar papel' : 'Novo papel'"
      @close="closePaperModal"
    >
      <PaperForm
        :initial="editingPaper"
        :duplicate-from="duplicatingPaper"
        :paper-types="paperTypes"
        :preselect-paper-type-id="newPaperTypeId"
        :loading="paperFormLoading"
        :server-error="paperFormError"
        @submit="handlePaperSubmit"
        @cancel="closePaperModal"
        @request-new-paper-type="requestNewPaperType"
      />
    </Modal>

    <!-- Modal: novo tipo inline (sobre o modal de papel) -->
    <Modal
      :is-open="isPaperTypeModalOpen"
      title="Novo agrupamento de medidas"
      @close="closePaperTypeModal"
    >
      <PaperTypeForm
        :loading="paperTypeFormLoading"
        :server-error="paperTypeFormError"
        @submit="handlePaperTypeSubmit"
        @cancel="closePaperTypeModal"
      />
    </Modal>
  </div>
</template>
