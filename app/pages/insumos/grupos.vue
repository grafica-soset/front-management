<script setup lang="ts">
/**
 * Gerenciamento de Grupos de Insumo (atividade 028). Lista os grupos da empresa e permite
 * cadastrar/editar (modal) e excluir. Grupos agrupam insumos da mesma família (ex.: Grampos).
 */
import { computed, ref } from 'vue'
import { useSupplyGroups } from '@/composables/useSupplyGroups'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { apiErrorCode, extractApiError, extractApiErrorDetails } from '@/utils/apiError'
import type { CreateSupplyGroupRequest, SupplyGroup, SupplyGroupKeyValue, UpdateSupplyGroupRequest } from '@/types/SupplyGroup'
import Modal from '@/components/ui/Modal.vue'
import BlockedDeleteDialog from '@/components/ui/BlockedDeleteDialog.vue'
import SupplyGroupForm from '@/components/forms/SupplyGroupForm.vue'

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const toast = useToast()
const { listKeyValues, getById, create, update, remove, listPapers, setSupplies, setPapers } = useSupplyGroups()

const items = ref<SupplyGroupKeyValue[]>([])
const loading = ref(false)
const listError = ref<string | null>(null)
const deletingId = ref<number | null>(null)

const modalOpen = ref(false)
// Dados iniciais do form: o grupo em edição ou a origem da duplicação. Quem manda no que o submit
// faz é o modalMode — duplicar tem dados iniciais mas CRIA.
const editing = ref<SupplyGroup | null>(null)
const modalMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)
// Papéis herdados na duplicação (o form só carrega os membros do grupo quando está editando).
const presetPaperIds = ref<number[]>([])
const saving = ref(false)
const saveError = ref<string | null>(null)

const hasCompany = computed(() => !!auth.activeCompanyId)
const modalTitle = computed(() => {
  if (modalMode.value === 'edit') return 'Editar grupo'
  return editing.value ? 'Duplicar grupo' : 'Novo grupo'
})

const refresh = async () => {
  if (!hasCompany.value) return
  loading.value = true
  listError.value = null
  try {
    items.value = await listKeyValues(false)
  } catch (err) {
    listError.value = extractApiError(err, 'Falha ao carregar os grupos de insumo.')
  } finally {
    loading.value = false
  }
}

onMounted(refresh)

const openCreate = () => {
  modalMode.value = 'create'
  editing.value = null
  editingId.value = null
  presetPaperIds.value = []
  saveError.value = null
  modalOpen.value = true
}

const openEdit = async (item: SupplyGroupKeyValue) => {
  saveError.value = null
  try {
    editing.value = await getById(item.id)
    editingId.value = item.id
    presetPaperIds.value = []
    modalMode.value = 'edit'
    modalOpen.value = true
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível abrir o grupo.'))
  }
}

// Duplicar: abre o form em modo de CRIAÇÃO com nome (cópia) + unidade + os PAPÉIS do grupo de origem.
// Os insumos ficam de fora de propósito: um insumo pertence a no máximo um grupo, então copiá-los
// os tiraria do grupo original. O usuário escolhe os insumos da cópia na hora.
const openDuplicate = async (item: SupplyGroupKeyValue) => {
  saveError.value = null
  try {
    const [source, papers] = await Promise.all([getById(item.id), listPapers(item.id)])
    editing.value = { ...source, name: `${source.name} (cópia)` }
    presetPaperIds.value = papers.map((p) => p.id)
    editingId.value = null
    modalMode.value = 'create'
    modalOpen.value = true
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível duplicar o grupo.'))
  }
}

const closeModal = () => {
  modalOpen.value = false
  editing.value = null
  editingId.value = null
  presetPaperIds.value = []
}

const handleSubmit = async (
  payload: CreateSupplyGroupRequest | UpdateSupplyGroupRequest,
  _mode: 'create' | 'update',
  supplyIds: number[] = [],
  paperIds: number[] = [],
) => {
  saving.value = true
  saveError.value = null
  try {
    if (modalMode.value === 'edit' && editingId.value) {
      await update(editingId.value, payload as UpdateSupplyGroupRequest)
      // Sempre sincroniza os vínculos na edição (lista vazia desvincula todos).
      await setSupplies(editingId.value, supplyIds)
      await setPapers(editingId.value, paperIds)
      toast.success('Grupo atualizado.')
    } else {
      const created = await create(payload as CreateSupplyGroupRequest)
      if (supplyIds.length) await setSupplies(created.id, supplyIds)
      if (paperIds.length) await setPapers(created.id, paperIds)
      toast.success('Grupo cadastrado.')
    }
    closeModal()
    await refresh()
  } catch (err) {
    saveError.value = extractApiError(err, 'Falha ao salvar o grupo.')
  } finally {
    saving.value = false
  }
}

// Exclusão bloqueada: atividades que consomem o grupo (vêm em ErrorResponse.details).
const blocked = ref<{ groupName: string; activities: string[] } | null>(null)

const handleDelete = async (item: SupplyGroupKeyValue) => {
  // Insumos e papéis do grupo não impedem a exclusão — são apenas desvinculados.
  if (!window.confirm(`Remover o grupo "${item.value}"? Os insumos e papéis do grupo não são excluídos, apenas ficam sem grupo.`)) return
  deletingId.value = item.id
  try {
    await remove(item.id)
    toast.success(`Grupo "${item.value}" removido.`)
    await refresh()
  } catch (err) {
    // Em uso por atividades: mostra quais são, em vez de um toast que some.
    if (apiErrorCode(err) === 'SupplyGroupInUseException') {
      blocked.value = { groupName: item.value, activities: extractApiErrorDetails(err) }
    } else {
      toast.error(extractApiError(err, 'Não foi possível remover o grupo.'))
    }
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <NuxtLink to="/insumos" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          Voltar para insumos
        </NuxtLink>
        <h1 class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Grupos de insumo</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Famílias de insumo (ex.: Grampos, Plásticos) usadas pelas atividades.</p>
      </div>
      <button
        v-if="hasCompany"
        type="button"
        @click="openCreate"
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Novo grupo
      </button>
    </header>

    <div v-if="!hasCompany" class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200">
      Selecione uma empresa para gerenciar os grupos de insumo.
    </div>

    <div v-else class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
      <div v-if="loading" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando grupos...</div>
      <div v-else-if="listError" class="p-6 text-sm text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300">{{ listError }}</div>
      <div v-else-if="items.length === 0" class="p-8 text-sm text-center text-slate-500 dark:text-slate-400">Nenhum grupo cadastrado.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead class="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50 dark:text-slate-300">
            <tr>
              <th class="px-5 py-3 font-semibold">Nome</th>
              <th class="px-5 py-3 font-semibold text-center">Status</th>
              <th class="px-5 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
            <tr v-for="item in items" :key="item.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
              <td class="px-5 py-3 font-medium text-slate-900 dark:text-white">{{ item.value }}</td>
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
      <SupplyGroupForm
        :initial="editing"
        :mode="modalMode"
        :preset-paper-ids="presetPaperIds"
        :loading="saving"
        :server-error="saveError"
        @submit="handleSubmit"
        @cancel="closeModal"
      />
    </Modal>

    <BlockedDeleteDialog
      :is-open="!!blocked"
      title="Não é possível excluir o grupo"
      :message="`O grupo &quot;${blocked?.groupName}&quot; é usado pelas atividades abaixo, que dependem dele para calcular o consumo de insumo no orçamento:`"
      hint="Ajuste ou exclua essas atividades primeiro e tente de novo. Nada foi excluído."
      :items="blocked?.activities ?? []"
      @close="blocked = null"
    />
  </div>
</template>
