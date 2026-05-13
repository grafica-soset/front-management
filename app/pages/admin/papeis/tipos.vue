<script setup lang="ts">
/**
 * Gestão de tipos de papel (CRUD).
 *
 * Aberto para ADMIN e CUSTOMER. O DELETE é restrito a ADMIN no backend;
 * mantemos o botão visível apenas para essa role.
 */
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import Modal from '@/components/ui/Modal.vue'
import PaperTypeForm from '@/components/forms/PaperTypeForm.vue'
import { usePaperTypes } from '@/composables/usePaperTypes'
import { usePapersStore } from '@/stores/papers'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { extractApiError } from '@/utils/apiError'
import type { PaperType } from '@/types/PaperType'

definePageMeta({
  middleware: 'auth',
})

const auth = useAuthStore()
const store = usePapersStore()
const { paperTypes } = storeToRefs(store)
const { listPaperTypes, createPaperType, updatePaperType, deletePaperType } = usePaperTypes()
const toast = useToast()

const loadingList = ref(false)
const loadingForm = ref(false)
const listError = ref<string | null>(null)
const formError = ref<string | null>(null)

const isModalOpen = ref(false)
const editingType = ref<PaperType | null>(null)

const canDelete = computed(() => auth.isAdmin)

const refresh = async () => {
  loadingList.value = true
  listError.value = null
  try {
    await listPaperTypes()
  } catch (err) {
    listError.value = extractApiError(err, 'Falha ao carregar tipos de papel.')
  } finally {
    loadingList.value = false
  }
}

onMounted(refresh)

const openCreate = () => {
  editingType.value = null
  formError.value = null
  isModalOpen.value = true
}

const openEdit = (type: PaperType) => {
  editingType.value = type
  formError.value = null
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  editingType.value = null
}

const handleSubmit = async (payload: { name: string; description: string | null; active?: boolean }) => {
  loadingForm.value = true
  formError.value = null
  try {
    if (editingType.value) {
      await updatePaperType(editingType.value.id, {
        name: payload.name,
        description: payload.description,
        active: payload.active ?? editingType.value.active,
      })
      toast.success('Tipo de papel atualizado.')
    } else {
      await createPaperType({ name: payload.name, description: payload.description })
      toast.success('Tipo de papel cadastrado.')
    }
    closeModal()
  } catch (err) {
    formError.value = extractApiError(err, 'Não foi possível salvar.')
  } finally {
    loadingForm.value = false
  }
}

const handleDelete = async (type: PaperType) => {
  if (!confirm(`Remover o tipo "${type.name}"? Esta ação não pode ser desfeita.`)) return
  try {
    await deletePaperType(type.id)
    toast.success('Tipo removido.')
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível remover.'))
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Tipos de papel</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Biblioteca global de categorias (Sulfite, Couché, Cartão, etc.).
        </p>
      </div>
      <button
        type="button"
        @click="openCreate"
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Novo tipo
      </button>
    </header>

    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
      <div v-if="loadingList" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando...</div>
      <div v-else-if="listError" class="p-6 text-sm text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300">
        {{ listError }}
      </div>
      <div v-else-if="paperTypes.length === 0" class="p-8 text-sm text-center text-slate-500 dark:text-slate-400">
        Nenhum tipo cadastrado. Clique em "Novo tipo" para começar.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead class="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50 dark:text-slate-300">
            <tr>
              <th class="px-5 py-3 font-semibold">Nome</th>
              <th class="px-5 py-3 font-semibold">Descrição</th>
              <th class="px-5 py-3 font-semibold">Status</th>
              <th class="px-5 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
            <tr v-for="type in paperTypes" :key="type.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
              <td class="px-5 py-4 font-medium text-slate-900 dark:text-white">{{ type.name }}</td>
              <td class="px-5 py-4 text-slate-600 dark:text-slate-300">{{ type.description || '—' }}</td>
              <td class="px-5 py-4">
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  :class="type.active
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'"
                >
                  {{ type.active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="px-5 py-4 text-right space-x-2">
                <button
                  type="button"
                  @click="openEdit(type)"
                  class="px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded-md dark:text-indigo-300 dark:hover:bg-slate-700"
                >
                  Editar
                </button>
                <button
                  v-if="canDelete"
                  type="button"
                  @click="handleDelete(type)"
                  class="px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md dark:text-rose-300 dark:hover:bg-slate-700"
                >
                  Remover
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal
      :is-open="isModalOpen"
      :title="editingType ? 'Editar tipo de papel' : 'Novo tipo de papel'"
      @close="closeModal"
    >
      <PaperTypeForm
        :initial="editingType"
        :loading="loadingForm"
        :server-error="formError"
        @submit="handleSubmit"
        @cancel="closeModal"
      />
    </Modal>
  </div>
</template>
