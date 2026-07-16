<script setup lang="ts">
/**
 * Listagem paginada de Atividades (atividade 028). Mostra tipo, máquina/custo e grupo de insumo.
 * Máquina e grupo são resolvidos por nome via os catálogos GET /machines e GET /supply-groups.
 * Edição em modal; cadastro em página (/atividades/novo).
 */
import { computed, ref } from 'vue'
import { useActivities } from '@/composables/useActivities'
import { useMachineCatalog } from '@/composables/useMachineCatalog'
import { useSupplyGroups } from '@/composables/useSupplyGroups'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { apiErrorCode, extractApiError, extractApiErrorDetails } from '@/utils/apiError'
import { ACTIVITY_TYPE_LABELS } from '@/utils/activityCatalog'
import type { Activity, CreateActivityRequest, UpdateActivityRequest } from '@/types/Activity'
import Modal from '@/components/ui/Modal.vue'
import BlockedDeleteDialog from '@/components/ui/BlockedDeleteDialog.vue'
import ActivityForm from '@/components/forms/ActivityForm.vue'

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const toast = useToast()
const { listPage, getById, update, remove } = useActivities()

const PAGE_SIZE = 20
const items = ref<Activity[]>([])
const page = ref(0)
const totalItems = ref(0)
const totalPages = ref(0)
const onlyActive = ref(false)
const loading = ref(false)
const listError = ref<string | null>(null)
const deletingId = ref<number | null>(null)

// Mapas id→nome para exibir máquina e grupo por nome.
const machineNames = ref<Record<number, string>>({})
const groupNames = ref<Record<number, string>>({})

const editing = ref<Activity | null>(null)
const editOpen = ref(false)
const editLoading = ref(false)
const editError = ref<string | null>(null)

const hasCompany = computed(() => !!auth.activeCompanyId)

const loadCatalogs = async () => {
  try {
    const machines = await useMachineCatalog().listAll(false)
    machineNames.value = Object.fromEntries(machines.map((m) => [m.id, m.value]))
  } catch { machineNames.value = {} }
  try {
    const groups = await useSupplyGroups().listKeyValues(false)
    groupNames.value = Object.fromEntries(groups.map((g) => [g.id, g.value]))
  } catch { groupNames.value = {} }
}

const refresh = async () => {
  if (!hasCompany.value) return
  loading.value = true
  listError.value = null
  try {
    const res = await listPage({ page: page.value, size: PAGE_SIZE, onlyActive: onlyActive.value })
    items.value = res.items
    totalItems.value = res.totalItems
    totalPages.value = res.totalPages
  } catch (err) {
    listError.value = extractApiError(err, 'Falha ao carregar as atividades.')
  } finally {
    loading.value = false
  }
}

onMounted(async () => { await loadCatalogs(); await refresh() })

watch(onlyActive, () => { page.value = 0; refresh() })

const goToPage = (next: number) => {
  if (next < 0 || next >= totalPages.value) return
  page.value = next
  refresh()
}

const costLabel = (a: Activity): string => {
  if (a.type === 'AUTOMATED') return a.machineId ? (machineNames.value[a.machineId] ?? `Máquina #${a.machineId}`) : '—'
  return a.laborHourlyCost != null ? `R$ ${a.laborHourlyCost.toFixed(2)}/h` : '—'
}
const groupLabel = (a: Activity): string =>
  a.supplyGroupId ? (groupNames.value[a.supplyGroupId] ?? `Grupo #${a.supplyGroupId}`) : '—'

const openEdit = async (a: Activity) => {
  editError.value = null
  try {
    editing.value = await getById(a.id)
    editOpen.value = true
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível abrir a atividade.'))
  }
}
const closeEdit = () => { editOpen.value = false; editing.value = null }

const handleUpdate = async (payload: CreateActivityRequest | UpdateActivityRequest) => {
  if (!editing.value) return
  editLoading.value = true
  editError.value = null
  try {
    await update(editing.value.id, payload as UpdateActivityRequest)
    toast.success(`Atividade "${payload.name}" atualizada.`)
    closeEdit()
    await refresh()
  } catch (err) {
    editError.value = extractApiError(err, 'Falha ao atualizar a atividade.')
  } finally {
    editLoading.value = false
  }
}

// Exclusão bloqueada: modelos de produto que usam a atividade (vêm em ErrorResponse.details).
const blocked = ref<{ activityName: string; models: string[] } | null>(null)

const handleDelete = async (a: Activity) => {
  if (!window.confirm(`Remover a atividade "${a.name}"?`)) return
  deletingId.value = a.id
  try {
    await remove(a.id)
    toast.success(`Atividade "${a.name}" removida.`)
    if (items.value.length === 1 && page.value > 0) page.value -= 1
    await refresh()
  } catch (err) {
    // Em uso por modelos: mostra quais são, em vez de um toast que some.
    if (apiErrorCode(err) === 'ActivityInUseException') {
      blocked.value = { activityName: a.name, models: extractApiErrorDetails(err) }
    } else {
      toast.error(extractApiError(err, 'Não foi possível remover a atividade.'))
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
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Atividades</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Etapas de execução de <span class="font-medium">{{ auth.activeCompany?.value ?? '—' }}</span>.</p>
      </div>
      <NuxtLink v-if="hasCompany" to="/atividades/novo" class="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Nova atividade
      </NuxtLink>
    </header>

    <div v-if="!hasCompany" class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200">
      Selecione uma empresa para ver e gerenciar as atividades.
    </div>

    <template v-else>
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 dark:bg-slate-800 dark:border-slate-700">
        <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input v-model="onlyActive" type="checkbox" class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600" />
          Apenas ativas
        </label>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
        <div v-if="loading" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando atividades...</div>
        <div v-else-if="listError" class="p-6 text-sm text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300">{{ listError }}</div>
        <div v-else-if="items.length === 0" class="p-8 text-sm text-center text-slate-500 dark:text-slate-400">Nenhuma atividade cadastrada.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead class="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50 dark:text-slate-300">
              <tr>
                <th class="px-5 py-3 font-semibold">Nome</th>
                <th class="px-5 py-3 font-semibold">Tipo</th>
                <th class="px-5 py-3 font-semibold">Máquina / Custo</th>
                <th class="px-5 py-3 font-semibold">Grupo de insumo</th>
                <th class="px-5 py-3 font-semibold text-center">Status</th>
                <th class="px-5 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
              <tr v-for="a in items" :key="a.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                <td class="px-5 py-3 font-medium text-slate-900 dark:text-white">{{ a.name }}</td>
                <td class="px-5 py-3 text-slate-700 dark:text-slate-200">{{ ACTIVITY_TYPE_LABELS[a.type] }}</td>
                <td class="px-5 py-3 text-slate-700 dark:text-slate-200">{{ costLabel(a) }}</td>
                <td class="px-5 py-3 text-slate-700 dark:text-slate-200">{{ groupLabel(a) }}</td>
                <td class="px-5 py-3 text-center">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="a.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'">
                    {{ a.active ? 'Ativa' : 'Inativa' }}
                  </span>
                </td>
                <td class="px-5 py-3 text-right">
                  <div class="inline-flex items-center gap-1">
                    <button type="button" @click="openEdit(a)" class="px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded-md dark:text-indigo-300 dark:hover:bg-slate-700">Editar</button>
                    <button type="button" :disabled="deletingId === a.id" @click="handleDelete(a)" class="px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md disabled:opacity-50 dark:text-rose-300 dark:hover:bg-slate-700">Excluir</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!loading && !listError && totalPages > 1" class="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700/50">
          <span class="text-xs text-slate-500 dark:text-slate-400">{{ totalItems }} atividade(s) — página {{ page + 1 }} de {{ totalPages }}</span>
          <div class="flex gap-2">
            <button type="button" :disabled="page === 0" @click="goToPage(page - 1)" class="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-50 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700">Anterior</button>
            <button type="button" :disabled="page + 1 >= totalPages" @click="goToPage(page + 1)" class="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-50 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700">Próxima</button>
          </div>
        </div>
      </div>
    </template>

    <Modal :is-open="editOpen" title="Editar atividade" @close="closeEdit">
      <ActivityForm v-if="editing" mode="edit" :initial="editing" :loading="editLoading" :server-error="editError" @submit="handleUpdate" @cancel="closeEdit" />
    </Modal>

    <BlockedDeleteDialog
      :is-open="!!blocked"
      title="Não é possível excluir a atividade"
      :message="`A atividade &quot;${blocked?.activityName}&quot; faz parte dos modelos de produto abaixo:`"
      hint="Tire a atividade desses modelos primeiro e tente de novo. Nada foi excluído."
      :items="blocked?.models ?? []"
      @close="blocked = null"
    />
  </div>
</template>
