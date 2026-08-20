<script setup lang="ts">
/**
 * Configuração de UMA etapa de impressão (atividade 034).
 *
 * Cada etapa de impressão tem a SUA configuração completa — cores, tintas e máquina — e os custos
 * se somam. É comum a segunda impressão pegar só uma via (um carimbo, uma cor a mais numa folha):
 * a folha que não entra nesta passada é zerada aqui, sem afetar a outra.
 *
 * As OPÇÕES DE IMPRESSORA comparam (papel × máquina) com total, quebra, tempo e folha. Escolhida
 * a máquina, as outras somem — o X devolve a lista. As TINTAS vêm depois da impressora, e são por
 * face: a frente pode ser CMYK e o verso um Pantone.
 */
import { computed } from 'vue'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import type { QuoteSheet, QuoteStep } from '@/types/QuoteDraft'
import MachineOptionCard from '@/components/quotes/MachineOptionCard.vue'
import {
  colorsLabel,
  coverageIssues,
  coverageLabel,
  findMachine,
  findPaperType,
  inkIssues,
  inksForMachine,
  isSheetPrinted,
  machineForSheet,
  machineOptions,
  printedSides,
  setupFor,
  sheetLabel,
  sheetsForSheet,
} from '@/utils/quoteDemoData'

const props = defineProps<{ step: QuoteStep }>()

const store = useQuoteDraftStore()
const product = computed(() => store.draft!)
const printing = computed(() => props.step.printing!)

const setup = (sheet: QuoteSheet) => setupFor(props.step, sheet)
const paperOf = (sheet: QuoteSheet) => findPaperType(sheet.paperTypeId)
const printsSheet = (sheet: QuoteSheet) => isSheetPrinted(sheet, setup(sheet))

const bodySheets = computed(() => product.value.sheets.filter((s) => s.kind !== 'COVER'))
const coverSheets = computed(() => product.value.sheets.filter((s) => s.kind === 'COVER'))
const printedBody = computed(() => bodySheets.value.filter(printsSheet))
const printedCovers = computed(() => coverSheets.value.filter(printsSheet))

/** Opções de impressora para um conjunto de folhas nesta impressão. */
const optionsFor = (sheets: QuoteSheet[]) => machineOptions(product.value, props.step, sheets)
const bodyOptions = computed(() => optionsFor(printedBody.value))
const coverOptions = computed(() => optionsFor(printedCovers.value))

/** As cores são o interruptor: zero nas duas faces tira a folha desta impressão. */
const setColors = (sheet: QuoteSheet, face: 'front' | 'back', value: number) => {
  const colors = Math.max(0, Math.min(8, Math.floor(value || 0)))
  const current = setup(sheet)
  if (face === 'front') {
    current.frontColors = colors
    current.frontInkIds = current.frontInkIds.slice(0, colors)
  } else {
    current.backColors = colors
    current.backInkIds = current.backInkIds.slice(0, colors)
  }
  store.pruneInks()
}

/**
 * Taxa de cobertura da face, em % — é ela que dimensiona o consumo de tinta. Fica entre 1 e 100:
 * zero seria "não imprime", e quem não imprime zera as CORES, não a cobertura.
 */
const setCoverage = (sheet: QuoteSheet, face: 'front' | 'back', value: string) => {
  const current = setup(sheet)
  // Campo vazio volta a null — a cobertura é obrigatória e o trilho cobra enquanto faltar.
  const percent = value === '' ? null : Math.max(1, Math.min(100, Math.round(Number(value) || 0)))
  if (face === 'front') current.frontCoverage = percent
  else current.backCoverage = percent
}

/** Tintas aceitas pela impressora atribuída à folha. */
const inksFor = (sheet: QuoteSheet) => inksForMachine(machineForSheet(props.step, sheet))

const toggleInk = (sheet: QuoteSheet, face: 'front' | 'back', inkId: number) => {
  const current = setup(sheet)
  const selected = face === 'front' ? current.frontInkIds : current.backInkIds
  const limit = face === 'front' ? current.frontColors : current.backColors
  let next: number[]
  if (selected.includes(inkId)) next = selected.filter((id) => id !== inkId)
  else if (selected.length < limit) next = [...selected, inkId]
  else next = [...selected.slice(1), inkId]
  if (face === 'front') current.frontInkIds = next
  else current.backInkIds = next
}

const issuesOf = (sheet: QuoteSheet) => (printsSheet(sheet) ? inkIssues(setup(sheet)) : [])
const machineNameOf = (sheet: QuoteSheet) => findMachine(machineForSheet(props.step, sheet))?.name ?? null

const togglePerSheet = () => {
  printing.value.perSheet = !printing.value.perSheet
  if (printing.value.perSheet) {
    for (const sheet of printedBody.value) {
      printing.value.machineIdBySheet[sheet.uid] = printing.value.machineIdBySheet[sheet.uid] ?? printing.value.machineId
    }
  }
  store.pruneInks()
}

const toggleSeparateCovers = () => {
  printing.value.separateCovers = !printing.value.separateCovers
  if (printing.value.separateCovers) {
    printing.value.coverMachineId = printing.value.coverMachineId ?? printing.value.machineId
  }
  store.pruneInks()
}
</script>

<template>
  <div class="space-y-6">
    <!-- ─── 1. O que imprimir ────────────────────────────────────────────── -->
    <section>
      <h4 class="text-sm font-semibold text-slate-900 dark:text-white">Cores por face</h4>
      <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        Cores desta impressão em cada via/lâmina{{ coverSheets.length ? ' e capa' : '' }}. Zero nas
        duas faces = a folha não entra nesta impressão.
      </p>

      <div class="mt-3 space-y-3">
        <div v-for="sheet in product.sheets" :key="sheet.uid" class="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span
                class="rounded-md px-2 py-0.5 text-xs font-semibold"
                :class="
                  sheet.kind === 'COVER'
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                "
              >
                {{ sheetLabel(sheet) }}
              </span>
              <span class="text-sm text-slate-600 dark:text-slate-300">{{ paperOf(sheet)?.name ?? 'sem papel definido' }}</span>
            </div>
            <span v-if="printsSheet(sheet)" class="text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {{ colorsLabel(setup(sheet)) }} · {{ coverageLabel(setup(sheet)) }} ·
              {{ sheetsForSheet(product, sheet).toLocaleString('pt-BR') }} folhas
            </span>
            <span v-else class="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-600 dark:text-slate-200">
              Fora desta impressão
            </span>
          </div>

          <div class="mt-3 flex flex-wrap items-end gap-4">
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200">Cores na frente</label>
              <input
                :value="setup(sheet).frontColors"
                type="number"
                min="0"
                max="8"
                @input="setColors(sheet, 'front', Number(($event.target as HTMLInputElement).value))"
                class="w-24 rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div v-if="setup(sheet).frontColors > 0">
              <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200">
                Cobertura da frente (%) <span class="text-rose-500">*</span>
              </label>
              <input
                :value="setup(sheet).frontCoverage ?? ''"
                type="number"
                min="1"
                max="100"
                placeholder="obrigatório"
                @input="setCoverage(sheet, 'front', ($event.target as HTMLInputElement).value)"
                class="w-32 rounded-lg border bg-slate-50 p-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:bg-slate-700 dark:text-white"
                :class="setup(sheet).frontCoverage ? 'border-slate-300 dark:border-slate-600' : 'border-amber-400 dark:border-amber-500'"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200">Cores no verso</label>
              <input
                :value="setup(sheet).backColors"
                type="number"
                min="0"
                max="8"
                @input="setColors(sheet, 'back', Number(($event.target as HTMLInputElement).value))"
                class="w-24 rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div v-if="setup(sheet).backColors > 0">
              <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200">
                Cobertura do verso (%) <span class="text-rose-500">*</span>
              </label>
              <input
                :value="setup(sheet).backCoverage ?? ''"
                type="number"
                min="1"
                max="100"
                placeholder="obrigatório"
                @input="setCoverage(sheet, 'back', ($event.target as HTMLInputElement).value)"
                class="w-32 rounded-lg border bg-slate-50 p-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:bg-slate-700 dark:text-white"
                :class="setup(sheet).backCoverage ? 'border-slate-300 dark:border-slate-600' : 'border-amber-400 dark:border-amber-500'"
              />
            </div>
          </div>
          <p v-if="printsSheet(sheet)" class="mt-1 text-xs" :class="coverageIssues(setup(sheet)).length ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'">
            <template v-if="coverageIssues(setup(sheet)).length">
              Informe a cobertura d{{ coverageIssues(setup(sheet)).join(' e d') === 'frente' ? 'a frente' : 'o ' + coverageIssues(setup(sheet)).join(' e d') }}.
            </template>
            <template v-else>
              A cobertura é o quanto da <strong>peça final</strong> recebe tinta: texto corrido
              fica na faixa de 20–30%, fundo chapado chega a 100%. As cores dividem a gramatura que
              o papel absorve — numa 4 cores, cada tinta leva 25%.
            </template>
          </p>

          <!-- Tintas por face -->
          <div v-if="printsSheet(sheet)" class="mt-4 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-700">
            <div v-for="face in (['front', 'back'] as const)" :key="face">
              <div
                v-if="(face === 'front' ? setup(sheet).frontColors : setup(sheet).backColors) > 0"
                class="space-y-1.5"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-xs font-medium text-slate-700 dark:text-slate-200">
                    Tintas d{{ face === 'front' ? 'a frente' : 'o verso' }}
                    <span class="font-normal text-slate-500 dark:text-slate-400">
                      — {{ (face === 'front' ? setup(sheet).frontInkIds : setup(sheet).backInkIds).length }} de
                      {{ face === 'front' ? setup(sheet).frontColors : setup(sheet).backColors }}
                      <template v-if="machineNameOf(sheet)"> · aceitas na {{ machineNameOf(sheet) }}</template>
                    </span>
                  </span>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="ink in inksFor(sheet)"
                    :key="`${face}-${ink.id}`"
                    type="button"
                    @click="toggleInk(sheet, face, ink.id)"
                    class="rounded-full border px-3 py-1 text-xs transition-colors"
                    :class="
                      (face === 'front' ? setup(sheet).frontInkIds : setup(sheet).backInkIds).includes(ink.id)
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-300'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                    "
                  >
                    {{ ink.value }}
                  </button>
                  <span v-if="!inksFor(sheet).length" class="text-xs text-amber-600 dark:text-amber-400">
                    Nenhuma tinta cadastrada em Insumos.
                  </span>
                </div>
              </div>
            </div>
            <p v-if="issuesOf(sheet).length" class="text-xs text-amber-600 dark:text-amber-400">
              Faltam tintas — {{ issuesOf(sheet).join(' · ') }}.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── 2. Onde imprimir ─────────────────────────────────────────────── -->
    <section>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 class="text-sm font-semibold text-slate-900 dark:text-white">Impressora</h4>
          <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            A mais barata vem primeiro. Os totais somam papel, máquina e chapas desta impressão.
          </p>
        </div>
        <button
          v-if="printedBody.length"
          type="button"
          @click="togglePerSheet"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {{ printing.perSheet ? '← Usar uma impressora para o produto' : 'Selecionar impressora diferente por via/lâmina' }}
        </button>
      </div>

      <div v-if="!printing.perSheet" class="mt-3 space-y-2">
        <p v-if="printedBody.length === 0" class="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
          Nenhuma via/lâmina com cores — esta impressão não roda o corpo do produto.
        </p>
        <p v-else-if="!bodyOptions.length" class="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          Nenhuma impressora comporta este formato. Revise a dimensão final no passo 1.
        </p>
        <template v-else-if="printing.machineId">
          <MachineOptionCard
            v-for="option in bodyOptions.filter((o) => o.machine.id === printing.machineId)"
            :key="option.machine.id"
            :option="option"
            :best="option.machine.id === bodyOptions[0]?.machine.id"
            :best-total="bodyOptions[0]?.total ?? 0"
            :selected="true"
            clearable
            @clear="store.setMachine(step.uid, 'PRODUCT', null)"
          />
        </template>
        <MachineOptionCard
          v-for="(option, index) in printing.machineId ? [] : bodyOptions"
          :key="option.machine.id"
          :option="option"
          :best="index === 0"
          :best-total="bodyOptions[0]?.total ?? 0"
          :selected="false"
          @select="store.setMachine(step.uid, 'PRODUCT', option.machine.id)"
        />
      </div>

      <div v-else class="mt-3 space-y-4">
        <div v-for="sheet in printedBody" :key="sheet.uid">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {{ sheetLabel(sheet) }} — {{ colorsLabel(setup(sheet)) }}
          </p>
          <div class="space-y-2">
            <template v-if="printing.machineIdBySheet[sheet.uid]">
              <MachineOptionCard
                v-for="option in optionsFor([sheet]).filter((o) => o.machine.id === printing.machineIdBySheet[sheet.uid])"
                :key="option.machine.id"
                :option="option"
                :best="option.machine.id === optionsFor([sheet])[0]?.machine.id"
                :best-total="optionsFor([sheet])[0]?.total ?? 0"
                :selected="true"
                clearable
                @clear="store.setMachine(step.uid, sheet.uid, null)"
              />
            </template>
            <MachineOptionCard
              v-for="(option, index) in printing.machineIdBySheet[sheet.uid] ? [] : optionsFor([sheet])"
              :key="option.machine.id"
              :option="option"
              :best="index === 0"
              :best-total="optionsFor([sheet])[0]?.total ?? 0"
              :selected="false"
              @select="store.setMachine(step.uid, sheet.uid, option.machine.id)"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ─── 3. Capas ─────────────────────────────────────────────────────── -->
    <section v-if="coverSheets.length" class="rounded-xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900/60 dark:bg-violet-900/10">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 class="text-sm font-semibold text-slate-900 dark:text-white">Capas</h4>
          <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {{ coverSheets.length }} capa(s) por unidade —
            <template v-if="printedCovers.length === 0">nenhuma entra nesta impressão.</template>
            <template v-else>{{ printedCovers.length }} nesta impressão.</template>
          </p>
        </div>
        <button
          v-if="printedCovers.length"
          type="button"
          @click="toggleSeparateCovers"
          class="rounded-lg border border-violet-300 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/30"
        >
          {{ printing.separateCovers ? '← Rodar as capas junto com o produto' : 'Selecionar impressora diferente para as capas' }}
        </button>
      </div>

      <div v-if="printing.separateCovers && printedCovers.length" class="mt-3 space-y-2">
        <template v-if="printing.coverMachineId">
          <MachineOptionCard
            v-for="option in coverOptions.filter((o) => o.machine.id === printing.coverMachineId)"
            :key="option.machine.id"
            :option="option"
            :best="option.machine.id === coverOptions[0]?.machine.id"
            :best-total="coverOptions[0]?.total ?? 0"
            :selected="true"
            clearable
            @clear="store.setMachine(step.uid, 'COVERS', null)"
          />
        </template>
        <MachineOptionCard
          v-for="(option, index) in printing.coverMachineId ? [] : coverOptions"
          :key="option.machine.id"
          :option="option"
          :best="index === 0"
          :best-total="coverOptions[0]?.total ?? 0"
          :selected="false"
          @select="store.setMachine(step.uid, 'COVERS', option.machine.id)"
        />
      </div>
    </section>
  </div>
</template>
