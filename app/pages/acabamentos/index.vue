<script setup lang="ts">
/**
 * Cadastro de Acabamentos (atividade 029). Lista as tarefas de acabamento da empresa (filtradas
 * pelo tipo vindo do menu via ?type=) e permite cadastrar/editar (modal) e excluir.
 */
import { computed, ref, watch } from 'vue'
import { useFinishingTasks } from '@/composables/useFinishingTasks'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import { FINISHING_TASK_TYPES, FINISHING_TASK_TYPE_LABELS } from '@/utils/finishingTaskCatalog'
import type {
  CreateFinishingTaskRequest,
  FinishingTask,
  FinishingTaskKeyValue,
  FinishingTaskType,
  UpdateFinishingTaskRequest,
} from '@/types/FinishingTask'
import Modal from '@/components/ui/Modal.vue'
import FinishingTaskForm from '@/components/forms/FinishingTaskForm.vue'

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const toast = useToast()
const route = useRoute()
const { listKeyValues, getById, create, update, remove } = useFinishingTasks()

const activeType = computed<FinishingTaskType | undefined>(() => {
  const t = route.query.type
  return typeof t === 'string' && (FINISHING_TASK_TYPES as string[]).includes(t)
    ? (t as FinishingTaskType)
    : undefined
})
const heading = computed(() =>
  activeType.value ? FINISHING_TASK_TYPE_LABELS[activeType.value] : 'Acabamentos',
)

const items = ref<FinishingTaskKeyValue[]>([])
const loading = ref(false)
const listError = ref<string | null>(null)
const deletingId = ref<number | null>(null)

const modalOpen = ref(false)
// Dados iniciais do form: o acabamento em edição ou a origem da duplicação. Quem manda no que o
// submit faz é o modalMode — duplicar tem dados iniciais mas CRIA.
const editing = ref<FinishingTask | null>(null)
const modalMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)
const saving = ref(false)
const saveError = ref<string | null>(null)

const hasCompany = computed(() => !!auth.activeCompanyId)
const modalTitle = computed(() => {
  if (modalMode.value === 'edit') return 'Editar acabamento'
  return editing.value ? 'Duplicar acabamento' : 'Novo acabamento'
})

const refresh = async () => {
  if (!hasCompany.value) return
  loading.value = true
  listError.value = null
  try {
    items.value = await listKeyValues({ type: activeType.value, onlyActive: false })
  } catch (err) {
    listError.value = extractApiError(err, 'Falha ao carregar os acabamentos.')
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
watch(activeType, refresh)

const openCreate = () => {
  modalMode.value = 'create'
  editing.value = null
  editingId.value = null
  saveError.value = null
  modalOpen.value = true
}

const openEdit = async (item: FinishingTaskKeyValue) => {
  saveError.value = null
  try {
    editing.value = await getById(item.id)
    editingId.value = item.id
    modalMode.value = 'edit'
    modalOpen.value = true
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível abrir o acabamento.'))
  }
}

// Duplicar: abre o form em modo de CRIAÇÃO já preenchido com o acabamento de origem (config do tipo
// e posições de intercalação incluídas). O nome ganha sufixo porque é único por empresa.
const openDuplicate = async (item: FinishingTaskKeyValue) => {
  saveError.value = null
  try {
    const source = await getById(item.id)
    editing.value = { ...source, name: `${source.name} (cópia)` }
    editingId.value = null
    modalMode.value = 'create'
    modalOpen.value = true
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível duplicar o acabamento.'))
  }
}

const closeModal = () => { modalOpen.value = false; editing.value = null; editingId.value = null }

const handleSubmit = async (payload: CreateFinishingTaskRequest | UpdateFinishingTaskRequest) => {
  saving.value = true
  saveError.value = null
  try {
    if (modalMode.value === 'edit' && editingId.value) {
      await update(editingId.value, payload as UpdateFinishingTaskRequest)
      toast.success('Acabamento atualizado.')
    } else {
      await create(payload as CreateFinishingTaskRequest)
      toast.success('Acabamento cadastrado.')
    }
    closeModal()
    await refresh()
  } catch (err) {
    saveError.value = extractApiError(err, 'Falha ao salvar o acabamento.')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (item: FinishingTaskKeyValue) => {
  if (!window.confirm(`Remover o acabamento "${item.value}"?`)) return
  deletingId.value = item.id
  try {
    await remove(item.id)
    toast.success(`Acabamento "${item.value}" removido.`)
    await refresh()
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível remover o acabamento.'))
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{{ heading }}</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Tarefas de acabamento parametrizáveis usadas pelas atividades.</p>
      </div>
      <button
        v-if="hasCompany"
        type="button"
        @click="openCreate"
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Novo acabamento
      </button>
    </header>

    <div v-if="!hasCompany" class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200">
      Selecione uma empresa para gerenciar os acabamentos.
    </div>

    <div v-else class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
      <div v-if="loading" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando acabamentos...</div>
      <div v-else-if="listError" class="p-6 text-sm text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300">{{ listError }}</div>
      <div v-else-if="items.length === 0" class="p-8 text-sm text-center text-slate-500 dark:text-slate-400">Nenhum acabamento cadastrado.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead class="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50 dark:text-slate-300">
            <tr>
              <th class="px-5 py-3 font-semibold">Nome</th>
              <th class="px-5 py-3 font-semibold">Tipo</th>
              <th class="px-5 py-3 font-semibold text-center">Status</th>
              <th class="px-5 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
            <tr v-for="item in items" :key="item.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
              <td class="px-5 py-3 font-medium text-slate-900 dark:text-white">{{ item.value }}</td>
              <td class="px-5 py-3">{{ FINISHING_TASK_TYPE_LABELS[item.type] }}</td>
              <td class="px-5 py-3 text-center">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="item.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'">
                  {{ item.active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="px-5 py-3 text-right">
                <div class="inline-flex items-center gap-1">
                  <button type="button" @click="openEdit(item)" class="px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded-md dark:text-indigo-300 dark:hover:bg-slate-700">Editar</button>
                  <button type="button" @click="openDuplicate(item)" class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md dark:text-slate-300 dark:hover:bg-slate-700">Duplicar</button>
                  <button type="button" :disabled="deletingId === item.id" @click="handleDelete(item)" class="px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md disabled:opacity-50 dark:text-rose-300 dark:hover:bg-slate-700">Excluir</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal :is-open="modalOpen" :title="modalTitle" @close="closeModal">
      <FinishingTaskForm
        :initial="editing"
        :mode="modalMode"
        :preset-type="activeType"
        :loading="saving"
        :server-error="saveError"
        @submit="handleSubmit"
        @cancel="closeModal"
      />
    </Modal>
  </div>
</template>
