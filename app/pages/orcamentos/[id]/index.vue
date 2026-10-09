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
 * A URL é o orçamento (atividade 047): `/orcamentos/6` abre o salvo, `/orcamentos/novo` o que
 * ainda não foi salvo (`?novo=1` começa um do zero). Aprovado ou rejeitado, ele é o que foi enviado:
 * a tela fica só leitura até alguém voltá-lo para pendente.
 *
 * Atividade 047: o orçamento é trabalhado "offline", só com o JSON. Ao abrir, ele vem inteiro —
 * cada produto com a configuração e o cálculo gravados — e nada vai ao motor: o custo só muda quando
 * o usuário recalcula um produto no assistente (passo de parâmetros, botão Calcular). O unitário tem
 * 3 casas, pode ser assumido pelo orçamentista, e a aprovação escolhe quais produtos o cliente quis.
 */
import { computed, ref, watch } from 'vue'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import { brl, coverSidesLabel, sheetsPerUnit } from '@/utils/quoteModel'
import { brlUnit, formatPercent, QUOTE_STATUS_LABELS } from '@/utils/pricing'
import { useQuoteCatalogs } from '@/composables/useQuoteCatalogs'
import { useUnitConverter } from '@/composables/useUnitConverter'
import { useClients } from '@/composables/useClients'
import { useQuotes } from '@/composables/useQuotes'
import { useProductCatalog } from '@/composables/useProductCatalog'
import { useProductTemplates } from '@/composables/useProductTemplates'
import { useToast } from '@/composables/useToast'
import { extractApiError } from '@/utils/apiError'
import { parseQuoteSegment, productPath, quotePath } from '@/utils/quoteRoutes'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import type { ClientSearchItem } from '@/types/Client'
import { useClientSearch } from '@/composables/useClientSearch'
import ClientSearchCombobox from '@/components/clients/ClientSearchCombobox.vue'
import QuickClientModal from '@/components/clients/QuickClientModal.vue'
import type { QuoteStatus } from '@/types/SavedQuote'
import TemplatePickerModal from '@/components/quotes/TemplatePickerModal.vue'
import TermOptionPickerModal from '@/components/quotes/TermOptionPickerModal.vue'
import { useQuoteTermOptions } from '@/composables/useQuoteTermOptions'
import { optionsOfKind, QUOTE_TERM_KINDS, quoteTermKindInfo } from '@/utils/quoteTermOptions'
import type { QuoteTermKind, QuoteTermOptionKeyValue } from '@/types/QuoteTermOption'

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

// Cliente que ainda não existe: cadastro rápido sem sair do orçamento, e ele já fica escolhido.
const quickClientOpen = ref(false)
const onClientCreated = (client: ClientSearchItem) => {
  quickClientOpen.value = false
  selectClient(client)
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

/** O orçamento da URL: o id salvo, ou nulo em `/orcamentos/novo`. */
const routeQuoteId = computed(() => parseQuoteSegment(route.params.id))

/**
 * Abre o orçamento da URL. O salvo vem do servidor uma vez só — de volta do assistente de produto, a
 * store já está com ele (e com as mexidas ainda não salvas). `novo` começa do zero quando pedido
 * (`?novo=1`, do menu e da lista) ou quando a store estava com um orçamento salvo.
 */
const openFromRoute = async () => {
  const id = routeQuoteId.value
  if (id == null) {
    if (route.query.novo != null || store.quoteId != null) {
      store.clearQuote()
      if (route.query.novo != null) router.replace(quotePath(null))
    }
  } else if (store.quoteId !== id) {
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
  resetApprovalSelection()
}

onMounted(async () => {
  catalogs.load()
  await openFromRoute()
  loadTermOptions()
})

// Trocar de orçamento sem sair da página (o menu "Novo orçamento" estando num salvo, por exemplo).
watch(() => [route.params.id, route.query.novo], () => openFromRoute())

/** Onde o usuário está: Orçamentos › Orçamento nº 6. */
const breadcrumb = computed(() => [
  { name: 'Orçamentos', href: '/orcamentos' },
  { name: store.quoteNumber ? `Orçamento nº ${store.quoteNumber}` : 'Novo orçamento' },
])

// ---- Preço praticado (atividade 044) ----
const onUnitPriceInput = (uid: string, event: Event) => {
  const raw = (event.target as HTMLInputElement).value
  store.setUnitPriceOverride(uid, raw === '' ? null : Number(raw))
}

// ---- Aprovar os produtos escolhidos (atividade 044) ----
/** Os produtos marcados para aprovar — nasce com todos: o caso comum é o cliente aceitar tudo. */
const approvalSelection = ref<string[]>([])
const resetApprovalSelection = () => {
  approvalSelection.value = store.products.map((p) => p.uid)
}
const toggleApproval = (uid: string) => {
  approvalSelection.value = approvalSelection.value.includes(uid)
    ? approvalSelection.value.filter((u) => u !== uid)
    : [...approvalSelection.value, uid]
}
const canSelectForApproval = computed(
  () => !!store.quoteId && store.quoteStatus === 'PENDING_APPROVAL' && store.products.length > 1,
)

// ---- Condições de fornecimento: opções da empresa (atividade 038, Orçamento > Configurações) ----
const termOptions = ref<QuoteTermOptionKeyValue[]>([])
const termPickerKind = ref<QuoteTermKind | null>(null)

/** Carrega as opções dos popups e, no orçamento novo, preenche as condições com as padrões. */
const loadTermOptions = async () => {
  try {
    termOptions.value = await useQuoteTermOptions().listKeyValues()
  } catch {
    // Sem as opções o orçamento segue com os campos livres; só o popup fica vazio.
    termOptions.value = []
  }
  store.applyConditionDefaults(termOptions.value)
}

const pickTermOption = (text: string) => {
  if (!termPickerKind.value) return
  store.conditions[quoteTermKindInfo(termPickerKind.value).field] = text
  termPickerKind.value = null
}

const openNew = () => {
  store.startNew()
  router.push(productPath(store.quoteId, 'novo'))
}

const openEdit = (uid: string) => {
  store.edit(uid)
  router.push(productPath(store.quoteId, store.products.findIndex((p) => p.uid === uid) + 1))
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
    router.push(productPath(store.quoteId, 'novo'))
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
  const covers = p.hasCovers ? ` + ${coverSidesLabel(p.coverSides)}` : ''
  const steps = p.steps.map((s) => catalogs.findActivity(s.activityId)?.value).filter(Boolean).join(' · ')
  const model = p.productModelName && p.typeName.trim() ? `${p.productModelName} > ${p.typeName.trim()}` : null
  return { model, structure: `${structure}${covers}`, steps: steps || 'sem etapas' }
}

// ---- Salvar ----
const saveBlockers = computed(() => {
  const list: string[] = []
  if (!store.clientId) list.push('Escolher o cliente')
  if (store.products.length === 0) list.push('Adicionar ao menos um produto')
  // Produto sem cálculo (de um orçamento anterior à 044): o servidor recusaria (atividade 047).
  const semCalculo = store.products.filter((p) => !store.costs[p.uid])
  if (semCalculo.length) {
    list.push(`Calcular no assistente: ${semCalculo.map((p) => p.name || 'produto sem nome').join(', ')}`)
  } else if (store.products.length && store.productsTotal == null) {
    list.push('Todos os produtos precisam de preço (percentuais abaixo de 100%)')
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
    if (routeQuoteId.value !== saved.id) router.replace(quotePath(saved.id))
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível salvar o orçamento.'))
  }
}

const setStatus = async (status: QuoteStatus) => {
  if (!store.quoteId) return
  changingStatus.value = true
  try {
    // Aprovar leva só os produtos marcados; os outros eram opções que o cliente não quis.
    const saved = await store.changeStatus(status, status === 'APPROVED' ? approvalSelection.value : undefined)
    if (status !== 'APPROVED') resetApprovalSelection()
    toast.success(`Orçamento nº ${saved.number}: ${QUOTE_STATUS_LABELS[saved.status].toLowerCase()}.`)
  } catch (err) {
    toast.error(extractApiError(err, 'Não foi possível mudar o status.'))
  } finally {
    changingStatus.value = false
  }
}

/**
 * A proposta imprime o orçamento SALVO. Com alteração pendente o botão fica travado — imprimir a
 * versão velha achando que é a da tela é o erro que se quer evitar.
 */
const printProposal = () => {
  if (!store.quoteId || store.dirty) return
  window.open(`/orcamentos/${store.quoteId}/proposta`, '_blank', 'noopener')
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
    <Breadcrumb :items="breadcrumb" />

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
      <template v-if="store.quoteStatus === 'APPROVED'">
        <strong>Orçamento aprovado — imutável.</strong> É o que o cliente aceitou: não se edita nem muda de
        status. Para renegociar, faça outro orçamento. Em cada produto, "Detalhar" mostra a configuração e o
        cálculo, só leitura.
      </template>
      <template v-else>
        Orçamento {{ QUOTE_STATUS_LABELS[store.quoteStatus!].toLowerCase() }} — não pode ser alterado. Volte-o para
        pendente para renegociar.
      </template>
    </div>


    <!-- Cliente e condições -->
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 class="text-base font-semibold text-slate-900 dark:text-white">Cliente</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-3">
        <div class="sm:col-span-2">
          <div class="mb-1.5 flex items-center justify-between gap-2">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Cliente <span class="text-rose-500">*</span>
            </label>
            <button
              v-if="!store.readOnly"
              type="button"
              @click="quickClientOpen = true"
              class="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <svg class="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" /></svg>
              Novo cliente
            </button>
          </div>
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
      </div>
    </section>

    <!-- Condições de fornecimento (atividade 038) — saem na proposta impressa; vazio não sai. -->
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 class="text-base font-semibold text-slate-900 dark:text-white">Condições de fornecimento</h2>
      <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Vão para a proposta impressa. O que ficar vazio não aparece.</p>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <!-- Cada campo: texto livre (condição exclusiva do cliente) + "Opções" com as cadastradas em Orçamento > Configurações. -->
        <div v-for="info in QUOTE_TERM_KINDS" :key="info.kind" :class="{ 'sm:col-span-2': info.maxLength > 200 }">
          <label :for="`quote-${info.field}`" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">{{ info.label }}</label>
          <div class="flex gap-2">
            <input
              :id="`quote-${info.field}`"
              v-model="store.conditions[info.field]"
              type="text"
              :maxlength="info.maxLength"
              :placeholder="info.placeholder"
              :disabled="store.readOnly"
              :class="inputClass"
            />
            <button
              v-if="!store.readOnly"
              type="button"
              class="shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              :title="`Escolher entre as opções de ${info.label.toLowerCase()}`"
              @click="termPickerKind = info.kind"
            >
              Opções
            </button>
          </div>
        </div>
        <div class="sm:col-span-2">
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
              <th v-if="canSelectForApproval" class="w-10 px-3 py-3 font-semibold" title="Produtos que o cliente aprovou">Aprovar</th>
              <th class="px-5 py-3 font-semibold">Produto</th>
              <th class="px-5 py-3 font-semibold">Formato</th>
              <th class="px-5 py-3 text-right font-semibold">Quantidade</th>
              <th class="px-5 py-3 text-right font-semibold">Folhas/un.</th>
              <th class="px-5 py-3 text-right font-semibold">Custo</th>
              <th class="px-5 py-3 text-right font-semibold">Com.+Imp.+Markup</th>
              <th class="px-5 py-3 text-right font-semibold">Unitário</th>
              <th class="px-5 py-3 text-right font-semibold">Preço</th>
              <th class="px-5 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
            <tr
              v-for="(p, index) in store.products"
              :key="p.uid"
              class="align-top hover:bg-slate-50/80 dark:hover:bg-slate-700/30"
              :class="{ 'opacity-60': store.quoteStatus === 'APPROVED' && store.products.some((x) => x.approved) && !p.approved }"
            >
              <td v-if="canSelectForApproval" class="px-3 py-3">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600"
                  :checked="approvalSelection.includes(p.uid)"
                  :aria-label="`Aprovar ${p.name}`"
                  @change="toggleApproval(p.uid)"
                />
              </td>
              <td class="px-5 py-3">
                <span class="block font-medium text-slate-900 dark:text-white">
                  {{ p.name || 'Sem nome' }}
                  <span v-if="store.quoteStatus === 'APPROVED' && p.approved" class="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">aprovado</span>
                  <span
                    v-if="!store.costs[p.uid]"
                    class="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
                    title="Orçamento anterior ao cálculo gravado: abra o produto e clique em Calcular"
                  >sem cálculo</span>
                </span>
                <span class="block text-[11px] font-medium text-slate-400 dark:text-slate-500">Produto {{ index + 1 }}</span>
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
                {{ store.productCosts[p.uid] != null ? brl(store.productCosts[p.uid]!) : '—' }}
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {{ store.productPrices[p.uid] ? formatPercent(store.productPrices[p.uid]!.totalPercent) : '—' }}
              </td>
              <!-- Unitário: o calculado (3 casas) e o PRATICADO, que o orçamentista pode assumir. -->
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                <template v-if="store.productUnitPrices[p.uid]">
                  <span class="block text-xs text-slate-500 dark:text-slate-400" title="Preço da fórmula ÷ quantidade, com 3 casas">
                    calculado {{ brlUnit(store.productUnitPrices[p.uid]!.calculated) }}
                  </span>
                  <input
                    v-if="!store.readOnly"
                    type="number"
                    min="0.001"
                    step="0.001"
                    inputmode="decimal"
                    :value="p.unitPriceOverride ?? ''"
                    :placeholder="store.productUnitPrices[p.uid]!.calculated.toFixed(3)"
                    :aria-label="`Preço unitário praticado de ${p.name}`"
                    class="mt-1 w-28 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-right text-sm tabular-nums text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    :class="{ 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/30': p.unitPriceOverride != null }"
                    @change="onUnitPriceInput(p.uid, $event)"
                  />
                  <span v-else class="block font-medium text-slate-900 dark:text-white">{{ brlUnit(store.productUnitPrices[p.uid]!.unit) }}</span>
                  <button
                    v-if="!store.readOnly && p.unitPriceOverride != null"
                    type="button"
                    class="mt-1 block w-full text-right text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    @click="store.setUnitPriceOverride(p.uid, null)"
                  >
                    Voltar ao calculado
                  </button>
                </template>
                <template v-else>—</template>
              </td>
              <td class="px-5 py-3 text-right font-medium tabular-nums text-slate-900 dark:text-white">
                {{ store.productUnitPrices[p.uid] ? brl(store.productUnitPrices[p.uid]!.total) : '—' }}
              </td>
              <td class="px-5 py-3 text-right">
                <!-- Só leitura (aprovado ou rejeitado): o produto se DETALHA — as abas do assistente, sem edição. -->
                <div v-if="store.readOnly" class="inline-flex items-center justify-end">
                  <button type="button" @click="openEdit(p.uid)" class="rounded-md px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-700">Detalhar</button>
                </div>
                <div v-else class="inline-flex flex-wrap items-center justify-end gap-1">
                  <button type="button" @click="openEdit(p.uid)" class="rounded-md px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-700">Editar</button>
                  <button type="button" @click="store.duplicate(p.uid)" class="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Duplicar</button>
                  <button type="button" @click="store.remove(p.uid)" class="rounded-md px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-slate-700">Remover</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totalizar (atividade 044). Recalcular saiu daqui na 047: o cálculo é do assistente do produto. -->
      <div
        v-if="store.products.length"
        class="flex flex-col gap-3 border-t border-slate-200 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700"
      >
        <label class="inline-flex items-start gap-2 text-slate-700 dark:text-slate-200">
          <input
            v-model="store.totalizeProposal"
            type="checkbox"
            :disabled="store.readOnly"
            class="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
          />
          <span>
            <span class="font-medium">Totalizar a proposta</span>
            <span class="block text-xs text-slate-500 dark:text-slate-400">
              Soma todos os produtos num total. Deixe desligado quando os produtos são opções (outra quantidade, outro papel).
            </span>
          </span>
        </label>
        <span v-if="!store.readOnly" class="text-xs text-slate-500 dark:text-slate-400 sm:max-w-xs sm:text-right">
          O preço de cada produto é o do último cálculo. Para refazê-lo com os preços de hoje, edite o
          produto e clique em Calcular.
        </span>
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
        <div v-if="store.approvedTotal != null" class="flex justify-between py-2">
          <dt class="text-slate-600 dark:text-slate-300">Aprovados pelo cliente</dt>
          <dd class="tabular-nums text-emerald-700 dark:text-emerald-300">{{ brl(store.approvedTotal) }}</dd>
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
            <button
              type="button"
              :disabled="changingStatus || store.dirty || (canSelectForApproval && approvalSelection.length === 0)"
              :title="store.dirty ? 'Salve as alterações antes de aprovar' : undefined"
              @click="setStatus('APPROVED')"
              class="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-slate-700"
            >
              {{
                canSelectForApproval && approvalSelection.length < store.products.length
                  ? `Aprovar selecionados (${approvalSelection.length})`
                  : 'Aprovar'
              }}
            </button>
            <button type="button" :disabled="changingStatus" @click="setStatus('REJECTED')" class="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-slate-700">
              Rejeitar
            </button>
          </template>
          <!-- O aprovado é imutável (atividade 047): só o rejeitado volta para pendente. -->
          <button v-else-if="store.quoteStatus === 'REJECTED'" type="button" :disabled="changingStatus" @click="setStatus('PENDING_APPROVAL')" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
            Voltar para pendente
          </button>
        </template>
        <button
          v-if="store.quoteId"
          type="button"
          :disabled="store.dirty"
          :title="store.dirty ? 'Salve as alterações para imprimir a proposta atualizada' : undefined"
          @click="printProposal"
          class="inline-flex items-center gap-2 rounded-lg border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-slate-700"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-12 0v4h12v-4M6 14h12" /></svg>
          Imprimir proposta
        </button>
        <span v-if="store.quoteId && store.dirty" class="self-center text-xs text-amber-700 dark:text-amber-300">
          Salve para imprimir a proposta atualizada.
        </span>
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

    <TermOptionPickerModal
      :is-open="!!termPickerKind"
      :title="termPickerKind ? quoteTermKindInfo(termPickerKind).label : ''"
      :options="termPickerKind ? optionsOfKind(termOptions, termPickerKind) : []"
      :current="termPickerKind ? store.conditions[quoteTermKindInfo(termPickerKind).field] : null"
      @pick="pickTermOption"
      @close="termPickerKind = null"
    />

    <TemplatePickerModal
      :is-open="pickerOpen"
      :templates="productCatalog.templates.value"
      :loading="pickerLoading"
      @pick="pickTemplate"
      @close="pickerOpen = false"
    />

    <QuickClientModal :is-open="quickClientOpen" @close="quickClientOpen = false" @created="onClientCreated" />
  </div>
</template>
