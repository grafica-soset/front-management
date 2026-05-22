<script setup lang="ts">
/**
 * Gestão das Dimensões (SKUs) de um Agrupamento de medidas.
 *
 * Componente autocontido: carrega os papéis do agrupamento, exibe a tabela e
 * trata adicionar/editar/duplicar/remover via modal com PaperForm (agrupamento
 * fixado). Reutilizado na edição e no passo 2 do cadastro.
 *
 * Expõe `reload()` para o pai forçar recarga (ex.: após mudar a gramatura do
 * agrupamento, que recalcula o preço por folha).
 */
import { computed, onMounted, ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import PaperForm from '@/components/forms/PaperForm.vue'
import { usePapers } from '@/composables/usePapers'
import { useUnitConverter } from '@/composables/useUnitConverter'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import type { PaperType } from '@/types/PaperType'
import type { CreatePaperRequest, Paper, UpdatePaperRequest } from '@/types/Paper'

const props = defineProps<{ family: PaperType }>()

const auth = useAuthStore()
const { listPapers, createPaper, updatePaper, deletePaper } = usePapers()
const { format } = useUnitConverter()
const toast = useToast()

const canManage = computed(() => auth.isAdmin || auth.hasCustomer)
const canDelete = computed(() => auth.isAdmin)

const dimensions = ref<Paper[]>([])
const loading = ref(false)
const listError = ref<string | null>(null)

const reload = async () => {
  loading.value = true
  listError.value = null
  try {
    dimensions.value = await listPapers({ paperTypeId: props.family.id })
  } catch (err) {
    listError.value = extractApiError(err, 'Falha ao carregar as dimensões.')
  } finally {
    loading.value = false
  }
}
defineExpose({ reload })

onMounted(reload)
watch(() => props.family.id, reload)

// ---------- Modal ----------
const isModalOpen = ref(false)
const editingPaper = ref<Paper | null>(null)
const duplicatingPaper = ref<Paper | null>(null)
const formLoading = ref(false)
const formError = ref<string | null>(null)

const openCreate = () => {
  editingPaper.value = null
  duplicatingPaper.value = null
  formError.value = null
  isModalOpen.value = true
}
const openEdit = (paper: Paper) => {
  editingPaper.value = paper
  duplicatingPaper.value = null
  formError.value = null
  isModalOpen.value = true
}
const openDuplicate = (paper: Paper) => {
  editingPaper.value = null
  duplicatingPaper.value = paper
  formError.value = null
  isModalOpen.value = true
}
const closeModal = () => {
  isModalOpen.value = false
  editingPaper.value = null
  duplicatingPaper.value = null
}

const handleSubmit = async (
  payload: CreatePaperRequest | UpdatePaperRequest,
  mode: 'create' | 'update',
) => {
  formLoading.value = true
  formError.value = null
  try {
    if (mode === 'update' && editingPaper.value) {
      await updatePaper(editingPaper.value.id, payload as UpdatePaperRequest)
      toast.success('Dimensão atualizada.')
    } else {
      const response = await createPaper(payload as CreatePaperRequest)
      toast.success(
        response.customerPaper ? 'Dimensão cadastrada e ativada para a empresa.' : 'Dimensão cadastrada.',
      )
    }
    closeModal()
    await reload()
  } catch (err) {
    formError.value = extractApiError(err, 'Não foi possível salvar a dimensão.')
  } finally {
    formLoading.value = false
  }
}

const handleDelete = async (paper: Paper) => {
  if (!window.confirm(`Remover a dimensão "${paper.code}"? Esta ação não pode ser desfeita.`)) return
  try {
    await deletePaper(paper.id)
    toast.success('Dimensão removida.')
    await reload()
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível remover a dimensão.'))
  }
}

const priceLabel = (value: number | null) => (value != null ? `R$ ${value.toFixed(4)}` : '—')
</script>

<template>
  <section class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
      <div>
        <h2 class="text-lg font-bold text-slate-900 dark:text-white">Dimensões</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Tamanhos deste agrupamento ({{ family.weightPerM2Grams }} g/m² · {{ family.thicknessMicrometers }} µm · {{ family.hasTwoSides ? '2 faces' : '1 face' }}).
        </p>
      </div>
      <button
        v-if="canManage"
        type="button"
        @click="openCreate"
        class="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Adicionar dimensão
      </button>
    </div>

    <div v-if="loading" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando dimensões...</div>
    <div v-else-if="listError" class="p-6 text-sm text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300">{{ listError }}</div>
    <div v-else-if="dimensions.length === 0" class="p-8 text-sm text-center text-slate-500 dark:text-slate-400">
      Nenhuma dimensão cadastrada. Clique em "Adicionar dimensão" para incluir um tamanho.
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
        <thead class="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50 dark:text-slate-300">
          <tr>
            <th class="px-5 py-3 font-semibold">Código</th>
            <th class="px-5 py-3 font-semibold">Dimensões</th>
            <th class="px-5 py-3 font-semibold">R$/kg</th>
            <th class="px-5 py-3 font-semibold">R$/folha</th>
            <th class="px-5 py-3 font-semibold text-center">Status</th>
            <th v-if="canManage" class="px-5 py-3 font-semibold text-right">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
          <tr v-for="paper in dimensions" :key="paper.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
            <td class="px-5 py-3">
              <div class="font-mono text-xs text-slate-700 dark:text-slate-300">{{ paper.code }}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">{{ paper.longName }}</div>
            </td>
            <td class="px-5 py-3 whitespace-nowrap">{{ format(paper.width.millimeters) }} × {{ format(paper.height.millimeters) }}</td>
            <td class="px-5 py-3 whitespace-nowrap">{{ priceLabel(paper.pricePerKg) }}</td>
            <td class="px-5 py-3 whitespace-nowrap">{{ priceLabel(paper.pricePerSheet) }}</td>
            <td class="px-5 py-3 text-center">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                :class="paper.active
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'"
              >
                {{ paper.active ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td v-if="canManage" class="px-5 py-3 text-right">
              <div class="inline-flex items-center gap-1">
                <button type="button" @click="openDuplicate(paper)" class="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md dark:text-slate-200 dark:hover:bg-slate-700">Duplicar</button>
                <button type="button" @click="openEdit(paper)" class="px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded-md dark:text-indigo-300 dark:hover:bg-slate-700">Editar</button>
                <button v-if="canDelete" type="button" @click="handleDelete(paper)" class="px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md dark:text-rose-300 dark:hover:bg-slate-700">Remover</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal
      :is-open="isModalOpen"
      :title="editingPaper ? 'Editar dimensão' : duplicatingPaper ? 'Duplicar dimensão' : 'Nova dimensão'"
      @close="closeModal"
    >
      <PaperForm
        :initial="editingPaper"
        :duplicate-from="duplicatingPaper"
        :locked-paper-type="family"
        :paper-types="[family]"
        :loading="formLoading"
        :server-error="formError"
        @submit="handleSubmit"
        @cancel="closeModal"
      />
    </Modal>
  </section>
</template>
