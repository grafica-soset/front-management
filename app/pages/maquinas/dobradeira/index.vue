<script setup lang="ts">
/**
 * Listagem paginada das máquinas de dobradeira da empresa ativa
 * (GET /folding-machines/page). Filtro por status ativo.
 */
import { computed, ref, watch } from 'vue'
import { useMachines } from '@/composables/useMachines'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import { MACHINE_TYPE_LABELS, FOLDING_MACHINES_BASE } from '@/utils/machineCatalog'
import type { FoldingMachine, FoldingMachineRequest, MachinePageItem } from '@/types/Machine'

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const toast = useToast()
const { listPage, remove } = useMachines<FoldingMachine, FoldingMachineRequest>(FOLDING_MACHINES_BASE)

const PAGE_SIZE = 20
const items = ref<MachinePageItem[]>([])
const page = ref(0)
const totalItems = ref(0)
const totalPages = ref(0)

const onlyActive = ref(false)
const loading = ref(false)
const listError = ref<string | null>(null)
const deletingId = ref<number | null>(null)

const hasCompany = computed(() => !!auth.activeCompanyId)

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
    listError.value = extractApiError(err, 'Falha ao carregar as máquinas de dobradeira.')
  } finally {
    loading.value = false
  }
}

onMounted(refresh)

watch(onlyActive, () => {
  page.value = 0
  refresh()
})

const goToPage = (next: number) => {
  if (next < 0 || next >= totalPages.value) return
  page.value = next
  refresh()
}

const handleDelete = async (item: MachinePageItem) => {
  if (!window.confirm(`Remover a máquina "${item.name}"? Esta ação não pode ser desfeita.`)) return
  deletingId.value = item.id
  try {
    await remove(item.id)
    toast.success(`Máquina "${item.name}" removida.`)
    if (items.value.length === 1 && page.value > 0) page.value -= 1
    await refresh()
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível remover a máquina.'))
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Máquinas — Dobradeira</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Parque de dobradeira de <span class="font-medium">{{ auth.activeCompany?.value ?? '—' }}</span>.
        </p>
      </div>
      <NuxtLink
        v-if="hasCompany"
        to="/maquinas/dobradeira/nova"
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-md shadow-indigo-500/20 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Nova máquina
      </NuxtLink>
    </header>

    <div v-if="!hasCompany" class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200">
      Selecione uma empresa para ver e gerenciar as máquinas de dobradeira.
    </div>

    <template v-else>
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 dark:bg-slate-800 dark:border-slate-700">
        <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input v-model="onlyActive" type="checkbox" class="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600" />
          Apenas ativas
        </label>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
        <div v-if="loading" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando máquinas...</div>
        <div v-else-if="listError" class="p-6 text-sm text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300">{{ listError }}</div>
        <div v-else-if="items.length === 0" class="p-8 text-sm text-center text-slate-500 dark:text-slate-400">
          Nenhuma máquina de dobradeira cadastrada.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead class="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50 dark:text-slate-300">
              <tr>
                <th class="px-5 py-3 font-semibold">Nome</th>
                <th class="px-5 py-3 font-semibold">Tipo</th>
                <th class="px-5 py-3 font-semibold">Custo-hora</th>
                <th class="px-5 py-3 font-semibold text-center">Status</th>
                <th class="px-5 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
              <tr v-for="item in items" :key="item.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                <td class="px-5 py-3 font-medium text-slate-900 dark:text-white">{{ item.name }}</td>
                <td class="px-5 py-3 text-slate-700 dark:text-slate-200">{{ MACHINE_TYPE_LABELS[item.machineType] }}</td>
                <td class="px-5 py-3 whitespace-nowrap">R$ {{ item.hourlyCost.toFixed(2) }}</td>
                <td class="px-5 py-3 text-center">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="item.active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'"
                  >
                    {{ item.active ? 'Ativa' : 'Inativa' }}
                  </span>
                </td>
                <td class="px-5 py-3 text-right">
                  <div class="inline-flex items-center gap-1">
                    <NuxtLink
                      :to="`/maquinas/dobradeira/${item.id}/editar`"
                      class="px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded-md dark:text-indigo-300 dark:hover:bg-slate-700"
                    >
                      Editar
                    </NuxtLink>
                    <NuxtLink
                      :to="`/maquinas/dobradeira/nova?duplicate=${item.id}`"
                      class="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Duplicar
                    </NuxtLink>
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
          <span class="text-xs text-slate-500 dark:text-slate-400">{{ totalItems }} máquina(s) — página {{ page + 1 }} de {{ totalPages }}</span>
          <div class="flex gap-2">
            <button type="button" :disabled="page === 0" @click="goToPage(page - 1)" class="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-50 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700">Anterior</button>
            <button type="button" :disabled="page + 1 >= totalPages" @click="goToPage(page + 1)" class="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-50 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700">Próxima</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
