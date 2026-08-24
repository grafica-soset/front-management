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
import { brl, printRun } from '@/utils/quoteModel'

const store = useQuoteDraftStore()
const { format } = useUnitConverter()

const cost = computed(() => store.draftCost)

/**
 * Imprime só o resumo. Quem tira o resto da página do caminho é o `print:hidden` de cada bloco,
 * com o CSS de impressão isolando este bloco pelo id — nada de abrir uma segunda janela e ter que
 * carregar estilo de novo lá dentro.
 */
const print = () => window.print()
const unitLabel = computed(() => (store.draft?.structure === 'BLADE' ? 'peça' : 'bloco'))

const sheetName = (kind: string, number: number) =>
  `${kind === 'BLADE' ? 'Lâmina' : kind === 'COVER' ? 'Capa' : 'Via'} ${number}`

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
        <h2 class="text-base font-semibold text-slate-900 dark:text-white">{{ cost.name || 'Produto sem nome' }}</h2>
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
          <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ cost.finalFormatName }}</dd>
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
              <th class="px-5 py-3 text-right font-semibold">Peças</th>
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
                {{ sheet.chosen.printFormatName }}
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
              <th class="px-5 py-3 font-semibold">Formato de impressão</th>
              <th class="px-5 py-3 text-right font-semibold">Aplicações</th>
              <th class="px-5 py-3 text-right font-semibold">Passadas</th>
              <th class="px-5 py-3 text-right font-semibold">Quebra</th>
              <th class="px-5 py-3 text-right font-semibold">Chapas</th>
              <th class="px-5 py-3 text-right font-semibold">Tinta</th>
              <th class="px-5 py-3 text-right font-semibold">Máquina</th>
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
              <td class="px-5 py-3 text-slate-700 dark:text-slate-200">
                {{ row.sheet.chosen.paperCode }} — {{ row.sheet.chosen.printFormatName }}
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {{ row.sheet.chosen.applicationsPerSheet }}
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                <template v-if="row.pass">{{ row.pass.passes }}</template>
                <span v-else>—</span>
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-amber-700 dark:text-amber-400">
                {{ row.pass ? row.pass.wasteSheets.toLocaleString('pt-BR') : '—' }}
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
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                <template v-if="row.pass">
                  {{ brl(row.pass.printCost) }}
                  <span class="block text-xs text-slate-500 dark:text-slate-400">
                    {{ Math.round(row.pass.minutes) }} min
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
    </section>

    <!-- Cortes: as descidas vêm do cadastro de formatos -->
    <section v-if="cost.sheets.length" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Cortes</h3>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {{ cost.sheets[0]!.chosen.wholeFormatName }} → {{ cost.sheets[0]!.chosen.printFormatName }}:
        <strong>{{ cost.sheets[0]!.chosen.preCutDescents }} descidas</strong> antes de imprimir.
        Depois, {{ cost.sheets[0]!.chosen.printFormatName }} → {{ cost.finalFormatName }} em
        {{ cost.sheets[0]!.chosen.applicationsPerSheet }} aplicações:
        <strong>{{ cost.sheets[0]!.chosen.refileDescents }} descidas</strong> no refile.
      </p>
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
