<script setup lang="ts">
/**
 * Card de parâmetros de UMA etapa no passo 3 (atividade 034).
 *
 * EM ABERTO — escolha do item dentro de um GRUPO de insumo: quando a atividade consome um grupo
 * (ex.: "Espirais"), o critério de escolha é TÉCNICO e específico da atividade — a espiral tem que
 * caber na espessura do bloco —, não "o mais barato". Consumo por medida também entra aqui: o
 * grampo é cobrado por centímetro linear, dependendo do tamanho do bloco. Será tratado por tipo de
 * atividade; nenhuma etapa deste protótipo consome grupo.
 *
 * Cada tipo de atividade pede uma coisa diferente — e várias não pedem nada. Este componente é o
 * despachante: escolhe os campos pelo tipo da atividade e, quando não há o que perguntar, explica
 * de onde o número vem em vez de deixar um card vazio (card vazio faz o usuário procurar o campo
 * que não existe).
 */
import { computed } from 'vue'
import type { QuoteStep } from '@/types/QuoteDraft'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import { useQuoteCatalogs } from '@/composables/useQuoteCatalogs'
import { brl } from '@/utils/quoteModel'
import { ACTIVITY_TYPE_LABELS } from '@/utils/activityCatalog'
import PrintingParameters from '@/components/quotes/PrintingParameters.vue'

const props = defineProps<{
  step: QuoteStep
  /** Posição da etapa entre as de impressão (1ª, 2ª...), para o usuário se localizar. */
  printingIndex?: number
  printingTotal?: number
}>()

const catalogs = useQuoteCatalogs()
const store = useQuoteDraftStore()
const activity = computed(() => catalogs.findActivity(props.step.activityId))
const paramKind = computed(() => catalogs.paramKindOf(activity.value))
const params = computed(() => props.step.parameters)

const setNumber = (
  key: 'laborMinutes' | 'numberingUnits' | 'perforationCount' | 'stapleCount',
  value: string
) => {
  const parsed = Number(value.replace(',', '.'))
  props.step.parameters[key] = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

// ---- Talão (atividade 035) ----------------------------------------------------------------

const product = computed(() => store.draft!)

/** Quantas vias/lâminas o produto tem: é o teto do "em quantas vias" do picote. */
const artworkCount = computed(() =>
  product.value.structure === 'BLOCK' ? product.value.vias : product.value.blades,
)
const artworkNoun = computed(() => (product.value.structure === 'BLOCK' ? 'vias' : 'lâminas'))

/**
 * Em quantas vias o picote é feito. Nasce em TODAS porque é o caso do talão simples; quem picota
 * só a primeira reduz aqui, e é isso que muda o tempo — cada via passa pela máquina uma vez.
 */
const perforatedSheets = computed<number>({
  get: () => props.step.parameters.perforatedSheetCount ?? artworkCount.value,
  set: (value) => {
    const limite = Math.min(artworkCount.value, Math.max(1, Math.floor(value) || 1))
    props.step.parameters.perforatedSheetCount = limite
  },
})

/**
 * O resultado do cálculo para ESTA etapa — é dele que saem as máquinas avaliadas, com tempo, e as
 * recusadas com o motivo. Sem cálculo ainda, a tela pede o cálculo em vez de inventar uma lista.
 */
const costing = computed(() =>
  store.draftCost?.steps?.find((s) => s.activityId === props.step.activityId) ?? null,
)
const machineOptions = computed(() => costing.value?.machineOptions ?? [])
const viableOptions = computed(() => machineOptions.value.filter((o) => !o.reason))
const rejectedOptions = computed(() => machineOptions.value.filter((o) => o.reason))

const chooseMachine = (machineId: number | null) => {
  props.step.parameters.machineId = machineId
  store.calculateDraft()
}

const inputClass =
  'w-28 rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
</script>

<template>
  <div v-if="activity" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <div class="flex flex-wrap items-center gap-2">
      <h3 class="text-base font-semibold text-slate-900 dark:text-white">
        {{ activity.value }}<span v-if="(printingTotal ?? 0) > 1" class="text-slate-400"> ({{ printingIndex }}ª)</span>
      </h3>
      <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
        {{ ACTIVITY_TYPE_LABELS[activity.type] }}
      </span>
    </div>

    <!-- Nada a perguntar: o valor é calculado a partir do cadastro e do encaixe -->
    <p v-if="paramKind === 'NONE'" class="mt-2 flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
      <svg class="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Nada a configurar — o motor calcula pelo cadastro da atividade e pelo encaixe na folha.</span>
    </p>

    <!-- Atividade manual: horas -->
    <div v-else-if="paramKind === 'MINUTES'" class="mt-3">
      <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
        Tempo de trabalho (minutos) <span class="text-rose-500">*</span>
      </label>
      <div class="flex flex-wrap items-center gap-3">
        <input
          :value="params.laborMinutes ?? ''"
          type="number"
          min="0"
          step="5"
          placeholder="0"
          @input="setNumber('laborMinutes', ($event.target as HTMLInputElement).value)"
          :class="inputClass"
        />
        <span class="text-sm text-slate-500 dark:text-slate-400">
          ao valor da hora cadastrado na atividade
        </span>
      </div>
    </div>

    <!--
      PICOTE (atividade 035). A folha entra, passa pela máquina e cai na bandeja. O que o orçamento
      precisa saber é quantos picotes ela leva e em quantas vias — o resto (velocidade pela
      gramatura, levas, retirada da bandeja) sai do cadastro da máquina.
    -->
    <div v-else-if="paramKind === 'PERFORATION'" class="mt-3 space-y-4">
      <div class="flex flex-wrap items-end gap-6">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Picotes por folha <span class="text-rose-500">*</span>
          </label>
          <input
            :value="params.perforationCount ?? 1"
            type="number"
            min="1"
            step="1"
            @input="setNumber('perforationCount', ($event.target as HTMLInputElement).value)"
            :class="inputClass"
          />
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Cada picote ocupa uma ferramenta da máquina — e tem o seu tempo de acerto.
          </p>
        </div>
        <div v-if="artworkCount > 1">
          <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Em quantas {{ artworkNoun }}?
          </label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="perforatedSheets"
              type="number"
              min="1"
              :max="artworkCount"
              :class="inputClass"
            />
            <span class="text-sm text-slate-500 dark:text-slate-400">de {{ artworkCount }}</span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            As primeiras — no talão, é comum picotar só a via que o cliente destaca.
          </p>
        </div>
      </div>

      <!-- O tempo da máquina, quando o cálculo já rodou -->
      <div v-if="costing" class="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
        <p class="font-medium text-slate-800 dark:text-slate-100">
          {{ costing.machineName }} — {{ costing.totalMinutes.toFixed(1) }} min ({{ brl(costing.totalCost) }})
        </p>
        <ul class="mt-1 space-y-0.5">
          <li v-for="stage in costing.timeStages" :key="stage.name">
            {{ stage.name }}: {{ stage.detail }} = {{ stage.minutes.toFixed(2) }} min
          </li>
        </ul>
      </div>
    </div>

    <!--
      GRAMPO (atividade 035). A grampeadeira fecha um talão por vez; o que muda o trabalho é quantos
      grampos ele leva — e é isso que decide QUAL máquina pode fazer: os cabeçotes descem juntos.
    -->
    <div v-else-if="paramKind === 'STAPLES'" class="mt-3 space-y-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Quantos grampos <span class="text-rose-500">*</span>
        </label>
        <input
          :value="params.stapleCount ?? ''"
          type="number"
          min="1"
          step="1"
          placeholder="0"
          @input="setNumber('stapleCount', ($event.target as HTMLInputElement).value)"
          :class="inputClass"
        />
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Por talão. Decide as descidas do cabeçote, os movimentos laterais e o arame consumido.
        </p>
      </div>

      <!-- As máquinas que dão conta, com o tempo de cada uma — a escolha é do usuário -->
      <div v-if="viableOptions.length">
        <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Grampeadeira</span>
        <div class="space-y-2">
          <button
            v-for="option in viableOptions"
            :key="option.machineId"
            type="button"
            @click="chooseMachine(option.machineId)"
            class="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-left transition-colors"
            :class="
              option.chosen
                ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10'
                : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50'
            "
          >
            <span class="text-sm text-slate-800 dark:text-slate-100">
              {{ option.machineName }}
              <span v-if="option.chosen" class="ml-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                — em uso
              </span>
            </span>
            <span class="text-xs text-slate-600 dark:text-slate-300">
              {{ option.minutes?.toFixed(1) }} min · {{ brl(option.cost ?? 0) }}
            </span>
          </button>
        </div>
        <button
          v-if="params.machineId != null"
          type="button"
          @click="chooseMachine(null)"
          class="mt-2 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Voltar à escolha do sistema (a mais barata)
        </button>
      </div>

      <!-- As recusadas, com o motivo: some com a máquina e o orçamentista vai procurá-la -->
      <ul v-if="rejectedOptions.length" class="space-y-1">
        <li
          v-for="option in rejectedOptions"
          :key="option.machineId"
          class="rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
        >
          {{ option.reason }}
        </li>
      </ul>

      <!-- O arame, aberto: é a parte que o cliente contesta -->
      <p
        v-if="costing?.supplyUsage"
        class="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
      >
        <strong>{{ costing.supplyUsage.supplyName }}</strong>:
        {{ costing.supplyUsage.detail }} — {{ brl(costing.supplyUsage.cost) }}
      </p>
    </div>

    <!-- Impressão: cada etapa tem a sua configuração completa, e os custos se somam -->
    <div v-else-if="paramKind === 'PRINTING'" class="mt-4">
      <p
        v-if="(printingTotal ?? 0) > 1"
        class="mb-4 rounded-lg bg-slate-50 px-4 py-2.5 text-xs text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
      >
        <strong>{{ printingIndex }}ª de {{ printingTotal }} impressões</strong> deste produto — configuração
        própria, somada às demais. Zere as cores das folhas que não entram nesta passada.
      </p>
      <PrintingParameters :step="step" :printing-index="printingIndex ?? 1" />
    </div>

  </div>
</template>
