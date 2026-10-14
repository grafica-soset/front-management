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
import { useUnitConverter } from '@/composables/useUnitConverter'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'

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
  key: 'laborMinutes' | 'numberingUnits' | 'perforationCount' | 'stapleCount' | 'dieCount' | 'parallelFolds' | 'crossFolds',
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
 * O resultado do cálculo para ESTA etapa, quando já houve cálculo.
 *
 * Aqui é só CONFERÊNCIA: a escolha da máquina e as recusadas moram no resumo, onde a memória do
 * cálculo está inteira. Este passo pergunta o que o trabalho pede; quem responde "em qual máquina"
 * é o motor, com o resumo mostrando o porquê.
 */
const costing = computed(() =>
  store.draftCost?.steps?.find((s) => s.activityId === props.step.activityId) ?? null,
)
/** Só vale mostrar o tempo quando o cálculo achou máquina — zero aqui é ruído, não informação. */
const calculated = computed(() => (costing.value?.machineName ? costing.value : null))

// ---- Dobra (atividade 048) ----------------------------------------------------------------

/**
 * O teto das dobras: as bolsas da MAIOR dobradeira da atividade. Cada dobra passa por uma bolsa, e
 * a máquina só tem tantas de cada tipo; quem decide qual delas faz o trabalho é o motor.
 */
const foldingMachines = computed(() =>
  catalogs.machinesOfActivity(activity.value).filter((m) => m.machineType === 'FOLDING'),
)
const maxParallelFolds = computed(() => Math.max(0, ...foldingMachines.value.map((m) => m.parallelPockets ?? 0)))
const maxCrossFolds = computed(() => Math.max(0, ...foldingMachines.value.map((m) => m.crossPockets ?? 0)))

const setFolds = (key: 'parallelFolds' | 'crossFolds', value: string, max: number) => {
  setNumber(key, value)
  const atual = Math.floor(props.step.parameters[key] ?? 0)
  props.step.parameters[key] = max > 0 ? Math.min(atual, max) : atual
}

/** "Tem dobra cruzada?" — desligar zera as cruzadas. */
const hasCrossFold = computed<boolean>({
  get: () => (props.step.parameters.crossFolds ?? 0) > 0,
  set: (value) => {
    props.step.parameters.crossFolds = value ? Math.max(1, props.step.parameters.crossFolds ?? 0) : 0
  },
})

// ---- Corte e vinco (atividade 046) --------------------------------------------------------

const { suffix, fromMillimeters, toMillimeters, format } = useUnitConverter()

/** Perímetro da peça (mm): a canaleta padrão de cada faca — 15×20 dá 70. */
const perimeterMm = computed(() => {
  const w = product.value.widthMm ?? 0
  const h = product.value.heightMm ?? 0
  return w > 0 && h > 0 ? 2 * (w + h) : null
})

/**
 * Canaleta por faca, na unidade da empresa. Nasce no perímetro da peça e acompanha o tamanho
 * enquanto o usuário não mexe; digitado, vira o valor da etapa. Vazio volta ao perímetro.
 */
const channelLength = computed<number | null>({
  get: () => fromMillimeters(props.step.parameters.channelLengthMm ?? perimeterMm.value),
  set: (value) => {
    const mm = value == null || !Number.isFinite(value) || value <= 0 ? null : toMillimeters(value)
    props.step.parameters.channelLengthMm = mm != null && mm === perimeterMm.value ? null : mm
  },
})
const channelIsDefault = computed(() => props.step.parameters.channelLengthMm == null)
const resetChannel = () => {
  props.step.parameters.channelLengthMm = null
}

/** Os insumos que a etapa consumiu no último cálculo (faca e canaleta). */
const supplyUsages = computed(() =>
  calculated.value?.supplyUsages?.length
    ? calculated.value.supplyUsages
    : calculated.value?.supplyUsage
      ? [calculated.value.supplyUsage]
      : [],
)

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

      <!-- Conferência: o tempo da máquina, quando o cálculo já rodou -->
      <div
        v-if="calculated"
        class="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
      >
        <p class="font-medium text-slate-800 dark:text-slate-100">
          {{ calculated.machineName }} —
          {{ calculated.totalMinutes.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }} min
          ({{ brl(calculated.totalCost) }})
        </p>
        <ul class="mt-1 space-y-0.5">
          <li v-for="stage in calculated.timeStages" :key="stage.name">
            {{ stage.name }}: {{ stage.detail }} =
            {{ stage.minutes.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }} min
          </li>
        </ul>
      </div>
      <p v-else class="text-xs text-slate-500 dark:text-slate-400">
        Use <strong>Calcular</strong> para ver o tempo desta máquina — o detalhamento fica no resumo.
      </p>
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

      <!--
        Conferência. A escolha da grampeadeira e as recusadas ficam no RESUMO: é lá que a memória
        do cálculo está inteira, e o número de grampos é a única coisa que se decide aqui.
      -->
      <div
        v-if="calculated"
        class="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
      >
        <p class="font-medium text-slate-800 dark:text-slate-100">
          {{ calculated.machineName }} —
          {{ calculated.totalMinutes.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }} min
          ({{ brl(calculated.totalCost) }})
        </p>
        <p v-if="calculated.supplyUsage" class="mt-1">
          {{ calculated.supplyUsage.supplyName }}: {{ calculated.supplyUsage.detail }} —
          {{ brl(calculated.supplyUsage.cost) }}
        </p>
      </div>
      <p v-else class="text-xs text-slate-500 dark:text-slate-400">
        Use <strong>Calcular</strong> para ver a grampeadeira escolhida e o arame — o detalhamento,
        com as máquinas que não dão conta e o porquê, fica no resumo.
      </p>
    </div>

    <!--
      CORTE E VINCO (atividade 046). A folha impressa entra na máquina e a faca recorta as peças — é
      o segundo corte do produto. O que o orçamento pergunta é a forma: quantas bocas (facas) e
      quanta canaleta cada uma leva. Velocidade, setup de faca e pinça saem do cadastro da máquina.
    -->
    <div v-else-if="paramKind === 'DIE_CUTTING'" class="mt-3 space-y-4">
      <div class="flex flex-wrap items-start gap-6">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Quantidade de bocas (facas) <span class="text-rose-500">*</span>
          </label>
          <input
            :value="params.dieCount || ''"
            type="number"
            min="1"
            step="1"
            placeholder="0"
            @input="setNumber('dieCount', ($event.target as HTMLInputElement).value)"
            :class="inputClass"
          />
          <p class="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
            Facas consumidas do estoque. Menos bocas que aplicações da folha = a mesma folha passa mais
            vezes (9 aplicações com 3 bocas = 3 passadas): mais rodagem, menos faca e canaleta.
          </p>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Canaleta por faca ({{ suffix }})
          </label>
          <div class="flex items-center gap-2">
            <input v-model.number="channelLength" type="number" min="0" step="0.1" :class="inputClass" />
            <button
              v-if="!channelIsDefault"
              type="button"
              class="text-xs font-medium text-indigo-700 hover:underline dark:text-indigo-300"
              @click="resetChannel"
            >
              Usar o perímetro
            </button>
          </div>
          <p class="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
            <template v-if="channelIsDefault && perimeterMm">
              Perímetro da peça ({{ format(perimeterMm) }}). Ajuste se a faca tiver outro desenho.
            </template>
            <template v-else-if="perimeterMm">Perímetro da peça: {{ format(perimeterMm) }}.</template>
            <template v-else>Informe o tamanho da peça para usar o perímetro como padrão.</template>
          </p>
        </div>
      </div>

      <!-- Faca do cliente: as bocas continuam valendo; a faca dá lugar à taxa de manutenção -->
      <div>
        <ToggleSwitch
          :model-value="params.customerOwnsDie === true"
          label="O cliente já tem a faca"
          @update:model-value="(v: boolean) => (step.parameters.customerOwnsDie = v)"
        />
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          <template v-if="params.customerOwnsDie">
            A faca não é cobrada; entra a taxa de manutenção da faca configurada pela empresa. Informe as
            bocas mesmo assim — elas decidem as passadas e a canaleta.
          </template>
          <template v-else>A faca é comprada para o trabalho e cobrada no orçamento.</template>
        </p>
      </div>

      <div
        v-if="calculated"
        class="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
      >
        <p class="font-medium text-slate-800 dark:text-slate-100">
          {{ calculated.machineName }} —
          {{ calculated.totalMinutes.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }} min
          ({{ brl(calculated.totalCost) }})
        </p>
        <ul class="mt-1 space-y-0.5">
          <li v-for="stage in calculated.timeStages" :key="stage.name">
            {{ stage.name }}: {{ stage.detail }} =
            {{ stage.minutes.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }} min
          </li>
          <li v-for="usage in supplyUsages" :key="usage.supplyName">
            {{ usage.supplyName }}: {{ usage.detail }} — {{ brl(usage.cost) }}
          </li>
        </ul>
      </div>
      <p v-else class="text-xs text-slate-500 dark:text-slate-400">
        Use <strong>Calcular</strong> para ver o tempo da máquina e o custo da faca e da canaleta.
      </p>
    </div>

    <!--
      DOBRA (atividade 048). Cada dobra passa por uma bolsa da dobradeira, e cada bolsa usada reduz a
      velocidade e tem o seu setup. O orçamento pergunta as dobras; o resto (esquadro lateral,
      gramatura e formato ideais, maço de saída) sai do cadastro da máquina.
    -->
    <div v-else-if="paramKind === 'FOLDING'" class="mt-3 space-y-4">
      <div class="flex flex-wrap items-start gap-6">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Dobras paralelas <span class="text-rose-500">*</span>
          </label>
          <input
            :value="params.parallelFolds || ''"
            type="number"
            min="0"
            :max="maxParallelFolds || undefined"
            step="1"
            placeholder="0"
            @input="setFolds('parallelFolds', ($event.target as HTMLInputElement).value, maxParallelFolds)"
            :class="inputClass"
          />
          <p v-if="maxParallelFolds" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Até {{ maxParallelFolds }} — as bolsas paralelas da maior dobradeira.
          </p>
        </div>
        <div>
          <ToggleSwitch v-model="hasCrossFold" label="Tem dobra cruzada" :disabled="maxCrossFolds === 0" />
          <div v-if="hasCrossFold" class="mt-2">
            <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Dobras cruzadas</label>
            <input
              :value="params.crossFolds || ''"
              type="number"
              min="1"
              :max="maxCrossFolds || undefined"
              step="1"
              @input="setFolds('crossFolds', ($event.target as HTMLInputElement).value, maxCrossFolds)"
              :class="inputClass"
            />
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            <template v-if="maxCrossFolds === 0">Nenhuma dobradeira desta atividade tem bolsa cruzada.</template>
            <template v-else>Até {{ maxCrossFolds }} — as bolsas cruzadas da maior dobradeira.</template>
          </p>
        </div>
      </div>

      <div
        v-if="calculated"
        class="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
      >
        <p class="font-medium text-slate-800 dark:text-slate-100">
          {{ calculated.machineName }} —
          {{ calculated.totalMinutes.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }} min
          ({{ brl(calculated.totalCost) }})
        </p>
        <ul class="mt-1 space-y-0.5">
          <li v-for="stage in calculated.timeStages" :key="stage.name">
            {{ stage.name }}: {{ stage.detail }} =
            {{ stage.minutes.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }} min
          </li>
        </ul>
      </div>
      <p v-else class="text-xs text-slate-500 dark:text-slate-400">
        Use <strong>Calcular</strong> para ver o tempo da dobradeira — a escolha da máquina e as recusadas
        ficam no resumo.
      </p>
    </div>

    <!--
      PLOTER DE MEIO CORTE (atividade 046). Nada a perguntar: a lâmina percorre o perímetro de cada
      peça, e o tempo sai dos metros de recorte pela velocidade da máquina.
    -->
    <div v-else-if="paramKind === 'HALF_CUT'" class="mt-3 space-y-3">
      <p class="text-sm text-slate-500 dark:text-slate-400">
        Cobrado pelo recorte: perímetro da peça<template v-if="perimeterMm"> ({{ format(perimeterMm) }})</template>
        × quantidade final, na velocidade da ploter.
      </p>
      <div
        v-if="calculated"
        class="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
      >
        <p class="font-medium text-slate-800 dark:text-slate-100">
          {{ calculated.machineName }} —
          {{ calculated.totalMinutes.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }} min
          ({{ brl(calculated.totalCost) }})
        </p>
        <ul class="mt-1 space-y-0.5">
          <li v-for="stage in calculated.timeStages" :key="stage.name">
            {{ stage.name }}: {{ stage.detail }} =
            {{ stage.minutes.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }} min
          </li>
        </ul>
      </div>
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
