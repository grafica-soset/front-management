<script setup lang="ts">
/**
 * ASSISTENTE DE PRODUTO DO ORÇAMENTO (atividade 034).
 *
 * Rota própria em vez de modal: o passo 3 precisa de largura para comparar impressoras, a
 * configuração dura minutos e o usuário vai e volta entre passos. Um modal com quatro passos
 * empurraria tudo isso para dentro de uma caixa com rolagem própria.
 *
 * Layout: passo a passo no topo, um passo por vez no corpo e o trilho de preço fixo à direita.
 *
 * A URL diz onde o usuário está (atividade 047): `/orcamentos/6/produto/1` é o produto 1 do
 * orçamento 6, `/orcamentos/novo/produto/novo` um produto novo num orçamento ainda não salvo. O
 * breadcrumb leva de volta ao orçamento.
 *
 * O CÁLCULO É SÓ NO BOTÃO (atividade 047). Abrir o produto não calcula — ele vem com o cálculo
 * gravado — e mexer também não. Do passo 3 em diante há o botão Calcular; mexeu depois de calcular, o
 * cálculo fica desatualizado, o resumo avisa em vermelho e o produto não salva até calcular de novo.
 *
 * DETALHAR (atividade 047): no orçamento aprovado — imutável — ou rejeitado, o produto abre nas mesmas
 * abas, na mesma ordem de campos, só leitura: inclusive impostos e resumo. Sem Calcular, sem Salvar.
 */
import { computed, onMounted, provide, ref } from 'vue'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import { useQuoteCatalogs } from '@/composables/useQuoteCatalogs'
import { useQuotes } from '@/composables/useQuotes'
import { useToast } from '@/composables/useToast'
import { extractApiError } from '@/utils/apiError'
import { CALC_BLOCKERS_KEY, QUOTE_READONLY_KEY } from '@/utils/quoteCalc'
import { parseProductSegment, parseQuoteSegment, productPath, quotePath } from '@/utils/quoteRoutes'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import CalculateButton from '@/components/quotes/CalculateButton.vue'
import QuoteStepper from '@/components/quotes/QuoteStepper.vue'
import QuotePriceRail from '@/components/quotes/QuotePriceRail.vue'
import StepProductDefinition from '@/components/quotes/StepProductDefinition.vue'
import StepActivities from '@/components/quotes/StepActivities.vue'
import StepParameters from '@/components/quotes/StepParameters.vue'
import StepSummary from '@/components/quotes/StepSummary.vue'
import StepTaxesMarkup from '@/components/quotes/StepTaxesMarkup.vue'
import { priceFromCost, pricingIssues } from '@/utils/pricing'
import {
  coverLabel,
  coverPositions,
  coverageIssues,
  inkIssues,
  isSheetPrinted,
  platesForMachine,
  printingSteps,
  setupFor,
  sheetsPerUnit,
} from '@/utils/quoteModel'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const store = useQuoteDraftStore()
const catalogs = useQuoteCatalogs()
const toast = useToast()

const STEPS = [
  { key: 'produto', label: 'Formato e papéis' },
  { key: 'atividades', label: 'Atividades' },
  { key: 'parametros', label: 'Parâmetros' },
  // Atividade 037: impostos, comissão e markup — daqui sai o preço de venda.
  { key: 'impostos', label: 'Impostos e Markup' },
  { key: 'resumo', label: 'Resumo' },
]

const current = ref(0)

/** Abrindo: carrega o orçamento da URL, se a store não está com ele, e abre o produto. */
const opening = ref(true)

/**
 * Põe no assistente o produto da URL. Volta do orçamento com o rascunho já aberto (o "Editar" da
 * lista ou um modelo do catálogo) não reabre nada — só um recarregar da página, ou um link direto,
 * precisa montar o rascunho de novo.
 */
const openFromRoute = async () => {
  const quoteId = parseQuoteSegment(route.params.id)
  if (quoteId != null && store.quoteId !== quoteId) {
    try {
      store.loadSaved(await useQuotes().getById(quoteId))
    } catch (err) {
      toast.error(extractApiError(err, 'Não foi possível abrir o orçamento.'))
      await router.replace('/orcamentos')
      return
    }
  } else if (quoteId == null && store.quoteId != null) {
    // "novo" na URL, mas a store está num orçamento salvo: a URL certa é a dele.
    const n = parseProductSegment(route.params.n)
    await router.replace(productPath(store.quoteId, n ?? 'novo'))
  }

  const position = parseProductSegment(route.params.n)
  if (position == null) {
    // Orçamento só leitura não ganha produto novo.
    if (store.readOnly) {
      await router.replace(quotePath(store.quoteId))
      return
    }
    if (!store.draft || store.editingUid != null) store.startNew()
    return
  }
  const target = store.products[position - 1]
  if (!target) {
    toast.error(`O orçamento não tem o produto ${position}.`)
    await router.replace(quotePath(store.quoteId))
    return
  }
  if (!store.draft || store.editingUid !== target.uid) store.edit(target.uid)
}

onMounted(async () => {
  // RECARREGA os catálogos, não aproveita o que já estava em memória: máquinas, insumos e
  // atividades são editados em OUTRA tela, e o assistente fica aberto por muito tempo. Quem acabou
  // de arrumar as chapas da impressora volta para cá e precisa ver a lista nova — com o cache da
  // sessão, o orçamento seguia oferecendo as chapas de antes da edição. São cinco listas curtas.
  await Promise.all([catalogs.load(true), openFromRoute()])
  opening.value = false
})

/** A posição do produto no orçamento (1, 2...), ou nula para o produto novo. */
const position = computed(() => {
  const index = store.products.findIndex((p) => p.uid === store.editingUid)
  return index >= 0 ? index + 1 : null
})

/** Orçamentos › Orçamento nº 6 › Produto 1 — Laminas de Pagamento. */
const breadcrumb = computed(() => [
  { name: 'Orçamentos', href: '/orcamentos' },
  { name: store.quoteNumber ? `Orçamento nº ${store.quoteNumber}` : 'Novo orçamento', href: quotePath(store.quoteId) },
  {
    name: `${position.value ? `Produto ${position.value}` : 'Novo produto'}${product.value?.name ? ` — ${product.value.name}` : ''}`,
  },
])

const product = computed(() => store.draft)

/**
 * O que o MOTOR precisa para calcular. A tinta não entra aqui de propósito: ela é escolhida depois
 * da impressora, e a impressora vem justamente do cálculo — exigi-la antes trancaria o usuário num
 * ciclo, com a tela pedindo tinta e as opções de máquina nunca aparecendo.
 */
const calcBlockers = computed(() => {
  const p = product.value
  if (!p) return ['Abrir um produto']
  const list: string[] = []
  if (!p.name.trim()) list.push('Dar um nome ao produto')
  if (!p.widthMm || !p.heightMm) list.push('Informar a dimensão final')
  if (!p.quantity) list.push('Informar a quantidade')
  if (p.sheets.some((s) => s.paperTypeId == null)) list.push('Escolher o papel de cada via/lâmina')
  // Sem essa resposta o motor não sabe quantas chapas cobrar, e chutar erra o preço para um dos
  // dois lados. Só é exigida quando há mais de uma via/lâmina — abaixo disso não há o que comparar.
  const viasOuLaminas = p.structure === 'BLOCK' ? p.vias : p.blades
  if (viasOuLaminas >= 2 && p.identicalArtwork === null) {
    list.push(`Informar se as ${p.structure === 'BLOCK' ? 'vias' : 'lâminas'} são iguais`)
  }
  // Numeração: desde a atividade 046 é um interruptor que nasce desligado — não há o que informar.
  // Capa (atividade 040): impressa paga chapa, acerto e tinta; sem impressão, só papel. Pela mesma
  // razão, nenhum dos dois pode ser assumido no silêncio.
  if (p.hasCovers) {
    for (const position of coverPositions(p.coverSides)) {
      if (p.coverPrinted[position] == null) {
        list.push(`Informar se a ${coverLabel(position).toLowerCase()} tem impressão`)
      }
    }
  }
  if (p.steps.length === 0) list.push('Ativar ao menos uma atividade')

  // A CHAPA da impressão: com mais de uma cadastrada na impressora, a escolha é de preço e é do
  // usuário — o motor não tem como adivinhar qual matriz a gráfica vai gravar. Com uma só, a tela
  // já a marca sozinha; sem nenhuma, o aviso é outro (cadastro da impressora).
  printingSteps(p).forEach((step, index) => {
    const ordinal = printingSteps(p).length > 1 ? ` (${index + 1}ª impressão)` : ''
    const machine = catalogs.findMachine(step.printing?.machineId)
    const chapas = platesForMachine(machine, catalogs.plates.value)
    if (chapas.length > 1 && step.printing?.plateSupplyId == null) {
      list.push(`Escolher a chapa da impressão${ordinal}`)
    }
  })

  // Os dois cortes (antes da impressão e depois dela — refile ou corte e vinco) NÃO travam mais o
  // cálculo (atividade 046): o motor calcula e avisa o que falta, no resumo.
  const impressoes = printingSteps(p)

  // Corte e vinco (atividade 046): a quantidade de bocas (facas) é o consumo da faca — tem que ser
  // perguntada, não assumida.
  const semBocas = p.steps.some(
    (s) => catalogs.paramKindOf(catalogs.findActivity(s.activityId)) === 'DIE_CUTTING' && !(s.parameters.dieCount! > 0),
  )
  if (semBocas) list.push('Informar a quantidade de bocas (facas) do corte e vinco')

  impressoes.forEach((step, index) => {
    const ordinal = impressoes.length > 1 ? ` (${index + 1}ª impressão)` : ''
    const printed = p.sheets.filter((sheet) => isSheetPrinted(sheet, setupFor(step, sheet)))
    if (printed.length === 0) {
      list.push(`Informar as cores de ao menos uma via/lâmina${ordinal}`)
      return
    }
    if (printed.some((sheet) => coverageIssues(setupFor(step, sheet)).length > 0)) {
      list.push(`Informar a taxa de cobertura de cada face impressa${ordinal}`)
    }
  })
  return list
})

/**
 * O que falta para SALVAR: o que o motor precisa, mais a tinta de cada cor — que só se escolhe
 * depois da máquina. O preço já aparece antes disso; o que a tinta segura é o fechamento do
 * produto, porque sem ela o custo de tinta sai zerado.
 */
const blockers = computed(() => {
  const p = product.value
  if (!p) return calcBlockers.value
  const list = [...calcBlockers.value]
  const impressoes = printingSteps(p)
  impressoes.forEach((step, index) => {
    const ordinal = impressoes.length > 1 ? ` (${index + 1}ª impressão)` : ''
    const printed = p.sheets.filter((sheet) => isSheetPrinted(sheet, setupFor(step, sheet)))
    if (printed.some((sheet) => inkIssues(setupFor(step, sheet)).length > 0)) {
      list.push(`Selecionar uma tinta para cada cor${ordinal}`)
    }
    if (!step.printing?.perSheet && !step.printing?.machineId) {
      list.push(`Escolher a impressora${ordinal}`)
    }
  })
  return list
})

// O botão Calcular, onde quer que esteja, só calcula quando o motor tem o que precisa.
provide(CALC_BLOCKERS_KEY, calcBlockers)

/** Detalhar: orçamento aprovado (imutável) ou rejeitado — tudo só leitura (atividade 047). */
const readOnly = computed(() => store.readOnly)
provide(QUOTE_READONLY_KEY, readOnly)

/** O cálculo não corresponde à configuração (ou não existe): o resumo avisa e o salvar trava. */
const stale = computed(() => store.draftStale)

/** Percentuais que o servidor recusaria (atividade 037) — seguram o salvar, não os parâmetros. */
const priceBlockers = computed(() => (product.value ? pricingIssues(product.value.pricing, product.value.taxes) : []))
const allBlockers = computed(() => {
  const list = [...blockers.value, ...priceBlockers.value]
  if (calcBlockers.value.length === 0 && stale.value) {
    list.unshift(store.draftCost ? 'Calcular de novo: os parâmetros mudaram depois do cálculo' : 'Calcular o produto (passo 3)')
  }
  return list
})

/** Preço de venda do produto em edição, para o trilho. */
const price = computed(() =>
  store.draftCost && product.value
    ? priceFromCost(store.draftCost.totalCost, product.value.pricing, product.value.taxes)
    : null,
)

/** Cada passo só libera o seguinte quando tem o que ele precisa. */
const stepValid = computed(() => {
  const p = product.value
  if (!p) return [false, false, false, false, false]
  const step1 = !!p.name.trim() && !!p.widthMm && !!p.heightMm && !!p.quantity && p.sheets.every((s) => s.paperTypeId != null)
  const step2 = step1 && p.steps.length > 0
  const step3 = step2 && blockers.value.length === 0
  const step4 = step3 && priceBlockers.value.length === 0
  return [step1, step2, step3, step4, step4]
})

const maxReachable = computed(() => {
  // Detalhar: todas as abas abertas — não há o que preencher.
  if (readOnly.value) return STEPS.length - 1
  const valid = stepValid.value
  for (let index = valid.length - 2; index >= 0; index -= 1) {
    if (valid[index]) return index + 1
  }
  return 0
})

const canAdvance = computed(() => readOnly.value || stepValid.value[current.value] === true)
const unitLabel = computed(() => (product.value?.structure === 'BLADE' ? 'peça' : 'bloco'))

const next = () => {
  if (canAdvance.value && current.value < STEPS.length - 1) current.value += 1
}
const back = () => {
  if (current.value > 0) current.value -= 1
}

const save = () => {
  if (readOnly.value) return
  if (store.commit()) router.push(quotePath(store.quoteId))
}

const cancel = () => {
  store.discard()
  router.push(quotePath(store.quoteId))
}
</script>

<template>
  <p v-if="opening && !product" class="text-sm text-slate-500 dark:text-slate-400">Abrindo o produto...</p>
  <div v-if="product" class="space-y-6">
    <Breadcrumb :items="breadcrumb" class="print:hidden" />

    <div
      v-if="store.calcError"
      class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200 print:hidden"
    >
      <strong>Não foi possível calcular.</strong> {{ store.calcError }}
    </div>

    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
          {{ readOnly ? `Detalhar produto ${position}` : position ? `Editar produto ${position}` : 'Novo produto' }}
          <span class="text-base font-medium text-slate-500 dark:text-slate-400">
            — {{ store.quoteNumber ? `orçamento nº ${store.quoteNumber}` : 'orçamento ainda não salvo' }}
          </span>
        </h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {{ product.name || 'Sem nome ainda' }}
          <span v-if="store.calculating" class="ml-2 text-xs text-indigo-600 dark:text-indigo-400">calculando...</span>
        </p>
      </div>
      <button
        type="button"
        @click="cancel"
        class="self-start rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        {{ readOnly ? 'Voltar ao orçamento' : 'Cancelar' }}
      </button>
    </header>

    <div
      v-if="readOnly"
      class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 print:hidden"
    >
      <template v-if="store.quoteStatus === 'APPROVED'">
        <strong>Orçamento aprovado — somente leitura.</strong> É a configuração e o cálculo que o cliente aceitou.
      </template>
      <template v-else><strong>Orçamento rejeitado — somente leitura.</strong> Volte-o para pendente para editar.</template>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 print:hidden">
      <QuoteStepper :steps="STEPS" :current="current" :max-reachable="maxReachable" @go="current = $event" />
    </div>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] print:block">
      <div class="min-w-0 space-y-6">
        <!--
          O cálculo é no botão (atividade 047). No passo 3 a faixa mostra sempre o estado do cálculo; em
          Impostos e Markup só aparece desatualizada — impostos e markup incidem sobre o cálculo e não
          pedem outro. O resumo tem o próprio aviso.
        -->
        <div
          v-if="!readOnly && (current === 2 || (current === 3 && stale))"
          class="flex flex-col gap-3 rounded-xl border px-5 py-3 sm:flex-row sm:items-center sm:justify-between print:hidden"
          :class="
            stale
              ? 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/30'
              : 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
          "
          role="status"
        >
          <p class="text-sm" :class="stale ? 'text-rose-800 dark:text-rose-200' : 'text-emerald-800 dark:text-emerald-200'">
            <template v-if="calcBlockers.length">
              <strong>Ainda não dá para calcular.</strong> Falta: {{ calcBlockers.join('; ') }}.
            </template>
            <template v-else-if="!store.draftCost">
              <strong>Produto ainda não calculado.</strong> Clique em Calcular para o motor montar as opções de
              impressora, papel e formato.
            </template>
            <template v-else-if="stale">
              <strong>Os parâmetros foram alterados e é necessário refazer o cálculo.</strong> O preço e as opções
              abaixo são do cálculo anterior.
            </template>
            <template v-else>
              <strong>Cálculo em dia.</strong> Mexeu em algum parâmetro, calcule de novo.
            </template>
          </p>
          <CalculateButton class="shrink-0 self-start sm:self-auto" />
        </div>

        <!--
          Detalhar: o fieldset desabilitado trava todo campo e botão das abas de uma vez — os mesmos
          componentes, na mesma ordem, sem uma cópia só leitura de cada um. O resumo fica fora: não tem
          campos, e o "Imprimir resumo" tem que funcionar.
        -->
        <fieldset
          v-if="current < 4"
          :disabled="readOnly"
          class="m-0 min-w-0 space-y-6 border-0 p-0"
          :class="{
            // Nem todo campo tem estilo de desabilitado: no detalhar, todos ficam com cara de só leitura.
            '[&_input]:cursor-not-allowed [&_input]:bg-slate-100 [&_select]:cursor-not-allowed [&_select]:bg-slate-100 [&_textarea]:cursor-not-allowed [&_textarea]:bg-slate-100 [&_button]:cursor-not-allowed dark:[&_input]:bg-slate-800 dark:[&_select]:bg-slate-800 dark:[&_textarea]:bg-slate-800':
              readOnly,
          }"
        >
        <StepProductDefinition v-if="current === 0" />
        <StepActivities v-else-if="current === 1" />
        <template v-else-if="current === 2">
          <StepParameters />
          <!-- Quem termina de preencher os parâmetros lá embaixo recalcula sem subir a tela. -->
          <div
            v-if="!readOnly"
            class="flex flex-col gap-3 rounded-xl border px-5 py-3 sm:flex-row sm:items-center sm:justify-between print:hidden"
            :class="
              stale
                ? 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/30'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
            "
          >
            <p class="text-sm" :class="stale ? 'text-rose-800 dark:text-rose-200' : 'text-slate-600 dark:text-slate-300'">
              {{
                stale
                  ? store.draftCost
                    ? 'Os parâmetros foram alterados: recalcule para atualizar o preço e as opções.'
                    : 'Produto ainda não calculado.'
                  : 'Cálculo em dia com os parâmetros acima.'
              }}
            </p>
            <CalculateButton :label="store.draftCost ? 'Recalcular' : 'Calcular'" class="shrink-0 self-start sm:self-auto" />
          </div>
        </template>
        <StepTaxesMarkup v-else-if="current === 3" />
        </fieldset>
        <StepSummary v-else />

        <div class="flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            :disabled="current === 0"
            @click="back"
            class="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            ← Voltar
          </button>
          <button
            v-if="current < STEPS.length - 1"
            type="button"
            :disabled="!canAdvance"
            @click="next"
            class="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Avançar →
          </button>
        </div>
      </div>

      <QuotePriceRail
        class="print:hidden"
        :stale="!readOnly && stale && !!store.draftCost"
        :read-only="readOnly"
        :cost="store.draftCost"
        :price="price"
        :blockers="readOnly ? [] : allBlockers"
        :sheets-per-unit="sheetsPerUnit(product)"
        :unit-label="unitLabel"
        :can-save="allBlockers.length === 0 && !!store.draftCost && !stale"
        :save-label="store.editingUid ? 'Salvar alterações' : 'Salvar produto'"
        @save="save"
      />
    </div>
  </div>
</template>
