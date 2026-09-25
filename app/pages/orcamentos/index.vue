<script setup lang="ts">
/**
 * ORÇAMENTOS SALVOS (atividade 037).
 *
 * Grade por número (o mais recente primeiro), com filtro de status. Abrir leva ao editor; aprovar,
 * rejeitar e voltar para pendente acontecem aqui mesmo, sem abrir. O aprovado não se exclui — vai
 * virar nota e ordem de serviço.
 */
import { computed, ref } from 'vue'
import { useQuotes } from '@/composables/useQuotes'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import { brl } from '@/utils/quoteModel'
import { QUOTE_STATUS_LABELS } from '@/utils/pricing'
import type { QuoteStatus, SavedQuoteRow } from '@/types/SavedQuote'

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const toast = useToast()
const quotes = useQuotes()

const PAGE_SIZE = 20
const items = ref<SavedQuoteRow[]>([])
const page = ref(0)
const totalItems = ref(0)
const totalPages = ref(0)
const status = ref<QuoteStatus | ''>('')
const loading = ref(false)
const listError = ref<string | null>(null)
const busyId = ref<number | null>(null)

const hasCompany = computed(() => !!auth.activeCompanyId)

const refresh = async () => {
  if (!hasCompany.value) return
  loading.value = true
  listError.value = null
  try {
    const res = await quotes.listPage({ page: page.value, size: PAGE_SIZE, status: status.value || null })
    items.value = res.items
    totalItems.value = res.totalItems
    totalPages.value = res.totalPages
  } catch (err) {
    listError.value = extractApiError(err, 'Falha ao carregar os orçamentos.')
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
watch(status, () => { page.value = 0; refresh() })

const goToPage = (next: number) => {
  if (next < 0 || next >= totalPages.value) return
  page.value = next
  refresh()
}

const setStatus = async (row: SavedQuoteRow, next: QuoteStatus) => {
  busyId.value = row.id
  try {
    await quotes.changeStatus(row.id, next)
    toast.success(`Orçamento nº ${row.number}: ${QUOTE_STATUS_LABELS[next].toLowerCase()}.`)
    await refresh()
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível mudar o status.'))
  } finally {
    busyId.value = null
  }
}

const handleDelete = async (row: SavedQuoteRow) => {
  if (!window.confirm(`Excluir o orçamento nº ${row.number} (${row.clientName})?`)) return
  busyId.value = row.id
  try {
    await quotes.remove(row.id)
    toast.success(`Orçamento nº ${row.number} excluído.`)
    if (items.value.length === 1 && page.value > 0) page.value -= 1
    await refresh()
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível excluir o orçamento.'))
  } finally {
    busyId.value = null
  }
}

const statusClass = (s: QuoteStatus) =>
  ({
    PENDING_APPROVAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    REJECTED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  })[s]

const dateOf = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Orçamentos</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Orçamentos salvos, do mais recente ao mais antigo.</p>
      </div>
      <NuxtLink v-if="hasCompany" to="/orcamentos/novo" class="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Novo orçamento
      </NuxtLink>
    </header>

    <div v-if="!hasCompany" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
      Selecione uma empresa para ver os orçamentos.
    </div>

    <template v-else>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <label class="mr-2 text-sm text-slate-700 dark:text-slate-200" for="status-filter">Status</label>
        <select id="status-filter" v-model="status" class="rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white">
          <option value="">Todos</option>
          <option v-for="(label, key) in QUOTE_STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>

      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div v-if="loading" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando orçamentos...</div>
        <div v-else-if="listError" class="bg-rose-50 p-6 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">{{ listError }}</div>
        <div v-else-if="items.length === 0" class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Nenhum orçamento.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50/50 text-xs uppercase text-slate-700 dark:bg-slate-700/50 dark:text-slate-300">
              <tr>
                <th class="px-5 py-3 font-semibold">Nº</th>
                <th class="px-5 py-3 font-semibold">Cliente</th>
                <th class="px-5 py-3 text-right font-semibold">Produtos</th>
                <th class="px-5 py-3 text-right font-semibold">Total</th>
                <th class="px-5 py-3 font-semibold">Status</th>
                <th class="px-5 py-3 font-semibold">Atualizado</th>
                <th class="px-5 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
              <tr v-for="row in items" :key="row.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                <td class="px-5 py-3 font-semibold tabular-nums text-slate-900 dark:text-white">{{ row.number }}</td>
                <td class="px-5 py-3 text-slate-800 dark:text-slate-100">{{ row.clientName }}</td>
                <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{{ row.productCount }}</td>
                <td class="px-5 py-3 text-right font-medium tabular-nums text-slate-900 dark:text-white">{{ brl(row.total) }}</td>
                <td class="px-5 py-3">
                  <span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusClass(row.status)">{{ QUOTE_STATUS_LABELS[row.status] }}</span>
                </td>
                <td class="px-5 py-3 text-slate-600 dark:text-slate-300">{{ dateOf(row.updatedAt) }}</td>
                <td class="px-5 py-3 text-right">
                  <div class="inline-flex flex-wrap items-center justify-end gap-1">
                    <NuxtLink :to="{ path: '/orcamentos/editar', query: { id: row.id } }" class="rounded-md px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-700">Abrir</NuxtLink>
                    <a :href="`/orcamentos/${row.id}/proposta`" target="_blank" rel="noopener" class="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Proposta</a>
                    <template v-if="row.status === 'PENDING_APPROVAL'">
                      <button type="button" :disabled="busyId === row.id" class="rounded-md px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-slate-700" @click="setStatus(row, 'APPROVED')">Aprovar</button>
                      <button type="button" :disabled="busyId === row.id" class="rounded-md px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-slate-700" @click="setStatus(row, 'REJECTED')">Rejeitar</button>
                    </template>
                    <button v-else type="button" :disabled="busyId === row.id" class="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700" @click="setStatus(row, 'PENDING_APPROVAL')">Voltar p/ pendente</button>
                    <button v-if="row.status !== 'APPROVED'" type="button" :disabled="busyId === row.id" class="rounded-md px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-slate-700" @click="handleDelete(row)">Excluir</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!loading && !listError && totalPages > 1" class="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-700/50">
          <span class="text-xs text-slate-500 dark:text-slate-400">{{ totalItems }} orçamento(s) — página {{ page + 1 }} de {{ totalPages }}</span>
          <div class="flex gap-2">
            <button type="button" :disabled="page === 0" class="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700" @click="goToPage(page - 1)">Anterior</button>
            <button type="button" :disabled="page + 1 >= totalPages" class="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700" @click="goToPage(page + 1)">Próxima</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
