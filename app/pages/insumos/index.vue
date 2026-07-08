<script setup lang="ts">
/**
 * Listagem de Insumos "por tipo" (atividade 027): abas Papéis / Tintas / Chapas / Outros.
 * Papéis têm módulo próprio (link); Tintas/Chapas/Outros vêm de GET /supplies/page?type=…
 * Edição em modal; cadastro em página dedicada (/insumos/novo).
 */
import { computed, ref, watch } from 'vue'
import { useSupplies } from '@/composables/useSupplies'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import {
  SUPPLY_TABS,
  supplyUnitLabel,
} from '@/utils/supplyCatalog'
import { PLATE_TYPE_LABELS } from '@/utils/plateTypes'
import { useUnitConverter } from '@/composables/useUnitConverter'
import type { Supply, SupplyPageItem, SupplyType, UpdateSupplyRequest, CreateSupplyRequest } from '@/types/Supply'
import Modal from '@/components/ui/Modal.vue'
import SupplyForm from '@/components/forms/SupplyForm.vue'

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const toast = useToast()
const { listPage, getById, create, update, remove } = useSupplies()
const { currentUnit } = useUnitConverter()
const unitLabel = (u: SupplyPageItem['unitOfMeasure']) => supplyUnitLabel(u, currentUnit.value)

const PAGE_SIZE = 20
const activeTab = ref<'PAPER' | SupplyType>('INK')
const items = ref<SupplyPageItem[]>([])
const page = ref(0)
const totalItems = ref(0)
const totalPages = ref(0)
const onlyActive = ref(false)
const loading = ref(false)
const listError = ref<string | null>(null)
const deletingId = ref<number | null>(null)

// Modal de edição.
const editing = ref<Supply | null>(null)
const editOpen = ref(false)
const editLoading = ref(false)
const editError = ref<string | null>(null)

// Modal de duplicação (cadastra um novo insumo a partir de um existente).
const duplicating = ref<Supply | null>(null)
const createOpen = ref(false)
const createLoading = ref(false)
const createError = ref<string | null>(null)

const hasCompany = computed(() => !!auth.activeCompanyId)
const isPaperTab = computed(() => activeTab.value === 'PAPER')

const refresh = async () => {
  if (!hasCompany.value || isPaperTab.value) return
  loading.value = true
  listError.value = null
  try {
    const res = await listPage({
      type: activeTab.value as SupplyType,
      page: page.value,
      size: PAGE_SIZE,
      onlyActive: onlyActive.value,
    })
    items.value = res.items
    totalItems.value = res.totalItems
    totalPages.value = res.totalPages
  } catch (err) {
    listError.value = extractApiError(err, 'Falha ao carregar os insumos.')
  } finally {
    loading.value = false
  }
}

onMounted(refresh)

watch(activeTab, () => {
  page.value = 0
  refresh()
})
watch(onlyActive, () => {
  page.value = 0
  refresh()
})

const goToPage = (next: number) => {
  if (next < 0 || next >= totalPages.value) return
  page.value = next
  refresh()
}

const plateLabel = (item: SupplyPageItem): string => {
  if (!item.plate) return '—'
  const { plateType, width, height, thicknessMicrometers } = item.plate
  const u = width.unit === 'CENTIMETER' ? 'cm' : width.unit === 'METER' ? 'm' : 'mm'
  return `${PLATE_TYPE_LABELS[plateType]} · ${width.value}×${height.value} ${u} · ${thicknessMicrometers} µm`
}

const openEdit = async (item: SupplyPageItem) => {
  editError.value = null
  editLoading.value = false
  try {
    editing.value = await getById(item.id)
    editOpen.value = true
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível abrir o insumo para edição.'))
  }
}

const closeEdit = () => {
  editOpen.value = false
  editing.value = null
}

const handleUpdate = async (payload: CreateSupplyRequest | UpdateSupplyRequest) => {
  if (!editing.value) return
  editLoading.value = true
  editError.value = null
  try {
    await update(editing.value.id, payload as UpdateSupplyRequest)
    toast.success(`Insumo "${payload.name}" atualizado.`)
    closeEdit()
    await refresh()
  } catch (err) {
    editError.value = extractApiError(err, 'Falha ao atualizar o insumo.')
  } finally {
    editLoading.value = false
  }
}

const openDuplicate = async (item: SupplyPageItem) => {
  createError.value = null
  createLoading.value = false
  try {
    const source = await getById(item.id)
    // Novo insumo a partir do original; nome ganha sufixo (o backend exige nome único).
    duplicating.value = { ...source, name: `${source.name} (cópia)` }
    createOpen.value = true
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível duplicar o insumo.'))
  }
}

const closeCreate = () => {
  createOpen.value = false
  duplicating.value = null
}

const handleCreate = async (payload: CreateSupplyRequest | UpdateSupplyRequest) => {
  createLoading.value = true
  createError.value = null
  try {
    await create(payload as CreateSupplyRequest)
    toast.success(`Insumo "${payload.name}" cadastrado.`)
    closeCreate()
    await refresh()
  } catch (err) {
    createError.value = extractApiError(err, 'Falha ao duplicar o insumo.')
  } finally {
    createLoading.value = false
  }
}

const handleDelete = async (item: SupplyPageItem) => {
  if (!window.confirm(`Remover o insumo "${item.name}"? Esta ação não pode ser desfeita.`)) return
  deletingId.value = item.id
  try {
    await remove(item.id)
    toast.success(`Insumo "${item.name}" removido.`)
    if (items.value.length === 1 && page.value > 0) page.value -= 1
    await refresh()
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível remover o insumo.'))
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Insumos</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Matérias-primas e consumíveis de <span class="font-medium">{{ auth.activeCompany?.value ?? '—' }}</span>.
        </p>
      </div>
      <NuxtLink
        v-if="hasCompany && !isPaperTab"
        :to="`/insumos/novo?type=${activeTab}`"
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Novo insumo
      </NuxtLink>
    </header>

    <div v-if="!hasCompany" class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200">
      Selecione uma empresa para ver e gerenciar os insumos.
    </div>

    <template v-else>
      <!-- Abas por tipo -->
      <div class="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        <button
          v-for="tab in SUPPLY_TABS"
          :key="tab.key"
          type="button"
          @click="activeTab = tab.key"
          class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
          :class="activeTab === tab.key
            ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Aba Papéis: módulo próprio -->
      <div v-if="isPaperTab" class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
        <p class="text-sm text-slate-600 dark:text-slate-300">
          Os <strong>papéis</strong> têm um cadastro dedicado, com formato, gramatura e preços.
        </p>
        <NuxtLink to="/papeis" class="inline-flex items-center gap-2 mt-4 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-md shadow-indigo-500/20 hover:bg-indigo-700">
          Ir para o cadastro de papéis
        </NuxtLink>
      </div>

      <!-- Demais tipos: grid de insumos -->
      <template v-else>
        <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 dark:bg-slate-800 dark:border-slate-700">
          <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input v-model="onlyActive" type="checkbox" class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600" />
            Apenas ativos
          </label>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
          <div v-if="loading" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando insumos...</div>
          <div v-else-if="listError" class="p-6 text-sm text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300">{{ listError }}</div>
          <div v-else-if="items.length === 0" class="p-8 text-sm text-center text-slate-500 dark:text-slate-400">
            Nenhum insumo cadastrado neste tipo.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead class="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50 dark:text-slate-300">
                <tr>
                  <th class="px-5 py-3 font-semibold">Nome</th>
                  <th class="px-5 py-3 font-semibold">Unidade</th>
                  <th class="px-5 py-3 font-semibold">Custo</th>
                  <th v-if="activeTab === 'PLATE'" class="px-5 py-3 font-semibold">Matriz / Tamanho / Espessura</th>
                  <th class="px-5 py-3 font-semibold text-center">Status</th>
                  <th class="px-5 py-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
                <tr v-for="item in items" :key="item.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                  <td class="px-5 py-3 font-medium text-slate-900 dark:text-white">{{ item.name }}</td>
                  <td class="px-5 py-3 text-slate-700 dark:text-slate-200">{{ unitLabel(item.unitOfMeasure) }}</td>
                  <td class="px-5 py-3 whitespace-nowrap">R$ {{ item.unitCost.toFixed(4) }}</td>
                  <td v-if="activeTab === 'PLATE'" class="px-5 py-3 text-slate-700 dark:text-slate-200">{{ plateLabel(item) }}</td>
                  <td class="px-5 py-3 text-center">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      :class="item.active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'"
                    >
                      {{ item.active ? 'Ativo' : 'Inativo' }}
                    </span>
                  </td>
                  <td class="px-5 py-3 text-right">
                    <div class="inline-flex items-center gap-1">
                      <button type="button" @click="openEdit(item)" class="px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded-md dark:text-indigo-300 dark:hover:bg-slate-700">Editar</button>
                      <button type="button" @click="openDuplicate(item)" class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md dark:text-slate-300 dark:hover:bg-slate-700">Duplicar</button>
                      <button
                        type="button"
                        :disabled="deletingId === item.id"
                        @click="handleDelete(item)"
                        class="px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md disabled:opacity-50 dark:text-rose-300 dark:hover:bg-slate-700"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="!loading && !listError && totalPages > 1" class="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700/50">
            <span class="text-xs text-slate-500 dark:text-slate-400">{{ totalItems }} insumo(s) — página {{ page + 1 }} de {{ totalPages }}</span>
            <div class="flex gap-2">
              <button type="button" :disabled="page === 0" @click="goToPage(page - 1)" class="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-50 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700">Anterior</button>
              <button type="button" :disabled="page + 1 >= totalPages" @click="goToPage(page + 1)" class="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-50 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700">Próxima</button>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Modal de edição -->
    <Modal :is-open="editOpen" title="Editar insumo" @close="closeEdit">
      <SupplyForm
        v-if="editing"
        mode="edit"
        :initial="editing"
        :loading="editLoading"
        :server-error="editError"
        @submit="handleUpdate"
        @cancel="closeEdit"
      />
    </Modal>

    <!-- Modal de duplicação (cadastro a partir de um existente) -->
    <Modal :is-open="createOpen" title="Duplicar insumo" @close="closeCreate">
      <SupplyForm
        v-if="duplicating"
        mode="create"
        :initial="duplicating"
        :loading="createLoading"
        :server-error="createError"
        @submit="handleCreate"
        @cancel="closeCreate"
      />
    </Modal>
  </div>
</template>
