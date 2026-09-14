<script setup lang="ts">
/**
 * Passo 4 do assistente — RESUMO DO CÁLCULO (atividade 034).
 *
 * O trilho lateral já mostrou o total durante a configuração; aqui está a MEMÓRIA: de onde cada
 * número saiu. É a tela que o orçamentista usa para conferir se o cálculo bate com o que ele faria
 * na mão — que é justamente o que esta fase quer validar.
 *
 * Uma tabela POR IMPRESSÃO: é o que explica por que o total é a soma — cada passada tem a sua
 * máquina, as suas chapas e o seu acerto, sobre o mesmo papel.
 */
import { computed } from 'vue'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import { useUnitConverter } from '@/composables/useUnitConverter'
import type { SelectionEntryResponse } from '@/types/Quote'
import { brl, formatLabel, printRun } from '@/utils/quoteModel'

const store = useQuoteDraftStore()
const { format } = useUnitConverter()

const cost = computed(() => store.draftCost)

/**
 * Imprime só o resumo. Quem tira o resto da página do caminho é o `print:hidden` de cada bloco,
 * com o CSS de impressão isolando este bloco pelo id — nada de abrir uma segunda janela e ter que
 * carregar estilo de novo lá dentro.
 *
 * Antes de chamar o `print()`, ABRE os blocos recolhidos: os motivos das combinações descartadas
 * ficam fechados na tela porque são muitos, mas no papel são justamente o que o orçamentista leva
 * para conferir com a produção. CSS não abre um `<details>` — só o atributo abre —, por isso a
 * abertura é aqui, e o estado do usuário volta ao normal quando a impressão termina.
 */
const print = () => {
  const blocos = Array.from(
    document.querySelectorAll<HTMLDetailsElement>('#resumo-impressao details'),
  )
  const estadoAnterior = blocos.map((bloco) => bloco.open)
  blocos.forEach((bloco) => {
    bloco.open = true
  })
  window.addEventListener(
    'afterprint',
    () => blocos.forEach((bloco, i) => {
      bloco.open = estadoAnterior[i] ?? false
    }),
    { once: true },
  )
  window.print()
}
const unitLabel = computed(() => (store.draft?.structure === 'BLADE' ? 'peça' : 'bloco'))

/**
 * A estrutura do produto em uma linha: "50x2 vias" ou "3 lâminas". É o que diz, de bate-pronto, o
 * que aquela quantidade contém — sem ela, "10 Bloco de Pedidos" não informa o tamanho do trabalho.
 */
const structureLabel = computed(() => {
  const c = cost.value
  if (!c) return ''
  const vias = c.sheets.filter((s) => s.kind === 'VIA').length
  const blades = c.sheets.filter((s) => s.kind === 'BLADE').length
  const covers = c.sheets.filter((s) => s.kind === 'COVER').length
  const parts: string[] = []
  if (c.structure === 'BLOCK') parts.push(`${c.sets}x${vias} vias`)
  else parts.push(`${blades} lâmina(s)`)
  if (covers > 0) parts.push(`+ ${covers} capa(s)`)
  return parts.join(' ')
})

const sheetName = (kind: string, number: number) =>
  `${kind === 'BLADE' ? 'Lâmina' : kind === 'COVER' ? 'Capa' : 'Via'} ${number}`

/**
 * As notas que o motor deixou nos planos escolhidos — entre elas, a composição do acerto de cada
 * máquina. É a memória de como o TEMPO foi montado, que é onde o orçamento costuma parecer errado
 * sem estar: numa tiragem curta o acerto pesa mais do que a rodagem.
 */
const planNotes = computed(() => {
  const notes = cost.value?.sheets.flatMap((sheet) => sheet.chosen.notes) ?? []
  return Array.from(new Set(notes))
})

/**
 * EMPACOTAMENTO: o peso do trabalho, os pacotes que ele rende e o que custa embrulhá-los.
 *
 * O peso é a única parte do orçamento que o cliente enxerga no caminhão — "8,54 kg em 5 pacotes" —,
 * e a conta dele é simples o bastante para o orçamentista refazer na mão: área da peça FINAL PEDIDA
 * pela gramatura de cada via, vezes as folhas daquela via. Por isso a linha traz a conta inteira, e
 * não só o resultado.
 */
const packaging = computed(() => cost.value?.packaging ?? null)

const kg = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg`

/** "10,5 × 15,5 cm × 56 g/m² × 5.000 folhas" — a conta do peso de uma via, escrita por extenso. */
const weightMath = (gsm: number, sheets: number) => {
  const largura = format(packaging.value?.widthMm ?? 0, { withSuffix: false })
  const altura = format(packaging.value?.heightMm ?? 0)
  return `${largura} × ${altura} × ${gsm} g/m² × ${sheets.toLocaleString('pt-BR')} folhas`
}

/**
 * As etapas de CORTE, que levam a memória da guilhotina para dentro da seção "Cortes".
 *
 * O filtro era "toda etapa com memória de tempo", e isso passou a varrer demais: quando o picote e
 * o grampo ganharam cálculo (atividade 035), eles apareceram dentro de Cortes — que não é onde o
 * orçamentista procura o grampo do talão.
 */
const cuttingSteps = computed(() =>
  cost.value?.steps.filter((step) => step.activityType === 'CUTTING' && step.timeStages.length > 0) ?? [],
)

/**
 * ACABAMENTO FEITO POR MÁQUINA — picote, grampo (atividade 035).
 *
 * Seção própria: são máquinas com memória de tempo, consumo de insumo e máquinas recusadas, e cada
 * uma dessas coisas responde a uma pergunta diferente da do corte.
 */
const machineFinishingSteps = computed(
  () =>
    cost.value?.steps.filter(
      (step) =>
        step.activityType === 'FINISHING' &&
        (step.timeStages.length > 0 || (step.machineOptions?.length ?? 0) > 0),
    ) ?? [],
)

/**
 * MEMÓRIA DE SELEÇÃO — por que ESTE formato e ESTA impressora.
 *
 * O motor testa papel × formato de impressão × impressora e fica com o mais barato. O resto do
 * resumo conta o que sobrou; aqui está o que foi testado, inclusive o que caiu e por quê — que é a
 * pergunta que a gráfica realmente faz quando o cálculo não bate com a vivência dela: "por que a
 * Sakurai I não apareceu?", "por que o 64x44 não entrou?".
 *
 * As combinações viáveis vêm primeiro, da mais barata para a mais cara, com a escolhida no topo; as
 * recusadas ficam recolhidas, porque são muitas e só interessam quando falta alguma opção.
 */
const outcomeRank: Record<string, number> = { CHOSEN: 0, VIABLE: 1, REJECTED: 2 }

const selectionBlocks = computed(() =>
  (cost.value?.sheets ?? []).map((sheet) => {
    const rows = [...(sheet.selection ?? [])].sort((a, b) => {
      const posicao = (outcomeRank[a.outcome] ?? 3) - (outcomeRank[b.outcome] ?? 3)
      if (posicao !== 0) return posicao
      return (a.totalCost ?? Number.POSITIVE_INFINITY) - (b.totalCost ?? Number.POSITIVE_INFINITY)
    })
    return {
      sheet,
      considered: rows.filter((r) => r.outcome !== 'REJECTED'),
      rejected: rows.filter((r) => r.outcome === 'REJECTED'),
    }
  }).filter((block) => block.considered.length > 0 || block.rejected.length > 0),
)

/** O formato de uma linha da memória, com o tamanho que entra na máquina. */
const entryFormat = (entry: SelectionEntryResponse) => {
  if (!entry.printFormatName || entry.printFormatNumber === null) return '—'
  const medida =
    entry.printWidthMm !== null && entry.printHeightMm !== null
      ? ` · ${format(entry.printWidthMm)} × ${format(entry.printHeightMm)}`
      : ''
  return `${formatLabel(entry.printFormatName, entry.printFormatNumber)}${medida}`
}

/** Uma tabela por IMPRESSÃO: é o que explica por que o total é a soma das passadas. */
const printingTables = computed(() => {
  const c = cost.value
  if (!c) return []
  const indices = new Set<number>()
  c.sheets.forEach((s) => s.chosen.printings.forEach((p) => indices.add(p.printingIndex)))
  return Array.from(indices).sort((a, b) => a - b).map((index) => ({
    index,
    name: c.sheets.flatMap((s) => s.chosen.printings).find((p) => p.printingIndex === index)?.activityName ?? 'Impressão',
    rows: c.sheets.map((sheet) => ({
      sheet,
      pass: sheet.chosen.printings.find((p) => p.printingIndex === index) ?? null,
    })),
  }))
})
</script>

<template>
  <div v-if="cost" id="resumo-impressao" class="space-y-4">
    <!-- Cabeçalho do produto -->
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <h2 class="text-base font-semibold text-slate-900 dark:text-white">
          {{ cost.quantity.toLocaleString('pt-BR') }} {{ cost.name || 'Produto sem nome' }}
          <span class="font-normal text-slate-500 dark:text-slate-400">— {{ structureLabel }}</span>
        </h2>
        <button
          type="button"
          @click="print"
          class="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 print:hidden dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829V6.75A2.25 2.25 0 0 1 8.97 4.5h6.06a2.25 2.25 0 0 1 2.25 2.25v7.079M6.72 13.829H4.875A1.875 1.875 0 0 1 3 11.954V9.75c0-1.036.84-1.875 1.875-1.875H6.72m0 5.954h10.56m0 0h1.845A1.875 1.875 0 0 0 21 11.954V9.75c0-1.036-.84-1.875-1.875-1.875H17.28m0 5.954v4.671c0 .621-.504 1.125-1.125 1.125H7.845a1.125 1.125 0 0 1-1.125-1.125v-4.671" />
          </svg>
          Imprimir resumo
        </button>
      </div>
      <dl class="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div>
          <dt class="text-xs text-slate-500 dark:text-slate-400">Formato pedido</dt>
          <dd class="text-sm font-medium text-slate-900 dark:text-white">
            {{ format(cost.widthMm) }} × {{ format(cost.heightMm) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500 dark:text-slate-400">Formato entregue</dt>
          <dd class="text-sm font-medium text-slate-900 dark:text-white">
            <template v-if="cost.sheets[0]">
              {{ formatLabel(cost.finalFormatName, cost.sheets[0].chosen.finalFormatNumber) }}
            </template>
            <template v-else>{{ cost.finalFormatName }}</template>
          </dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500 dark:text-slate-400">Quantidade</dt>
          <dd class="text-sm font-medium text-slate-900 dark:text-white">
            {{ cost.quantity.toLocaleString('pt-BR') }} {{ unitLabel }}(s)
          </dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500 dark:text-slate-400">Folhas do produto</dt>
          <dd class="text-sm font-medium text-slate-900 dark:text-white">
            {{ cost.totalSheets.toLocaleString('pt-BR') }}
            <span class="text-xs font-normal text-slate-500">({{ cost.sheetsPerUnit }}/{{ unitLabel }})</span>
          </dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500 dark:text-slate-400">Tiragem</dt>
          <dd class="text-sm font-medium text-slate-900 dark:text-white">
            {{ printRun(cost).toLocaleString('pt-BR') }} fls
            <span class="text-xs font-normal text-slate-500">impressas</span>
          </dd>
        </div>
      </dl>
    </section>

    <!-- Papel: o que foi comprado, em que tamanho, e quanto virou quebra -->
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Papel</h3>
        <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          A folha inteira é comprada uma vez, por mais impressões que receba; cada impressão acrescenta
          só a sua quebra de acerto.
        </p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50/50 text-xs uppercase text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
            <tr>
              <th class="px-5 py-3 font-semibold">Folha</th>
              <th class="px-5 py-3 font-semibold">Papel escolhido</th>
              <th class="px-5 py-3 font-semibold">Folha inteira</th>
              <th class="px-5 py-3 font-semibold">Formato de impressão</th>
              <th class="px-5 py-3 text-right font-semibold">Lâminas/Vias</th>
              <th class="px-5 py-3 text-right font-semibold">Tiragem</th>
              <th class="px-5 py-3 text-right font-semibold">Quebra</th>
              <th class="px-5 py-3 text-right font-semibold">Folhas inteiras</th>
              <th class="px-5 py-3 text-right font-semibold">R$/folha</th>
              <th class="px-5 py-3 text-right font-semibold">Custo</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
            <tr v-for="sheet in cost.sheets" :key="`papel-${sheet.kind}-${sheet.number}`">
              <td class="px-5 py-3 font-medium text-slate-900 dark:text-white">
                {{ sheetName(sheet.kind, sheet.number) }}
              </td>
              <td class="px-5 py-3 text-slate-700 dark:text-slate-200">
                {{ sheet.chosen.paperCode }}
                <span class="block text-xs text-slate-500 dark:text-slate-400">{{ sheet.paperTypeName }} · {{ sheet.paperWeightGsm }} g/m²</span>
              </td>
              <td class="px-5 py-3 text-slate-700 dark:text-slate-200">{{ sheet.chosen.wholeFormatName }}</td>
              <td class="px-5 py-3 text-slate-700 dark:text-slate-200">
                {{ formatLabel(sheet.chosen.printFormatName, sheet.chosen.printFormatNumber) }}
                <span class="block text-xs text-slate-500 dark:text-slate-400">
                  {{ sheet.chosen.applicationsPerSheet }} aplicação(ões) por folha
                </span>
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {{ sheet.requiredSheets.toLocaleString('pt-BR') }}
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {{ sheet.chosen.printSheetsNet.toLocaleString('pt-BR') }}
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-amber-700 dark:text-amber-400">
                {{ sheet.chosen.wasteSheets.toLocaleString('pt-BR') }}
              </td>
              <td class="px-5 py-3 text-right tabular-nums font-medium text-slate-900 dark:text-white">
                {{ sheet.chosen.wholeSheets.toLocaleString('pt-BR') }}
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {{ brl(sheet.chosen.paperPricePerSheet) }}
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-900 dark:text-white">
                {{ brl(sheet.chosen.paperCost) }}
              </td>
            </tr>
          </tbody>
          <tfoot class="border-t-2 border-slate-200 bg-slate-50/50 dark:border-slate-600 dark:bg-slate-700/40">
            <tr>
              <td colspan="9" class="px-5 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                Total de papel
              </td>
              <td class="px-5 py-3 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                {{ brl(cost.paperCost) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>

    <!-- Uma tabela por impressão -->
    <section
      v-for="table in printingTables"
      :key="table.index"
      class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white">
          {{ table.name }}
          <span v-if="printingTables.length > 1" class="font-normal text-slate-500 dark:text-slate-400">
            — {{ table.index }}ª de {{ printingTables.length }} impressões
          </span>
        </h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50/50 text-xs uppercase text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
            <tr>
              <th class="px-5 py-3 font-semibold">Folha</th>
              <th class="px-5 py-3 font-semibold">Papel</th>
              <th class="px-5 py-3 font-semibold">Cores</th>
              <th class="px-5 py-3 font-semibold">Cobertura</th>
              <th class="px-5 py-3 font-semibold">Impressora</th>
              <th class="px-5 py-3 text-right font-semibold">Aplicações</th>
              <th class="px-5 py-3 text-right font-semibold">Passadas</th>
              <th class="px-5 py-3 text-right font-semibold">Chapas</th>
              <th class="px-5 py-3 text-right font-semibold">Tinta</th>
              <th class="px-5 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
            <tr v-for="row in table.rows" :key="`${row.sheet.kind}-${row.sheet.number}`">
              <td class="px-5 py-3 font-medium text-slate-900 dark:text-white">
                {{ sheetName(row.sheet.kind, row.sheet.number) }}
              </td>
              <td class="px-5 py-3 text-slate-700 dark:text-slate-200">{{ row.sheet.paperTypeName }}</td>
              <td class="px-5 py-3 tabular-nums text-slate-700 dark:text-slate-200">
                <template v-if="row.pass">{{ row.pass.frontColors }}x{{ row.pass.backColors }}</template>
                <span v-else class="text-slate-400 dark:text-slate-500">fora desta impressão</span>
              </td>
              <td class="px-5 py-3 tabular-nums text-slate-700 dark:text-slate-200">
                <template v-if="row.pass">
                  {{ row.pass.frontCoveragePercent }}%<span v-if="row.pass.backColors > 0"> / {{ row.pass.backCoveragePercent }}%</span>
                </template>
                <span v-else class="text-slate-400 dark:text-slate-500">—</span>
              </td>
              <td class="px-5 py-3 text-slate-700 dark:text-slate-200">{{ row.pass?.machineName ?? '—' }}</td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {{ row.sheet.chosen.applicationsPerSheet }}
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                <template v-if="row.pass">{{ row.pass.passes }}</template>
                <span v-else>—</span>
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                <template v-if="row.pass">
                  {{ brl(row.pass.plateCost) }}
                  <span class="block text-xs text-slate-500 dark:text-slate-400">
                    {{ row.pass.plateCount }} × {{ row.pass.plateSupplyName ?? 'sem chapa' }}
                  </span>
                </template>
                <span v-else>—</span>
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                <template v-if="row.pass">
                  {{ brl(row.pass.inkCost) }}
                  <span class="block text-xs text-slate-500 dark:text-slate-400">
                    {{ row.pass.inkGrams.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }} g
                  </span>
                </template>
                <span v-else>—</span>
              </td>
              <td class="px-5 py-3 text-right tabular-nums font-medium text-slate-900 dark:text-white">
                <template v-if="row.pass">
                  {{ brl(row.pass.plateCost + row.pass.inkCost + row.pass.printCost) }}
                </template>
                <span v-else>—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="border-t border-slate-200 px-5 py-4 dark:border-slate-700">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Tempo de máquina, etapa por etapa
        </h4>
        <div class="mt-3 grid gap-4 lg:grid-cols-2">
          <div
            v-for="row in table.rows.filter((r) => r.pass)"
            :key="`etapas-${table.index}-${row.sheet.number}-${row.sheet.kind}`"
            class="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
          >
            <p class="text-xs font-medium text-slate-900 dark:text-white">
              {{ sheetName(row.sheet.kind, row.sheet.number) }} — {{ row.pass!.machineName }}
              <span v-if="row.pass!.passes > 1" class="font-normal text-slate-500 dark:text-slate-400">
                · {{ row.pass!.passes }} passadas
              </span>
              <span class="block font-normal text-slate-500 dark:text-slate-400">
                {{ row.pass!.sheetsRun.toLocaleString('pt-BR') }} fls a
                {{ Math.round(row.pass!.sheetsPerHour).toLocaleString('pt-BR') }} fls/h
              </span>
            </p>
            <table class="mt-2 w-full text-left text-xs">
              <tbody>
                <tr v-for="stage in row.pass!.timeStages" :key="stage.name" class="align-baseline">
                  <td class="py-0.5 pr-2 text-slate-700 dark:text-slate-200">{{ stage.name }}</td>
                  <td class="py-0.5 pr-2 text-slate-500 dark:text-slate-400">{{ stage.detail }}</td>
                  <td class="py-0.5 text-right tabular-nums text-slate-900 dark:text-white">
                    {{ stage.minutes.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }} min
                  </td>
                </tr>
                <tr class="border-t border-slate-200 font-medium dark:border-slate-700">
                  <td class="py-1 pr-2 text-slate-900 dark:text-white">Total</td>
                  <td class="py-1 pr-2 text-slate-500 dark:text-slate-400">
                    acerto {{ Math.round(row.pass!.setupMinutes) }} + rodagem
                    {{ Math.round(row.pass!.runMinutes) }}
                  </td>
                  <td class="py-1 text-right tabular-nums text-slate-900 dark:text-white">
                    {{ row.pass!.minutes.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }} min
                    <span class="block font-normal text-slate-500 dark:text-slate-400">
                      {{ brl(row.pass!.printCost) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            <template v-if="row.pass!.speedStages.length">
              <p class="mt-3 text-xs font-medium text-slate-900 dark:text-white">
                Velocidade efetiva
              </p>
              <table class="mt-1 w-full text-left text-xs">
                <tbody>
                  <tr v-for="stage in row.pass!.speedStages" :key="stage.name" class="align-baseline">
                    <td class="py-0.5 pr-2 text-slate-700 dark:text-slate-200">{{ stage.name }}</td>
                    <td class="py-0.5 pr-2 text-slate-500 dark:text-slate-400">{{ stage.detail }}</td>
                    <td
                      class="py-0.5 text-right tabular-nums"
                      :class="stage.sheetsPerHour < 0
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-slate-900 dark:text-white'"
                    >
                      {{ stage.sheetsPerHour.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }} fls/h
                    </td>
                  </tr>
                  <tr class="border-t border-slate-200 font-medium dark:border-slate-700">
                    <td class="py-1 pr-2 text-slate-900 dark:text-white" colspan="2">Efetiva</td>
                    <td class="py-1 text-right tabular-nums text-slate-900 dark:text-white">
                      {{ Math.round(row.pass!.sheetsPerHour).toLocaleString('pt-BR') }} fls/h
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
          </div>
        </div>
      </div>

      <div v-if="planNotes.length" class="border-t border-slate-200 px-5 py-4 dark:border-slate-700">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Observações do cálculo
        </h4>
        <ul class="mt-2 space-y-1">
          <li v-for="note in planNotes" :key="note" class="text-xs text-slate-600 dark:text-slate-300">
            {{ note }}
          </li>
        </ul>
      </div>
    </section>

    <!-- Memória de seleção: o que foi testado, e o que caiu -->
    <section
      v-for="block in selectionBlocks"
      :key="`selecao-${block.sheet.kind}-${block.sheet.number}`"
      class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white">
          Seleção de formato e impressora
          <span v-if="cost.sheets.length > 1" class="font-normal text-slate-500 dark:text-slate-400">
            — {{ sheetName(block.sheet.kind, block.sheet.number) }}
          </span>
        </h3>
        <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          O motor testa papel × formato de impressão × impressora e fica com o mais barato. Abaixo,
          o que foi testado — e, recolhido no fim, o que não pôde ser usado, com o motivo.
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50/50 text-xs uppercase text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
            <tr>
              <th class="px-5 py-3 font-semibold">Papel</th>
              <th class="px-5 py-3 font-semibold">Formato de impressão</th>
              <th class="px-5 py-3 text-right font-semibold">Aplicações</th>
              <th class="px-5 py-3 font-semibold">Impressora</th>
              <th class="px-5 py-3 text-right font-semibold">Tiragem</th>
              <th class="px-5 py-3 text-right font-semibold">Folhas inteiras</th>
              <!--
                O número desta coluna é o custo TOTAL da combinação — papel, chapa, tinta e máquina.
                Chamá-lo de "custo da folha" fazia o orçamentista procurar o preço do papel e não
                achar: o que está ali é a folha já impressa.
              -->
              <th class="px-5 py-3 text-right font-semibold">Custo da folha + impressão</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
            <tr
              v-for="(entry, index) in block.considered"
              :key="`viavel-${index}`"
              :class="entry.outcome === 'CHOSEN' ? 'bg-emerald-50/60 dark:bg-emerald-900/20' : ''"
            >
              <td class="px-5 py-3 text-slate-700 dark:text-slate-200">
                {{ entry.paperCode ?? '—' }}
                <span
                  v-if="entry.outcome === 'CHOSEN'"
                  class="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                >
                  usado
                </span>
                <span class="block text-xs text-slate-500 dark:text-slate-400">
                  folha inteira {{ entry.wholeFormatName ?? '—' }}
                </span>
              </td>
              <td class="px-5 py-3 text-slate-700 dark:text-slate-200">{{ entryFormat(entry) }}</td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {{ entry.applicationsPerSheet ?? '—' }}
              </td>
              <td class="px-5 py-3 text-slate-700 dark:text-slate-200">{{ entry.machineName ?? '—' }}</td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {{ entry.printSheetsNet?.toLocaleString('pt-BR') ?? '—' }}
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {{ entry.wholeSheets?.toLocaleString('pt-BR') ?? '—' }}
              </td>
              <td
                class="px-5 py-3 text-right tabular-nums"
                :class="entry.outcome === 'CHOSEN'
                  ? 'font-semibold text-slate-900 dark:text-white'
                  : 'text-slate-700 dark:text-slate-200'"
              >
                {{ entry.totalCost !== null ? brl(entry.totalCost) : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <details v-if="block.rejected.length" class="border-t border-slate-200 dark:border-slate-700">
        <summary class="cursor-pointer px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          {{ block.rejected.length }} combinação(ões) descartada(s) — ver o motivo
        </summary>
        <ul class="divide-y divide-slate-100 dark:divide-slate-700/50">
          <li v-for="(entry, index) in block.rejected" :key="`recusa-${index}`" class="px-5 py-3">
            <p class="text-sm text-slate-800 dark:text-slate-100">
              <template v-if="entry.paperCode">{{ entry.paperCode }}</template>
              <template v-if="entry.printFormatName">
                <span v-if="entry.paperCode" class="text-slate-400"> · </span>{{ entryFormat(entry) }}
              </template>
              <template v-if="entry.machineName">
                <span v-if="entry.paperCode || entry.printFormatName" class="text-slate-400"> · </span>{{ entry.machineName }}
              </template>
              <span v-if="entry.applicationsPerSheet" class="text-xs text-slate-500 dark:text-slate-400">
                · {{ entry.applicationsPerSheet }} aplicação(ões)
              </span>
            </p>
            <p class="mt-0.5 text-xs text-amber-700 dark:text-amber-400">{{ entry.reason }}</p>
          </li>
        </ul>
      </details>
    </section>

    <!-- Cortes: as descidas vêm do cadastro de formatos -->
    <section v-if="cost.sheets.length" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Cortes</h3>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {{ cost.sheets[0]!.chosen.wholeFormatName }} →
        {{ formatLabel(cost.sheets[0]!.chosen.printFormatName, cost.sheets[0]!.chosen.printFormatNumber) }}:
        <strong>{{ cost.sheets[0]!.chosen.preCutDescents }} descidas</strong> antes de imprimir.
        Depois, {{ formatLabel(cost.sheets[0]!.chosen.printFormatName, cost.sheets[0]!.chosen.printFormatNumber) }} →
        {{ formatLabel(cost.finalFormatName, cost.sheets[0]!.chosen.finalFormatNumber) }} em
        {{ cost.sheets[0]!.chosen.applicationsPerSheet }} aplicações:
        <strong>{{ cost.sheets[0]!.chosen.refileDescents }} descidas</strong> no refile.
      </p>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        O cadastro conta as descidas a partir da folha inteira — o
        {{ formatLabel(cost.finalFormatName, cost.sheets[0]!.chosen.finalFormatNumber) }} custa
        {{ cost.sheets[0]!.chosen.finalFormatDescents }} delas. Na mesa do refile entra o
        {{ formatLabel(cost.sheets[0]!.chosen.printFormatName, cost.sheets[0]!.chosen.printFormatNumber) }},
        que é 1/{{ cost.sheets[0]!.chosen.printFormatNumber }} da folha:
        {{ cost.sheets[0]!.chosen.finalFormatDescents }} ÷ {{ cost.sheets[0]!.chosen.printFormatNumber }}, e
        a fração conta inteira porque não se desce meia faca.
      </p>

      <div v-if="cuttingSteps.length" class="mt-4 grid gap-4 lg:grid-cols-2">
        <div
          v-for="step in cuttingSteps"
          :key="`corte-${step.activityId}-${step.detail}`"
          class="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
        >
          <p class="text-xs font-medium text-slate-900 dark:text-white">
            {{ step.activityName }}
            <span class="font-normal text-slate-500 dark:text-slate-400">— {{ step.machineName }}</span>
            <span class="block font-normal text-slate-500 dark:text-slate-400">{{ step.detail }}</span>
          </p>
          <table class="mt-2 w-full text-left text-xs">
            <tbody>
              <tr v-for="stage in step.timeStages" :key="stage.name" class="align-baseline">
                <td class="py-0.5 pr-2 text-slate-700 dark:text-slate-200">{{ stage.name }}</td>
                <td class="py-0.5 pr-2 text-slate-500 dark:text-slate-400">{{ stage.detail }}</td>
                <td class="py-0.5 text-right tabular-nums text-slate-900 dark:text-white">
                  {{ stage.minutes.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }} min
                </td>
              </tr>
              <tr class="border-t border-slate-200 font-medium dark:border-slate-700">
                <td class="py-1 pr-2 text-slate-900 dark:text-white">Total</td>
                <td class="py-1 pr-2 text-slate-500 dark:text-slate-400">{{ brl(step.totalCost) }}</td>
                <td class="py-1 text-right tabular-nums text-slate-900 dark:text-white">
                  {{ step.totalMinutes.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }} min
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Acabamento nas máquinas: picote e grampo, cada um com a sua memória (atividade 035) -->
    <section
      v-if="machineFinishingSteps.length"
      class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Acabamento nas máquinas</h3>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        O tempo sai do cadastro de cada máquina; a etapa só informa o que o trabalho pede — quantos
        picotes, quantos grampos.
      </p>

      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <div
          v-for="step in machineFinishingSteps"
          :key="`acab-${step.activityId}-${step.detail}`"
          class="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
        >
          <p class="text-xs font-medium text-slate-900 dark:text-white">
            {{ step.activityName }}
            <span v-if="step.machineName" class="font-normal text-slate-500 dark:text-slate-400">
              — {{ step.machineName }}
            </span>
            <span class="block font-normal text-slate-500 dark:text-slate-400">{{ step.detail }}</span>
          </p>

          <table v-if="step.timeStages.length" class="mt-2 w-full text-left text-xs">
            <tbody>
              <tr v-for="stage in step.timeStages" :key="stage.name" class="align-baseline">
                <td class="py-0.5 pr-2 text-slate-700 dark:text-slate-200">{{ stage.name }}</td>
                <td class="py-0.5 pr-2 text-slate-500 dark:text-slate-400">{{ stage.detail }}</td>
                <td class="py-0.5 text-right tabular-nums text-slate-900 dark:text-white">
                  {{ stage.minutes.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }} min
                </td>
              </tr>
              <tr class="border-t border-slate-200 font-medium dark:border-slate-700">
                <td class="py-1 pr-2 text-slate-900 dark:text-white">Total</td>
                <td class="py-1 pr-2 text-slate-500 dark:text-slate-400">{{ brl(step.totalCost) }}</td>
                <td class="py-1 text-right tabular-nums text-slate-900 dark:text-white">
                  {{ step.totalMinutes.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }} min
                </td>
              </tr>
            </tbody>
          </table>

          <!-- O insumo consumido, aberto: é a parte que o cliente contesta -->
          <p
            v-if="step.supplyUsage"
            class="mt-2 rounded bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
          >
            <strong>{{ step.supplyUsage.supplyName }}</strong>: {{ step.supplyUsage.detail }} ×
            {{ brl(step.supplyUsage.unitCost) }}/{{ step.supplyUsage.unitLabel }} =
            {{ brl(step.supplyUsage.cost) }}
          </p>

          <!-- As máquinas avaliadas: a escolhida, as outras que dariam conta e as recusadas -->
          <ul v-if="(step.machineOptions?.length ?? 0) > 1" class="mt-2 space-y-1 text-xs">
            <li
              v-for="option in step.machineOptions"
              :key="option.machineId"
              :class="
                option.reason
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-slate-600 dark:text-slate-300'
              "
            >
              <template v-if="option.reason">{{ option.reason }}</template>
              <template v-else>
                {{ option.machineName }}:
                {{ option.minutes?.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }} min ·
                {{ brl(option.cost ?? 0) }}
                <span v-if="option.chosen" class="font-medium text-emerald-700 dark:text-emerald-300">— usada</span>
              </template>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Empacotamento: o peso, os pacotes e o embrulho -->
    <section
      v-if="packaging"
      class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <div class="flex items-baseline justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white">
          Empacotamento
          <span class="font-normal text-slate-500 dark:text-slate-400">— {{ packaging.activityName }}</span>
        </h3>
        <span class="text-sm tabular-nums text-slate-900 dark:text-white">{{ brl(packaging.totalCost) }}</span>
      </div>

      <!-- O peso, folha por folha: é a conta que o orçamentista refaz na mão -->
      <div class="px-5 py-4">
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Peso pelo formato final entregue:
          <strong class="text-slate-700 dark:text-slate-200">
            {{ format(packaging.widthMm, { withSuffix: false }) }} × {{ format(packaging.heightMm) }}
          </strong>
        </p>
        <table class="mt-2 w-full text-left text-xs">
          <thead class="text-slate-500 dark:text-slate-400">
            <tr>
              <th class="py-1 pr-3 font-medium">Folha</th>
              <th class="py-1 pr-3 font-medium">Papel</th>
              <th class="py-1 pr-3 font-medium">Conta</th>
              <th class="py-1 text-right font-medium">Peso</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
            <tr v-for="peso in packaging.weights" :key="`${peso.kind}-${peso.sheetNumber}`" class="align-baseline">
              <td class="py-1 pr-3 text-slate-800 dark:text-slate-100">{{ sheetName(peso.kind, peso.sheetNumber) }}</td>
              <td class="py-1 pr-3 text-slate-600 dark:text-slate-300">
                {{ peso.paperTypeName }} {{ peso.paperWeightGsm }} g/m²
              </td>
              <td class="py-1 pr-3 text-slate-500 dark:text-slate-400">
                {{ weightMath(peso.paperWeightGsm, peso.sheets) }}
              </td>
              <td class="py-1 text-right tabular-nums text-slate-900 dark:text-white">{{ kg(peso.weightKg) }}</td>
            </tr>
            <tr class="border-t border-slate-200 font-medium dark:border-slate-700">
              <td class="py-1 pr-3 text-slate-900 dark:text-white" colspan="3">Peso do trabalho</td>
              <td class="py-1 text-right tabular-nums text-slate-900 dark:text-white">
                {{ kg(packaging.totalWeightKg) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Os dados do pacote e o preço -->
      <dl class="grid gap-x-6 gap-y-2 border-t border-slate-200 px-5 py-4 text-xs sm:grid-cols-2 dark:border-slate-700">
        <div>
          <dt class="font-medium text-slate-900 dark:text-white">Pacotes</dt>
          <dd class="text-slate-600 dark:text-slate-300">
            {{ kg(packaging.totalWeightKg) }} ÷ {{ kg(packaging.packageWeightKg) }} =
            <strong>{{ packaging.packages }} pacote(s)</strong> de até {{ kg(packaging.packageWeightKg) }},
            com {{ packaging.piecesPerPackage.toLocaleString('pt-BR') }} folha(s) cada
          </dd>
        </div>
        <div>
          <dt class="font-medium text-slate-900 dark:text-white">Mão de obra — {{ packaging.taskName }}</dt>
          <dd class="text-slate-600 dark:text-slate-300">
            {{ packaging.minutesPerPackage }} min × {{ packaging.packages }} pacote(s) =
            {{ packaging.totalMinutes.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }} min a
            {{ brl(packaging.laborHourlyCost) }}/h = <strong>{{ brl(packaging.laborCost) }}</strong>
          </dd>
        </div>
        <div v-if="packaging.wrappingPaperName">
          <dt class="font-medium text-slate-900 dark:text-white">Embrulho — {{ packaging.wrappingPaperName }}</dt>
          <dd class="text-slate-600 dark:text-slate-300">
            {{ packaging.wrappingSheetsPerPackage }} folha(s) por pacote × {{ packaging.packages }} =
            {{ packaging.wrappingSheets }} folha(s) a {{ brl(packaging.wrappingPricePerSheet) }} =
            <strong>{{ brl(packaging.wrappingCost) }}</strong>
          </dd>
        </div>
        <div>
          <dt class="font-medium text-slate-900 dark:text-white">Total do empacotamento</dt>
          <dd class="text-slate-600 dark:text-slate-300">
            mão de obra + embrulho = <strong>{{ brl(packaging.totalCost) }}</strong>
          </dd>
        </div>
      </dl>
    </section>

    <!-- Etapas -->
    <section v-if="cost.steps.length" class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Etapas</h3>
      </div>
      <ul class="divide-y divide-slate-100 dark:divide-slate-700/50">
        <li v-for="(step, index) in cost.steps" :key="`${step.activityId}-${index}`" class="px-5 py-3">
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-slate-800 dark:text-slate-100">
              {{ step.activityName }}
              <span v-if="step.totalMinutes > 0" class="text-xs text-slate-500 dark:text-slate-400">
                · {{ Math.round(step.totalMinutes) }} min
              </span>
            </span>
            <span class="shrink-0 text-right">
              <span class="text-sm tabular-nums text-slate-900 dark:text-white">{{ brl(step.totalCost) }}</span>
              <span v-if="!step.countedInStepsTotal" class="block text-xs text-slate-400 dark:text-slate-500">
                já somado acima
              </span>
            </span>
          </div>
          <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ step.detail }}</p>
        </li>
      </ul>
    </section>

    <!-- Avisos do motor -->
    <section
      v-if="cost.warnings.length"
      class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
    >
      <p class="font-medium">Avisos do cálculo</p>
      <ul class="mt-1 list-disc pl-5">
        <li v-for="w in cost.warnings" :key="w">{{ w }}</li>
      </ul>
    </section>

    <!-- Fechamento -->
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <dl class="space-y-1.5">
        <div class="flex justify-between text-sm">
          <dt class="text-slate-600 dark:text-slate-300">Papel</dt>
          <dd class="tabular-nums text-slate-900 dark:text-white">{{ brl(cost.paperCost) }}</dd>
        </div>
        <div class="flex justify-between text-sm">
          <dt class="text-slate-600 dark:text-slate-300">Chapas</dt>
          <dd class="tabular-nums text-slate-900 dark:text-white">{{ brl(cost.plateCost) }}</dd>
        </div>
        <div class="flex justify-between text-sm">
          <dt class="text-slate-600 dark:text-slate-300">Tinta</dt>
          <dd class="tabular-nums text-slate-900 dark:text-white">{{ brl(cost.inkCost) }}</dd>
        </div>
        <div class="flex justify-between text-sm">
          <dt class="text-slate-600 dark:text-slate-300">Impressão</dt>
          <dd class="tabular-nums text-slate-900 dark:text-white">{{ brl(cost.printCost) }}</dd>
        </div>
        <div class="flex justify-between text-sm">
          <dt class="text-slate-600 dark:text-slate-300">Etapas</dt>
          <dd class="tabular-nums text-slate-900 dark:text-white">{{ brl(cost.stepsCost) }}</dd>
        </div>
        <div class="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold dark:border-slate-700">
          <dt class="text-slate-900 dark:text-white">Total do produto</dt>
          <dd class="tabular-nums text-indigo-700 dark:text-indigo-300">{{ brl(cost.totalCost) }}</dd>
        </div>
        <div class="flex justify-between text-sm">
          <dt class="text-slate-500 dark:text-slate-400">Por {{ unitLabel }}</dt>
          <dd class="tabular-nums text-slate-700 dark:text-slate-200">{{ brl(cost.unitCost) }}</dd>
        </div>
      </dl>
    </section>
  </div>

  <p
    v-else
    class="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400"
  >
    O cálculo ainda não foi feito — complete a configuração e o motor devolve a memória aqui.
  </p>
</template>
