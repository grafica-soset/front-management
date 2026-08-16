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
import {
  brl,
  colorsLabel,
  estimateProductCost,
  findActivity,
  findMachine,
  findPaperType,
  isSheetPrinted,
  machineForSheet,
  piecesPerSheet,
  printingSteps,
  setupFor,
  sheetLabel,
  sheetsForSheet,
  sheetsPerUnit,
} from '@/utils/quoteDemoData'

const store = useQuoteDraftStore()
const product = computed(() => store.draft!)
const { format } = useUnitConverter()

const cost = computed(() => estimateProductCost(product.value))
const unitLabel = computed(() => (product.value.structure === 'BLADE' ? 'peça' : 'bloco'))

/**
 * Uma tabela por IMPRESSÃO: cada etapa de impressão é uma passada pela máquina, com as suas cores
 * e o seu acerto. Ver as duas separadas é o que permite conferir por que o total é a soma.
 */
const printingTables = computed(() =>
  printingSteps(product.value).map((step, index) => ({
    step,
    index: index + 1,
    name: findActivity(step.activityId)?.name ?? 'Impressão',
    rows: product.value.sheets.map((sheet) => {
      const setup = setupFor(step, sheet)
      const printed = isSheetPrinted(sheet, setup)
      const machine = printed ? findMachine(machineForSheet(step, sheet)) : undefined
      return {
        sheet,
        setup,
        printed,
        paper: findPaperType(sheet.paperTypeId),
        machine,
        pieces: machine ? piecesPerSheet(product.value, machine) : 0,
        sheets: sheetsForSheet(product.value, sheet),
      }
    }),
  })),
)

const stepRows = computed(() =>
  product.value.steps.map((step) => ({
    step,
    activity: findActivity(step.activityId),
  })),
)
</script>

<template>
  <div class="space-y-4">
    <!-- Cabeçalho do produto -->
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 class="text-base font-semibold text-slate-900 dark:text-white">{{ product.name || 'Produto sem nome' }}</h2>
      <dl class="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt class="text-xs text-slate-500 dark:text-slate-400">Formato final</dt>
          <dd class="text-sm font-medium text-slate-900 dark:text-white">
            {{ format(product.widthMm) }} × {{ format(product.heightMm) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500 dark:text-slate-400">Tiragem</dt>
          <dd class="text-sm font-medium text-slate-900 dark:text-white">
            {{ (product.quantity ?? 0).toLocaleString('pt-BR') }} {{ unitLabel }}(s)
          </dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500 dark:text-slate-400">Estrutura</dt>
          <dd class="text-sm font-medium text-slate-900 dark:text-white">
            {{ product.structure === 'BLADE' ? `${product.blades} lâmina(s)` : `${product.sets} jogos × ${product.vias} vias` }}
            <span v-if="product.hasCovers"> + {{ product.coverCount }} capa(s)</span>
          </dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500 dark:text-slate-400">Folhas por {{ unitLabel }}</dt>
          <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ sheetsPerUnit(product) }}</dd>
        </div>
      </dl>
    </section>

    <!-- Uma tabela por impressão: os custos se somam -->
    <section
      v-for="table in printingTables"
      :key="table.step.uid"
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
              <th class="px-5 py-3 font-semibold">Impressora</th>
              <th class="px-5 py-3 font-semibold">Folha selecionada</th>
              <th class="px-5 py-3 text-right font-semibold">Encaixe</th>
              <th class="px-5 py-3 text-right font-semibold">Folhas</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
            <tr v-for="row in table.rows" :key="row.sheet.uid">
              <td class="px-5 py-3 font-medium text-slate-900 dark:text-white">{{ sheetLabel(row.sheet) }}</td>
              <td class="px-5 py-3 text-slate-700 dark:text-slate-200">{{ row.paper?.name ?? '—' }}</td>
              <td class="px-5 py-3 tabular-nums text-slate-700 dark:text-slate-200">
                <template v-if="row.printed">{{ colorsLabel(row.setup) }}</template>
                <span v-else class="text-slate-400 dark:text-slate-500">fora desta impressão</span>
              </td>
              <td class="px-5 py-3 text-slate-700 dark:text-slate-200">{{ row.machine?.name ?? '—' }}</td>
              <td class="px-5 py-3 text-slate-700 dark:text-slate-200">{{ row.machine?.sheetLabel ?? '—' }}</td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                <template v-if="row.printed">{{ row.pieces }} por folha</template>
                <span v-else class="text-slate-400 dark:text-slate-500">—</span>
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {{ row.sheets.toLocaleString('pt-BR') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Etapas -->
    <section v-if="stepRows.length" class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Etapas</h3>
      </div>
      <ul class="divide-y divide-slate-100 dark:divide-slate-700/50">
        <li v-for="row in stepRows" :key="row.step.uid" class="flex items-center justify-between gap-3 px-5 py-3">
          <span class="text-sm text-slate-800 dark:text-slate-100">{{ row.activity?.name }}</span>
          <span class="text-xs text-slate-500 dark:text-slate-400">
            <template v-if="row.activity?.paramKind === 'HOURS'">
              {{ row.step.parameters.laborHours ?? 0 }}h × {{ brl(row.activity.hourlyCost) }}/h
            </template>
            <template v-else-if="row.activity?.paramKind === 'STAPLES'">{{ row.step.parameters.staples ?? 0 }} grampo(s)</template>
            <template v-else-if="row.activity?.paramKind === 'HOLES'">{{ row.step.parameters.holes ?? 0 }} furo(s)</template>
            <template v-else-if="row.activity?.paramKind === 'FOLDS'">
              {{ row.step.parameters.parallelFolds ?? 0 }} paralela(s) / {{ row.step.parameters.crossFolds ?? 0 }} cruzada(s)
            </template>
            <template v-else-if="row.activity?.paramKind === 'NUMBERING'">
              {{ row.step.parameters.numberingUnits ?? 0 }} numerador(es)
            </template>
            <template v-else>calculada pelo sistema</template>
          </span>
        </li>
      </ul>
    </section>

    <!-- Fechamento -->
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div class="grid gap-4 sm:grid-cols-3">
        <div>
          <dt class="text-xs text-slate-500 dark:text-slate-400">Máquinas utilizadas</dt>
          <dd class="text-sm font-medium text-slate-900 dark:text-white">
            {{ cost.machinesUsed.length ? cost.machinesUsed.join(', ') : '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500 dark:text-slate-400">Tempo de trabalho</dt>
          <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ Math.round(cost.totalMinutes) }} min</dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500 dark:text-slate-400">Folhas compradas</dt>
          <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ cost.totalSheets.toLocaleString('pt-BR') }}</dd>
        </div>
      </div>

      <dl class="mt-5 space-y-1.5 border-t border-slate-200 pt-4 dark:border-slate-700">
        <div v-for="line in cost.lines" :key="line.label" class="flex justify-between text-sm">
          <dt class="text-slate-600 dark:text-slate-300">{{ line.label }}</dt>
          <dd class="tabular-nums text-slate-900 dark:text-white">{{ brl(line.value) }}</dd>
        </div>
        <div class="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold dark:border-slate-700">
          <dt class="text-slate-900 dark:text-white">Total do produto</dt>
          <dd class="tabular-nums text-indigo-700 dark:text-indigo-300">{{ brl(cost.total) }}</dd>
        </div>
        <div class="flex justify-between text-sm">
          <dt class="text-slate-500 dark:text-slate-400">Por {{ unitLabel }}</dt>
          <dd class="tabular-nums text-slate-700 dark:text-slate-200">{{ brl(cost.unitCost) }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>
