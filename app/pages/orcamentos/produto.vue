<script setup lang="ts">
/**
 * ASSISTENTE DE PRODUTO DO ORÇAMENTO (atividade 034).
 *
 * Rota própria em vez de modal: o passo 3 precisa de largura para comparar impressoras, a
 * configuração dura minutos e o usuário vai e volta entre passos. Um modal com quatro passos
 * empurraria tudo isso para dentro de uma caixa com rolagem própria.
 *
 * Layout: passo a passo no topo, um passo por vez no corpo e o trilho de preço fixo à direita —
 * o preço acompanha a configuração, em vez de ser uma revelação no fim.
 *
 * Catálogos e cálculo são os reais: o preço vem do motor a cada mexida (com debounce).
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import { useQuoteCatalogs } from '@/composables/useQuoteCatalogs'
import QuoteStepper from '@/components/quotes/QuoteStepper.vue'
import QuotePriceRail from '@/components/quotes/QuotePriceRail.vue'
import StepProductDefinition from '@/components/quotes/StepProductDefinition.vue'
import StepActivities from '@/components/quotes/StepActivities.vue'
import StepParameters from '@/components/quotes/StepParameters.vue'
import StepSummary from '@/components/quotes/StepSummary.vue'
import StepTaxesMarkup from '@/components/quotes/StepTaxesMarkup.vue'
import { priceFromCost, pricingIssues } from '@/utils/pricing'
import {
  coverageIssues,
  inkIssues,
  isSheetPrinted,
  platesForMachine,
  printingSteps,
  setupFor,
  sheetsPerUnit,
} from '@/utils/quoteModel'

definePageMeta({ middleware: 'auth' })

const router = useRouter()
const store = useQuoteDraftStore()
const catalogs = useQuoteCatalogs()

const STEPS = [
  { key: 'produto', label: 'Formato e papéis' },
  { key: 'atividades', label: 'Atividades' },
  { key: 'parametros', label: 'Parâmetros' },
  // Atividade 037: impostos, comissão e markup — daqui sai o preço de venda.
  { key: 'impostos', label: 'Impostos e Markup' },
  { key: 'resumo', label: 'Resumo' },
]

const current = ref(0)

onMounted(async () => {
  if (!store.draft) store.startNew()
  // RECARREGA os catálogos, não aproveita o que já estava em memória: máquinas, insumos e
  // atividades são editados em OUTRA tela, e o assistente fica aberto por muito tempo. Quem acabou
  // de arrumar as chapas da impressora volta para cá e precisa ver a lista nova — com o cache da
  // sessão, o orçamento seguia oferecendo as chapas de antes da edição. São cinco listas curtas.
  await catalogs.load(true)

  // Abrir um produto salvo não mexe em nada, então o watch de recálculo não dispara — e sem
  // cálculo o passo de parâmetros fica sem opções de impressora. O gatilho é aqui, depois dos
  // catálogos, que são justamente o que `calcBlockers` consulta para saber o tipo das atividades.
  if (calcBlockers.value.length === 0) scheduleCalc(0)
})

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
  // Numeração (atividade 036): pela mesma razão. Só algumas offsets numeram, e assumir "não" no
  // silêncio escolheria uma impressora que não faz o trabalho.
  if (p.hasNumbering === null) list.push('Informar se o produto tem numeração')
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

  // Com impressão, o produto precisa de dois cortes: um antes, para a folha entrar na máquina, e
  // o refile depois. É a ordem na lista que diz qual é qual.
  const impressoes = printingSteps(p)
  const cortes = p.steps.filter((s) => catalogs.findActivity(s.activityId)?.type === 'CUTTING')
  if (impressoes.length > 0 && cortes.length < 2) {
    list.push('Adicionar duas etapas de corte: uma antes da impressão e o refile depois')
  }

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

/** Percentuais que o servidor recusaria (atividade 037) — seguram o salvar, não os parâmetros. */
const priceBlockers = computed(() => (product.value ? pricingIssues(product.value.pricing, product.value.taxes) : []))
const allBlockers = computed(() => [...blockers.value, ...priceBlockers.value])

/** Preço de venda do produto em edição, para o trilho. */
const price = computed(() =>
  store.draftCost && product.value
    ? priceFromCost(store.draftCost.totalCost, product.value.pricing, product.value.taxes)
    : null,
)

/**
 * Recalcula no motor a cada mexida, com debounce — o usuário mexe em cores e dimensões o tempo
 * todo, e uma chamada por tecla digitada não ajudaria ninguém.
 */
let timer: ReturnType<typeof setTimeout> | null = null
const scheduleCalc = (delay: number) => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => store.calculateDraft(), delay)
}

watch(
  () => [store.draft, calcBlockers.value.length] as const,
  () => {
    if (calcBlockers.value.length > 0) {
      if (timer) clearTimeout(timer)
      store.draftCost = null
      return
    }
    scheduleCalc(400)
  },
  { deep: true },
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
  const valid = stepValid.value
  for (let index = valid.length - 2; index >= 0; index -= 1) {
    if (valid[index]) return index + 1
  }
  return 0
})

const canAdvance = computed(() => stepValid.value[current.value] === true)
const unitLabel = computed(() => (product.value?.structure === 'BLADE' ? 'peça' : 'bloco'))

const next = () => {
  if (canAdvance.value && current.value < STEPS.length - 1) current.value += 1
}
const back = () => {
  if (current.value > 0) current.value -= 1
}

const save = () => {
  store.commit()
  router.push('/orcamentos/editar')
}

const cancel = () => {
  store.discard()
  router.push('/orcamentos/editar')
}
</script>

<template>
  <div v-if="product" class="space-y-6">
    <div
      v-if="store.calcError"
      class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200 print:hidden"
    >
      <strong>Não foi possível calcular.</strong> {{ store.calcError }}
    </div>

    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
          {{ store.editingUid ? 'Editar produto' : 'Novo produto' }}
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
        Cancelar
      </button>
    </header>

    <div class="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 print:hidden">
      <QuoteStepper :steps="STEPS" :current="current" :max-reachable="maxReachable" @go="current = $event" />
    </div>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] print:block">
      <div class="min-w-0 space-y-6">
        <StepProductDefinition v-if="current === 0" />
        <StepActivities v-else-if="current === 1" />
        <StepParameters v-else-if="current === 2" />
        <StepTaxesMarkup v-else-if="current === 3" />
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
        :cost="store.draftCost"
        :price="price"
        :blockers="allBlockers"
        :sheets-per-unit="sheetsPerUnit(product)"
        :unit-label="unitLabel"
        :can-save="allBlockers.length === 0 && !!store.draftCost"
        :save-label="store.editingUid ? 'Salvar alterações' : 'Salvar produto'"
        @save="save"
      />
    </div>
  </div>
</template>
