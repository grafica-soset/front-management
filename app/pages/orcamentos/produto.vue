<script setup lang="ts">
/**
 * ASSISTENTE DE PRODUTO DO ORÇAMENTO (atividade 034) — PROTÓTIPO.
 *
 * Rota própria em vez de modal: o passo 3 precisa de largura para comparar impressoras, a
 * configuração dura minutos e o usuário vai e volta entre passos. Um modal com quatro passos
 * empurraria tudo isso para dentro de uma caixa com rolagem própria.
 *
 * Layout: passo a passo no topo, um passo por vez no corpo e o trilho de preço fixo à direita —
 * o preço acompanha a configuração, em vez de ser uma revelação no fim.
 *
 * ⚠️ Sem integração: catálogos e cálculo vêm de `utils/quoteDemoData.ts`.
 */
import { computed, onMounted, ref } from 'vue'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import QuoteStepper from '@/components/quotes/QuoteStepper.vue'
import QuotePriceRail from '@/components/quotes/QuotePriceRail.vue'
import StepProductDefinition from '@/components/quotes/StepProductDefinition.vue'
import StepActivities from '@/components/quotes/StepActivities.vue'
import StepParameters from '@/components/quotes/StepParameters.vue'
import StepSummary from '@/components/quotes/StepSummary.vue'
import {
  estimateProductCost,
  inkIssues,
  isSheetPrinted,
  printingSteps,
  setupFor,
  sheetsPerUnit,
} from '@/utils/quoteDemoData'

definePageMeta({ middleware: 'auth' })

const router = useRouter()
const store = useQuoteDraftStore()

const STEPS = [
  { key: 'produto', label: 'Formato e papéis' },
  { key: 'atividades', label: 'Atividades' },
  { key: 'parametros', label: 'Parâmetros' },
  { key: 'resumo', label: 'Resumo' },
]

const current = ref(0)

// Entrar direto na URL sem rascunho aberto começa um produto novo, em vez de quebrar.
onMounted(() => {
  if (!store.draft) store.startNew()
})

const product = computed(() => store.draft)
const cost = computed(() => (product.value ? estimateProductCost(product.value) : null))

/** O que ainda impede o cálculo — vira a lista de pendências do trilho. */
const blockers = computed(() => {
  const p = product.value
  if (!p) return ['Abrir um produto']
  const list: string[] = []
  if (!p.name.trim()) list.push('Dar um nome ao produto')
  if (!p.widthMm || !p.heightMm) list.push('Informar a dimensão final')
  if (!p.quantity) list.push('Informar a tiragem')
  if (p.sheets.some((s) => s.paperTypeId == null)) list.push('Escolher o papel de cada via/lâmina')
  if (p.steps.length === 0) list.push('Ativar ao menos uma atividade')

  // Cada impressão é conferida por si: máquina escolhida e tintas batendo com as cores. Via ou
  // capa com cores zero nas duas faces é só papel, e não precisa de máquina nenhuma.
  const impressoes = printingSteps(p)
  impressoes.forEach((step, index) => {
    const ordinal = impressoes.length > 1 ? ` (${index + 1}ª impressão)` : ''
    const printed = p.sheets.filter((sheet) => isSheetPrinted(sheet, setupFor(step, sheet)))
    if (printed.length === 0) {
      list.push(`Informar as cores de ao menos uma via/lâmina${ordinal}`)
      return
    }
    if (!step.printing?.perSheet && !step.printing?.machineId) {
      list.push(`Escolher a impressora${ordinal}`)
    }
    if (printed.some((sheet) => inkIssues(setupFor(step, sheet)).length > 0)) {
      list.push(`Selecionar uma tinta para cada cor${ordinal}`)
    }
  })
  return list
})

/** Cada passo só libera o seguinte quando tem o que ele precisa. */
const stepValid = computed(() => {
  const p = product.value
  if (!p) return [false, false, false, false]
  const step1 = !!p.name.trim() && !!p.widthMm && !!p.heightMm && !!p.quantity && p.sheets.every((s) => s.paperTypeId != null)
  const step2 = step1 && p.steps.length > 0
  const step3 = step2 && blockers.value.length === 0
  return [step1, step2, step3, step3]
})

const maxReachable = computed(() => {
  const valid = stepValid.value
  if (valid[2]) return 3
  if (valid[1]) return 2
  if (valid[0]) return 1
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
  router.push('/orcamentos')
}

const cancel = () => {
  store.discard()
  router.push('/orcamentos')
}
</script>

<template>
  <div v-if="product" class="space-y-6">
    <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
      <strong>Protótipo.</strong> Catálogos e valores são ilustrativos e não vêm da API. O objetivo
      aqui é validar o layout e o caminho da configuração.
    </div>

    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
          {{ store.editingUid ? 'Editar produto' : 'Novo produto' }}
        </h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {{ product.name || 'Sem nome ainda' }}
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

    <div class="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <QuoteStepper :steps="STEPS" :current="current" :max-reachable="maxReachable" @go="current = $event" />
    </div>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div class="min-w-0 space-y-6">
        <StepProductDefinition v-if="current === 0" />
        <StepActivities v-else-if="current === 1" />
        <StepParameters v-else-if="current === 2" />
        <StepSummary v-else />

        <div class="flex items-center justify-between gap-3">
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
        v-if="cost"
        :cost="cost"
        :blockers="blockers"
        :sheets-per-unit="sheetsPerUnit(product)"
        :unit-label="unitLabel"
        :can-save="blockers.length === 0"
        :save-label="store.editingUid ? 'Salvar alterações' : 'Salvar produto'"
        @save="save"
      />
    </div>
  </div>
</template>
