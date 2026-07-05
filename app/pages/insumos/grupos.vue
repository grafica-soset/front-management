<script setup lang="ts">
/**
 * Gerenciamento de Grupos de Insumo (atividade 028). Lista os grupos da empresa e permite
 * cadastrar/editar (modal) e excluir. Grupos agrupam insumos da mesma família (ex.: Grampos).
 */
import { computed, ref } from 'vue'
import { useSupplyGroups } from '@/composables/useSupplyGroups'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import type { CreateSupplyGroupRequest, SupplyGroup, SupplyGroupKeyValue, UpdateSupplyGroupRequest } from '@/types/SupplyGroup'
import Modal from '@/components/ui/Modal.vue'
import SupplyGroupForm from '@/components/forms/SupplyGroupForm.vue'

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const toast = useToast()
const { listKeyValues, getById, create, update, remove, setSupplies } = useSupplyGroups()

const items = ref<SupplyGroupKeyValue[]>([])
const loading = ref(false)
const listError = ref<string | null>(null)
const deletingId = ref<number | null>(null)

const modalOpen = ref(false)
const editing = ref<SupplyGroup | null>(null)
const saving = ref(false)
const saveError = ref<string | null>(null)

const hasCompany = computed(() => !!auth.activeCompanyId)

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

const openCreate = () => { editing.value = null; saveError.value = null; modalOpen.value = true }
const openEdit = async (item: SupplyGroupKeyValue) => {
  saveError.value = null
  try {
    editing.value = await getById(item.id)
    modalOpen.value = true
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível abrir o grupo.'))
  }
}
const closeModal = () => { modalOpen.value = false; editing.value = null }

const handleSubmit = async (
  payload: CreateSupplyGroupRequest | UpdateSupplyGroupRequest,
  _mode: 'create' | 'update',
  supplyIds: number[] = [],
) => {
  saving.value = true
  saveError.value = null
  try {
    if (editing.value) {
      await update(editing.value.id, payload as UpdateSupplyGroupRequest)
      // Sempre sincroniza o vínculo na edição (lista vazia desvincula todos).
      await setSupplies(editing.value.id, supplyIds)
      toast.success('Grupo atualizado.')
    } else {
      const created = await create(payload as CreateSupplyGroupRequest)
      if (supplyIds.length) await setSupplies(created.id, supplyIds)
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

const handleDelete = async (item: SupplyGroupKeyValue) => {
  if (!window.confirm(`Remover o grupo "${item.value}"?`)) return
  deletingId.value = item.id
  try {
    await remove(item.id)
    toast.success(`Grupo "${item.value}" removido.`)
    await refresh()
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível remover o grupo (pode estar em uso).'))
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
                  <button type="button" :disabled="deletingId === item.id" @click="handleDelete(item)" class="px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md disabled:opacity-50 dark:text-rose-300 dark:hover:bg-slate-700">Excluir</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal :is-open="modalOpen" :title="editing ? 'Editar grupo' : 'Novo grupo'" @close="closeModal">
      <SupplyGroupForm
        :initial="editing"
        :mode="editing ? 'edit' : 'create'"
        :loading="saving"
        :server-error="saveError"
        @submit="handleSubmit"
        @cancel="closeModal"
      />
    </Modal>
  </div>
</template>
