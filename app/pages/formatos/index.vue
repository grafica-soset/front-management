<script setup lang="ts">
/**
 * Lista de Formatos (dimensões-padrão de mercado).
 *
 * Cada item é um formato global (ex.: 66×96 cm) com suas conversões de corte
 * (subformatos). Criação e edição usam um modal com o FormatForm.
 */
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import Modal from '@/components/ui/Modal.vue'
import FormatForm from '@/components/forms/FormatForm.vue'
import { useFormats } from '@/composables/useFormats'
import { useFormatsStore } from '@/stores/formats'
import { useUnitConverter } from '@/composables/useUnitConverter'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { extractApiError } from '@/utils/apiError'
import type { CreateFormatRequest, Format, UpdateFormatRequest } from '@/types/Format'

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const store = useFormatsStore()
const { formats } = storeToRefs(store)
const { listFormats, createFormat, updateFormat, deleteFormat } = useFormats()
const { format: formatMeasure } = useUnitConverter()
const toast = useToast()

const canManage = computed(() => auth.isAdmin || auth.hasCustomer)
const canDelete = computed(() => auth.isAdmin)

const loading = ref(false)
const listError = ref<string | null>(null)
const search = ref('')

const filtered = computed<Format[]>(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return formats.value
  return formats.value.filter((f) => f.name.toLowerCase().includes(term))
})

const refresh = async () => {
  loading.value = true
  listError.value = null
  try {
    await listFormats()
  } catch (err) {
    listError.value = extractApiError(err, 'Falha ao carregar os formatos.')
  } finally {
    loading.value = false
  }
}

onMounted(refresh)

// ---------- Modal ----------
const isModalOpen = ref(false)
const editingFormat = ref<Format | null>(null)
const formLoading = ref(false)
const formError = ref<string | null>(null)

const openCreate = () => {
  editingFormat.value = null
  formError.value = null
  isModalOpen.value = true
}
const openEdit = (format: Format) => {
  editingFormat.value = format
  formError.value = null
  isModalOpen.value = true
}
const closeModal = () => {
  isModalOpen.value = false
  editingFormat.value = null
}

const handleSubmit = async (
  payload: CreateFormatRequest | UpdateFormatRequest,
  mode: 'create' | 'update',
) => {
  formLoading.value = true
  formError.value = null
  try {
    if (mode === 'update' && editingFormat.value) {
      await updateFormat(editingFormat.value.id, payload as UpdateFormatRequest)
      toast.success('Formato atualizado.')
    } else {
      await createFormat(payload as CreateFormatRequest)
      toast.success('Formato cadastrado.')
    }
    closeModal()
    await refresh()
  } catch (err) {
    formError.value = extractApiError(err, 'Não foi possível salvar o formato.')
  } finally {
    formLoading.value = false
  }
}

const handleDelete = async (format: Format) => {
  if (!window.confirm(`Remover o formato "${format.name}" e todas as suas conversões? Esta ação não pode ser desfeita.`)) return
  try {
    await deleteFormat(format.id)
    toast.success('Formato removido.')
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível remover o formato.'))
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Formatos</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Dimensões-padrão de mercado (largura × comprimento) e suas conversões de corte.
        </p>
      </div>
      <button
        v-if="canManage"
        type="button"
        @click="openCreate"
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Novo formato
      </button>
    </header>

    <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 dark:bg-slate-800 dark:border-slate-700">
      <label class="block mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Buscar</label>
      <input
        v-model="search"
        type="search"
        placeholder="Nome do formato (ex.: 66x96)..."
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full md:w-1/2 p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
      />
    </div>

    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
      <div v-if="loading" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando formatos...</div>
      <div v-else-if="listError" class="p-6 text-sm text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300">{{ listError }}</div>
      <div v-else-if="filtered.length === 0" class="p-8 text-sm text-center text-slate-500 dark:text-slate-400">
        Nenhum formato cadastrado. Clique em "Novo formato" para começar.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead class="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50 dark:text-slate-300">
            <tr>
              <th class="px-5 py-3 font-semibold">Nome</th>
              <th class="px-5 py-3 font-semibold">Dimensões</th>
              <th class="px-5 py-3 font-semibold">Conversões</th>
              <th class="px-5 py-3 font-semibold text-center">Status</th>
              <th v-if="canManage" class="px-5 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
            <tr v-for="format in filtered" :key="format.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
              <td class="px-5 py-3">
                <div class="font-medium text-slate-900 dark:text-white">{{ format.name }}</div>
              </td>
              <td class="px-5 py-3 whitespace-nowrap">{{ formatMeasure(format.width.millimeters) }} × {{ formatMeasure(format.height.millimeters) }}</td>
              <td class="px-5 py-3">
                <span v-if="format.conversions.length === 0" class="text-xs text-slate-400">—</span>
                <div v-else class="flex flex-wrap gap-1">
                  <span
                    v-for="conv in format.conversions"
                    :key="conv.id"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                    :title="`Nº ${conv.formatNumber} · ${conv.cutCount} corte(s)`"
                  >
                    {{ conv.name }} ({{ conv.cutCount }}×)
                  </span>
                </div>
              </td>
              <td class="px-5 py-3 text-center">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="format.active
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'"
                >
                  {{ format.active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td v-if="canManage" class="px-5 py-3 text-right">
                <div class="inline-flex items-center gap-1">
                  <button type="button" @click="openEdit(format)" class="px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded-md dark:text-indigo-300 dark:hover:bg-slate-700">
                    Editar
                  </button>
                  <button v-if="canDelete" type="button" @click="handleDelete(format)" class="px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md dark:text-rose-300 dark:hover:bg-slate-700">
                    Remover
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal
      :is-open="isModalOpen"
      :title="editingFormat ? 'Editar formato' : 'Novo formato'"
      @close="closeModal"
    >
      <FormatForm
        :initial="editingFormat"
        :loading="formLoading"
        :server-error="formError"
        @submit="handleSubmit"
        @cancel="closeModal"
      />
    </Modal>
  </div>
</template>
