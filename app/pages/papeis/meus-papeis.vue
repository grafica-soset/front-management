<script setup lang="ts">
/**
 * Papéis ativos da empresa.
 *
 * Visão filtrada (`onlyActive=true`) com totais sumarizados por papel e ação
 * para desativar diretamente — ao desativar, a linha some da lista.
 */
import { computed, onMounted, ref } from 'vue'
import { useCustomerPapers } from '@/composables/useCustomerPapers'
import { useUnitConverter } from '@/composables/useUnitConverter'
import { usePapersStore } from '@/stores/papers'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { extractApiError } from '@/utils/apiError'
import type { CustomerPaperEntry } from '@/types/CustomerPaper'

definePageMeta({
  middleware: 'auth',
})

const auth = useAuthStore()
const store = usePapersStore()
const { listCustomerPapers, toggleCustomerPaper } = useCustomerPapers()
const { format } = useUnitConverter()
const toast = useToast()

const loading = ref(false)
const listError = ref<string | null>(null)
const entries = ref<CustomerPaperEntry[]>([])
const filterPaperTypeId = ref<number | 0>(0)
const togglingIds = ref<Set<number>>(new Set())

const filteredEntries = computed<CustomerPaperEntry[]>(() => {
  const list = entries.value.filter((e) => e.customerPaper.active)
  if (!filterPaperTypeId.value) return list
  return list.filter((e) => e.paper.paperType.id === filterPaperTypeId.value)
})

const refresh = async () => {
  if (!auth.activeCompanyId) {
    listError.value = 'Selecione uma empresa para visualizar seus papéis.'
    return
  }
  loading.value = true
  listError.value = null
  try {
    entries.value = await listCustomerPapers({ onlyActive: false })
  } catch (err) {
    listError.value = extractApiError(err, 'Falha ao carregar papéis da empresa.')
  } finally {
    loading.value = false
  }
}

onMounted(refresh)

const handleDeactivate = async (entry: CustomerPaperEntry) => {
  togglingIds.value = new Set([...togglingIds.value, entry.paper.id])
  try {
    await toggleCustomerPaper(entry.paper.id, false)
    entries.value = entries.value.map((e) =>
      e.paper.id === entry.paper.id ? { ...e, customerPaper: { ...e.customerPaper, active: false } } : e,
    )
    toast.success(`Papel "${entry.paper.shortName}" desativado.`)
  } catch (err) {
    toast.error(extractApiError(err, 'Falha ao desativar.'))
  } finally {
    const copy = new Set(togglingIds.value)
    copy.delete(entry.paper.id)
    togglingIds.value = copy
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Meus papéis</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Papéis ativados para a empresa <span class="font-medium">{{ auth.activeCompany?.value ?? '—' }}</span>.
        </p>
      </div>
      <NuxtLink
        to="/papeis/catalogo"
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800 dark:hover:bg-indigo-900/50"
      >
        Ir para o catálogo
      </NuxtLink>
    </header>

    <!-- Filtros -->
    <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 dark:bg-slate-800 dark:border-slate-700">
      <label class="block mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tipo</label>
      <select
        v-model.number="filterPaperTypeId"
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full md:w-1/3 p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
      >
        <option :value="0">Todos os tipos</option>
        <option v-for="type in store.paperTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
      </select>
    </div>

    <div v-if="loading" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando...</div>
    <div v-else-if="listError" class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300">
      {{ listError }}
    </div>
    <div v-else-if="filteredEntries.length === 0" class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
      Nenhum papel ativo. Ative papéis no
      <NuxtLink to="/papeis/catalogo" class="text-indigo-600 hover:underline dark:text-indigo-400">catálogo</NuxtLink>.
    </div>

    <!-- Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <article
        v-for="entry in filteredEntries"
        :key="entry.customerPaper.id"
        class="bg-white border border-slate-200 rounded-xl shadow-sm p-5 dark:bg-slate-800 dark:border-slate-700 flex flex-col"
      >
        <header class="flex items-start justify-between gap-3 mb-3">
          <div>
            <p class="text-xs uppercase tracking-wide font-semibold text-indigo-600 dark:text-indigo-400">
              {{ entry.paper.paperType.name }}
            </p>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ entry.paper.shortName }}</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ entry.paper.longName }}</p>
          </div>
          <span class="font-mono text-xs text-slate-500 dark:text-slate-400">{{ entry.paper.code }}</span>
        </header>

        <dl class="grid grid-cols-2 gap-3 text-sm flex-1">
          <div>
            <dt class="text-xs text-slate-500 dark:text-slate-400">Dimensões</dt>
            <dd class="font-medium text-slate-900 dark:text-slate-100">
              {{ format(entry.paper.width.millimeters) }} × {{ format(entry.paper.height.millimeters) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500 dark:text-slate-400">Gramatura</dt>
            <dd class="font-medium text-slate-900 dark:text-slate-100">{{ entry.paper.weightPerM2Grams }} g/m²</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500 dark:text-slate-400">Preço/folha</dt>
            <dd class="font-medium text-slate-900 dark:text-slate-100">R$ {{ entry.customerPaper.pricePerSheet.toFixed(4) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500 dark:text-slate-400">Preço/kg</dt>
            <dd class="font-medium text-slate-900 dark:text-slate-100">R$ {{ entry.customerPaper.pricePerKg.toFixed(4) }}</dd>
          </div>
          <div class="col-span-2">
            <dt class="text-xs text-slate-500 dark:text-slate-400">Estoque</dt>
            <dd class="font-medium text-slate-900 dark:text-slate-100">{{ entry.customerPaper.totalQuantity }} folhas</dd>
          </div>
        </dl>

        <footer class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
          <NuxtLink
            :to="`/papeis/catalogo?duplicate=${entry.paper.id}`"
            class="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Duplicar
          </NuxtLink>
          <button
            type="button"
            :disabled="togglingIds.has(entry.paper.id)"
            @click="handleDeactivate(entry)"
            class="px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md dark:text-rose-300 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            Desativar
          </button>
        </footer>
      </article>
    </div>
  </div>
</template>
