<script setup lang="ts">
/**
 * EDITOR DO ORÇAMENTO (atividade 034, salvo desde a 037).
 *
 * O orçamento é o CLIENTE, a lista de PRODUTOS com o preço de cada um e a comissão de agência sobre
 * o total. Produto entra de dois jeitos:
 *   - "Adicionar produto novo": o assistente vazio (/orcamentos/produto);
 *   - "Adicionar do catálogo": o assistente já com a estrutura, as etapas e os impostos de um
 *     Modelo de Produto salvo.
 *
 * `?id=` abre um orçamento salvo. Aprovado ou rejeitado, ele é o que foi enviado: a tela fica só
 * leitura até alguém voltá-lo para pendente.
 */
import { computed, ref } from 'vue'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import { brl, sheetsPerUnit } from '@/utils/quoteModel'
import { formatPercent, QUOTE_STATUS_LABELS } from '@/utils/pricing'
import { useQuoteCatalogs } from '@/composables/useQuoteCatalogs'
import { useUnitConverter } from '@/composables/useUnitConverter'
import { useClients } from '@/composables/useClients'
import { useQuotes } from '@/composables/useQuotes'
import { useProductCatalog } from '@/composables/useProductCatalog'
import { useProductTemplates } from '@/composables/useProductTemplates'
import { useToast } from '@/composables/useToast'
import { extractApiError } from '@/utils/apiError'
import type { ClientSearchItem } from '@/types/Client'
import { useClientSearch } from '@/composables/useClientSearch'
import ClientSearchCombobox from '@/components/clients/ClientSearchCombobox.vue'
import type { QuoteStatus } from '@/types/SavedQuote'
import TemplatePickerModal from '@/components/quotes/TemplatePickerModal.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const store = useQuoteDraftStore()
const { format } = useUnitConverter()
const catalogs = useQuoteCatalogs()
const quotesApi = useQuotes()
const toast = useToast()
const productCatalog = useProductCatalog()
const productTemplates = useProductTemplates()

// Cliente por BUSCA (são muitos): o escolhido fica com nome, e-mail e documento à vista.
const clientSearch = useClientSearch()
const selectedClient = ref<ClientSearchItem | null>(null)

const selectClient = (client: ClientSearchItem | null) => {
  selectedClient.value = client
  store.clientId = client?.id ?? null
}

/** Orçamento aberto (ou de volta do assistente) com cliente: busca os dados para exibir. */
const loadSelectedClient = async () => {
  const id = store.clientId
  if (!id || selectedClient.value?.id === id) return
  try {
    const c = await useClients().getById(id)
    selectedClient.value = {
      id: c.id,
      personType: c.personType,
      name: c.name,
      corporateName: c.corporateName ?? null,
      email: c.email ?? null,
      document: c.document,
    }
  } catch {
    selectedClient.value = null
  }
}
const loadingQuote = ref(false)
const changingStatus = ref(false)

onMounted(async () => {
  catalogs.load()

  const id = Number(route.query.id)
  if (id && store.quoteId !== id) {
    loadingQuote.value = true
    try {
      store.loadSaved(await quotesApi.getById(id))
    } catch (err) {
      toast.error(extractApiError(err, 'Não foi possível abrir o orçamento.'))
    } finally {
      loadingQuote.value = false
    }
  }
  loadSelectedClient()
  // Produto sem custo (orçamento recém-aberto): recalcula tudo de uma vez, com o catálogo de agora.
  if (store.products.some((p) => !store.costs[p.uid])) await store.recalculateAll()
})

const openNew = () => {
  store.startNew()
  router.push('/orcamentos/produto')
}

const openEdit = (uid: string) => {
  store.edit(uid)
  router.push('/orcamentos/produto')
}

// ---- Adicionar do catálogo ----
const pickerOpen = ref(false)
const pickerLoading = ref(false)

const openPicker = async () => {
  pickerOpen.value = true
  pickerLoading.value = true
  try {
    await productCatalog.reloadTemplates()
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível carregar o catálogo.'))
  } finally {
    pickerLoading.value = false
  }
}

const pickTemplate = async (templateId: number) => {
  try {
    await catalogs.load()
    store.startFromTemplate(await productTemplates.getById(templateId))
    pickerOpen.value = false
    router.push('/orcamentos/produto')
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível abrir o modelo.'))
  }
}

/** Resumo de uma linha: Modelo > Tipo + estrutura + etapas, para a lista dizer o que o produto é. */
const describe = (index: number) => {
  const p = store.products[index]!
  const structure =
    p.structure === 'BLADE'
      ? `${p.blades} lâmina(s)`
      : `${p.sets} jogos × ${p.vias} vias`
  const covers = p.hasCovers ? ` + ${p.coverCount} capa(s)` : ''
  const steps = p.steps.map((s) => catalogs.findActivity(s.activityId)?.value).filter(Boolean).join(' · ')
  const model = p.productModelName && p.typeName.trim() ? `${p.productModelName} > ${p.typeName.trim()}` : null
  return { model, structure: `${structure}${covers}`, steps: steps || 'sem etapas' }
}

// ---- Salvar ----
const saveBlockers = computed(() => {
  const list: string[] = []
  if (!store.clientId) list.push('Escolher o cliente')
  if (store.products.length === 0) list.push('Adicionar ao menos um produto')
  if (store.products.length && store.productsTotal == null) {
    list.push('Todos os produtos precisam de preço (custo calculado e percentuais abaixo de 100%)')
  }
  if (!(store.agencyCommissionPercent >= 0 && store.agencyCommissionPercent <= 100)) {
    list.push('Comissão de agência entre 0 e 100%')
  }
  return list
})

const save = async () => {
  if (saveBlockers.value.length || store.readOnly) return
  try {
    const saved = await store.saveQuote()
    toast.success(`Orçamento nº ${saved.number} salvo.`)
    if (Number(route.query.id) !== saved.id) router.replace({ path: '/orcamentos/editar', query: { id: saved.id } })
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível salvar o orçamento.'))
  }
}

const setStatus = async (status: QuoteStatus) => {
  if (!store.quoteId) return
  changingStatus.value = true
  try {
    const saved = await quotesApi.changeStatus(store.quoteId, status)
    store.quoteStatus = saved.status
    toast.success(`Orçamento nº ${saved.number}: ${QUOTE_STATUS_LABELS[saved.status].toLowerCase()}.`)
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível mudar o status.'))
  } finally {
    changingStatus.value = false
  }
}

const statusClass = (status: QuoteStatus) =>
  ({
    PENDING_APPROVAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    REJECTED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  })[status]

const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
            {{ store.quoteNumber ? `Orçamento nº ${store.quoteNumber}` : 'Novo orçamento' }}
          </h1>
          <span v-if="store.quoteStatus" class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusClass(store.quoteStatus)">
            {{ QUOTE_STATUS_LABELS[store.quoteStatus] }}
          </span>
        </div>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          O cliente, os produtos com o preço de cada um e a comissão de agência sobre o total.
        </p>
      </div>
      <div v-if="!store.readOnly" class="flex flex-wrap gap-2">
        <button
          type="button"
          @click="openPicker"
          class="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-300 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-slate-700"
        >
          Adicionar do catálogo
        </button>
        <button
          type="button"
          @click="openNew"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Adicionar produto novo
        </button>
      </div>
    </header>

    <p v-if="loadingQuote" class="text-sm text-slate-500 dark:text-slate-400">Carregando o orçamento...</p>

    <div
      v-if="store.readOnly"
      class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
    >
      Orçamento {{ QUOTE_STATUS_LABELS[store.quoteStatus!].toLowerCase() }} — não pode ser alterado. Volte-o para
      pendente para renegociar.
    </div>

    <div
      v-if="store.calcError"
      class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200"
    >
      <strong>Não foi possível recalcular.</strong> {{ store.calcError }}
    </div>

    <!-- Cliente e condições -->
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 class="text-base font-semibold text-slate-900 dark:text-white">Cliente</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-3">
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Cliente <span class="text-rose-500">*</span>
          </label>
          <ClientSearchCombobox
            :selected="selectedClient"
            :results="clientSearch.results.value"
            :loading="clientSearch.loading.value"
            :error="clientSearch.error.value"
            :disabled="store.readOnly"
            @search="clientSearch.search"
            @select="selectClient"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Comissão de agência (%)</label>
          <input v-model.number="store.agencyCommissionPercent" type="number" min="0" max="100" step="0.01" :disabled="store.readOnly" :class="inputClass" />
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Aplicada sobre o total dos produtos.</p>
        </div>
        <div class="sm:col-span-3">
          <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Observações</label>
          <textarea v-model="store.notes" rows="2" maxlength="2000" :disabled="store.readOnly" :class="inputClass" />
        </div>
      </div>
    </section>

    <!-- Produtos -->
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div v-if="store.products.length === 0" class="px-6 py-12 text-center">
        <p class="text-sm text-slate-500 dark:text-slate-400">Nenhum produto no orçamento ainda.</p>
        <div class="mt-4 flex justify-center gap-2">
          <button type="button" @click="openPicker" class="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-slate-700">
            Do catálogo
          </button>
          <button type="button" @click="openNew" class="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-slate-700">
            Produto novo
          </button>
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50/50 text-xs uppercase text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
            <tr>
              <th class="px-5 py-3 font-semibold">Produto</th>
              <th class="px-5 py-3 font-semibold">Formato</th>
              <th class="px-5 py-3 text-right font-semibold">Quantidade</th>
              <th class="px-5 py-3 text-right font-semibold">Folhas/un.</th>
              <th class="px-5 py-3 text-right font-semibold">Custo</th>
              <th class="px-5 py-3 text-right font-semibold">Com.+Imp.+Markup</th>
              <th class="px-5 py-3 text-right font-semibold">Preço</th>
              <th class="px-5 py-3 text-right font-semibold">Unitário</th>
              <th v-if="!store.readOnly" class="px-5 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
            <tr v-for="(p, index) in store.products" :key="p.uid" class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
              <td class="px-5 py-3">
                <span class="block font-medium text-slate-900 dark:text-white">{{ p.name || 'Sem nome' }}</span>
                <span v-if="describe(index).model" class="block text-xs font-medium text-indigo-600 dark:text-indigo-300">{{ describe(index).model }}</span>
                <span class="block text-xs text-slate-500 dark:text-slate-400">{{ describe(index).structure }}</span>
                <span class="block truncate text-xs text-slate-400 dark:text-slate-500">{{ describe(index).steps }}</span>
              </td>
              <td class="px-5 py-3 text-slate-700 dark:text-slate-200">
                {{ format(p.widthMm) }} × {{ format(p.heightMm) }}
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {{ (p.quantity ?? 0).toLocaleString('pt-BR') }}
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{{ sheetsPerUnit(p) }}</td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {{ store.costs[p.uid] ? brl(store.costs[p.uid]!.totalCost) : '—' }}
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {{ store.productPrices[p.uid] ? formatPercent(store.productPrices[p.uid]!.totalPercent) : '—' }}
              </td>
              <td class="px-5 py-3 text-right font-medium tabular-nums text-slate-900 dark:text-white">
                {{ store.productPrices[p.uid]?.price != null ? brl(store.productPrices[p.uid]!.price!) : '—' }}
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {{
                  store.productPrices[p.uid]?.price != null && p.quantity
                    ? brl(store.productPrices[p.uid]!.price! / p.quantity)
                    : '—'
                }}
              </td>
              <td v-if="!store.readOnly" class="px-5 py-3 text-right">
                <div class="inline-flex items-center gap-1">
                  <button type="button" @click="openEdit(p.uid)" class="rounded-md px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-700">Editar</button>
                  <button type="button" @click="store.duplicate(p.uid)" class="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Duplicar</button>
                  <button type="button" @click="store.remove(p.uid)" class="rounded-md px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-slate-700">Remover</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totais -->
      <dl v-if="store.products.length" class="ml-auto max-w-sm divide-y divide-slate-100 border-t border-slate-200 px-5 py-2 text-sm dark:divide-slate-700/60 dark:border-slate-700">
        <div class="flex justify-between py-2">
          <dt class="text-slate-600 dark:text-slate-300">Custo total</dt>
          <dd class="tabular-nums text-slate-700 dark:text-slate-200">{{ brl(store.quoteTotal) }}</dd>
        </div>
        <div class="flex justify-between py-2">
          <dt class="text-slate-600 dark:text-slate-300">Total dos produtos</dt>
          <dd class="tabular-nums text-slate-900 dark:text-white">{{ store.productsTotal != null ? brl(store.productsTotal) : '—' }}</dd>
        </div>
        <div class="flex justify-between py-2">
          <dt class="text-slate-600 dark:text-slate-300">Comissão de agência ({{ formatPercent(store.agencyCommissionPercent) }})</dt>
          <dd class="tabular-nums text-slate-900 dark:text-white">{{ brl(store.agencyCommission) }}</dd>
        </div>
        <div class="flex items-baseline justify-between py-3">
          <dt class="font-semibold text-slate-900 dark:text-white">Total do orçamento</dt>
          <dd class="text-xl font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
            {{ store.grandTotal != null ? brl(store.grandTotal) : '—' }}
          </dd>
        </div>
      </dl>
    </section>

    <!-- Ações -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex flex-wrap gap-2">
        <template v-if="store.quoteId">
          <template v-if="store.quoteStatus === 'PENDING_APPROVAL'">
            <button type="button" :disabled="changingStatus" @click="setStatus('APPROVED')" class="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-slate-700">
              Aprovar
            </button>
            <button type="button" :disabled="changingStatus" @click="setStatus('REJECTED')" class="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-slate-700">
              Rejeitar
            </button>
          </template>
          <button v-else type="button" :disabled="changingStatus" @click="setStatus('PENDING_APPROVAL')" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
            Voltar para pendente
          </button>
        </template>
        <button v-if="!store.quoteId && store.products.length" type="button" @click="store.clearQuote()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
          Limpar orçamento
        </button>
      </div>

      <div v-if="!store.readOnly" class="flex flex-col items-end gap-2">
        <button
          type="button"
          :disabled="saveBlockers.length > 0 || store.saving"
          @click="save"
          class="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ store.saving ? 'Salvando...' : store.quoteId ? 'Salvar alterações' : 'Salvar orçamento' }}
        </button>
        <ul v-if="saveBlockers.length" class="text-right text-xs text-amber-700 dark:text-amber-300">
          <li v-for="b in saveBlockers" :key="b">{{ b }}</li>
        </ul>
      </div>
    </div>

    <TemplatePickerModal
      :is-open="pickerOpen"
      :templates="productCatalog.templates.value"
      :loading="pickerLoading"
      @pick="pickTemplate"
      @close="pickerOpen = false"
    />
  </div>
</template>
