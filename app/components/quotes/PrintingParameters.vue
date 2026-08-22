<script setup lang="ts">
/**
 * Configuração de UMA etapa de impressão (atividade 034).
 *
 * Cada etapa de impressão tem a SUA configuração completa — cores, tintas e máquina — e os custos
 * se somam. É comum a segunda impressão pegar só uma via (um carimbo, uma cor a mais numa folha):
 * a folha que não entra nesta passada é zerada aqui, sem afetar a outra.
 *
 * As OPÇÕES DE IMPRESSORA comparam (papel × máquina) com total, quebra, tempo e folha. Escolhida
 * a máquina, as outras somem — o X devolve a lista.
 *
 * As TINTAS vêm DEPOIS da impressora, e não junto das cores: é a máquina que decide quais existem.
 * Toner e tinta offset não se misturam, e escolher antes seria escolher no escuro. São por face —
 * a frente pode ser CMYK e o verso um Pantone.
 */
import { computed } from 'vue'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import type { QuoteSheet, QuoteStep } from '@/types/QuoteDraft'
import MachineOptionCard from '@/components/quotes/MachineOptionCard.vue'
import {
  brl,
  colorsLabel,
  coverageIssues,
  coverageLabel,
  inkIssues,
  isSheetPrinted,
  machineForSheet,
  setupFor,
  sheetLabel,
  sheetsForSheet,
} from '@/utils/quoteModel'
import { useQuoteCatalogs } from '@/composables/useQuoteCatalogs'
import type { SheetCostingResponse } from '@/types/Quote'

const props = defineProps<{
  step: QuoteStep
  /** Posição desta impressão no produto (1ª, 2ª...) — casa com o índice que o motor devolve. */
  printingIndex: number
}>()

const store = useQuoteDraftStore()
const catalogs = useQuoteCatalogs()
const product = computed(() => store.draft!)
const printing = computed(() => props.step.printing!)

const findMachine = (id: number | null) => catalogs.findMachine(id)
const findPaperType = (id: number | null) => catalogs.findPaperType(id)

const setup = (sheet: QuoteSheet) => setupFor(props.step, sheet)
const paperOf = (sheet: QuoteSheet) => findPaperType(sheet.paperTypeId)
const printsSheet = (sheet: QuoteSheet) => isSheetPrinted(sheet, setup(sheet))

const bodySheets = computed(() => product.value.sheets.filter((s) => s.kind !== 'COVER'))
const coverSheets = computed(() => product.value.sheets.filter((s) => s.kind === 'COVER'))
const printedBody = computed(() => bodySheets.value.filter(printsSheet))
const printedSheets = computed(() => product.value.sheets.filter(printsSheet))
const printedCovers = computed(() => coverSheets.value.filter(printsSheet))

/**
 * Opções de impressora vindas do MOTOR: cada plano avaliado (papel × formato × máquina) vira uma
 * linha, ficando a mais barata de cada máquina. Sem cálculo ainda, a lista vem vazia.
 */
const costingOf = (sheet: QuoteSheet): SheetCostingResponse | undefined =>
  store.draftCost?.sheets.find((s) => s.kind === sheet.kind && s.number === sheet.index)

const optionsFor = (sheets: QuoteSheet[]) => {
  const costing = sheets[0] ? costingOf(sheets[0]) : undefined
  if (!costing) return []
  const best = new Map<number, {
    machineId: number; machineName: string; machineType: 'OFFSET' | 'DIGITAL'
    total: number; waste: number; minutes: number
    sheetLabel: string; applicationsPerSheet: number; motherSheets: number
  }>()
  // Com formato escolhido pelo usuário, a comparação de impressoras fica dentro dele — senão a
  // linha da máquina anunciaria um formato diferente do que o cálculo está usando.
  const pinned = sheets[0]?.printFormatNumber ?? null
  for (const plan of [costing.chosen, ...costing.alternatives]) {
    if (pinned !== null && plan.printFormatNumber !== pinned) continue
    const pass = plan.printings.find((p) => p.printingIndex === props.printingIndex)
    if (!pass) continue
    const atual = best.get(pass.machineId)
    if (atual && atual.total <= plan.totalCost) continue
    best.set(pass.machineId, {
      machineId: pass.machineId,
      machineName: pass.machineName,
      machineType: pass.machineType,
      total: plan.totalCost,
      waste: pass.wasteSheets,
      minutes: pass.minutes,
      sheetLabel: `${plan.paperCode} — ${plan.printFormatName}`,
      applicationsPerSheet: plan.applicationsPerSheet,
      motherSheets: plan.motherSheets,
    })
  }
  return Array.from(best.values()).sort((a, b) => a.total - b.total)
}
const bodyOptions = computed(() => optionsFor(printedBody.value))
const coverOptions = computed(() => optionsFor(printedCovers.value))

/**
 * Formatos de impressão oferecidos para UMA folha, montados a partir dos planos que o motor já
 * avaliou — o escolhido mais as alternativas.
 *
 * Só entram os formatos da FOLHA-MÃE em uso: se o papel é 66x96, a lista é a tabela de conversões
 * do 66x96. Formatos de outra folha-mãe não são alternativa nenhuma — trocá-los seria trocar o
 * papel, que é outra decisão.
 *
 * De cada formato fica o plano mais barato, e o critério vai junto: quantas aplicações do formato
 * final cabem nele, que é o número que manda no custo.
 */
const formatOptionsFor = (sheet: QuoteSheet) => {
  const costing = costingOf(sheet)
  if (!costing) return []
  const motherFormat = costing.chosen.motherFormatName
  const best = new Map<number, {
    formatNumber: number; name: string; applications: number; finalFormatNumber: number
    total: number; printSheets: number; motherSheets: number
    preCutDescents: number; refileDescents: number
  }>()
  for (const plan of [costing.chosen, ...costing.alternatives]) {
    if (plan.motherFormatName !== motherFormat) continue
    const atual = best.get(plan.printFormatNumber)
    if (atual && atual.total <= plan.totalCost) continue
    best.set(plan.printFormatNumber, {
      formatNumber: plan.printFormatNumber,
      name: plan.printFormatName,
      applications: plan.applicationsPerSheet,
      finalFormatNumber: plan.finalFormatNumber,
      total: plan.totalCost,
      printSheets: plan.printSheetsNet,
      motherSheets: plan.motherSheets,
      preCutDescents: plan.preCutDescents,
      refileDescents: plan.refileDescents,
    })
  }
  return Array.from(best.values()).sort((a, b) => a.total - b.total)
}

/**
 * O formato marcado na lista: o que o usuário escolheu ou, na falta de escolha, o que o motor está
 * usando. A escolha do usuário vem primeiro para o clique acender na hora — o recálculo leva alguns
 * décimos, e até ele voltar o plano ainda é o anterior.
 */
const currentFormat = (sheet: QuoteSheet) =>
  sheet.printFormatNumber ?? costingOf(sheet)?.chosen.printFormatNumber ?? null

/**
 * Chapas a oferecer NESTA impressão: as que a impressora escolhida aceita. A digital não usa
 * matriz, então nem o campo aparece — e quando a impressora aceita um tipo só, o motor resolve
 * sozinho, sem perguntar nada.
 */
const chosenMachine = computed(() => catalogs.findMachine(printing.value.machineId))

const plateOptions = computed(() => {
  const machine = chosenMachine.value
  if (!machine || machine.machineType === 'DIGITAL') return []
  const accepted = machine.acceptedPlateTypes ?? []
  if (accepted.length === 0) return []
  return catalogs.plates.value.filter((plate) => !plate.plateType || accepted.includes(plate.plateType))
})

/** Só vale perguntar quando a impressora aceita mais de um TIPO de chapa. */
const asksForPlate = computed(() => {
  const accepted = chosenMachine.value?.acceptedPlateTypes ?? []
  return accepted.length > 1 && plateOptions.value.length > 1
})

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

/**
 * Tintas que a impressora da folha realmente imprime.
 *
 * O SUBTIPO separa os mundos — toner na digital, tinta offset na offset, serigráfica na
 * serigrafia — e oferecer os dois juntos é oferecer o que a máquina não roda. O TIPO (CMYK ou
 * Pantone) filtra o que ela aceita naquele trabalho.
 */
const inksFor = (sheet: QuoteSheet) => {
  const machine = catalogs.findMachine(machineForSheet(props.step, sheet))
  if (!machine) return []
  return catalogs.inks.value.filter((ink) => {
    if (ink.inkSubtype && machine.inkSubtype && ink.inkSubtype !== machine.inkSubtype) return false
    const aceitos = machine.acceptedInkColorTypes ?? []
    if (ink.inkColorType && aceitos.length > 0 && !aceitos.includes(ink.inkColorType)) return false
    return true
  })
}

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
const machineNameOf = (sheet: QuoteSheet) => findMachine(machineForSheet(props.step, sheet))?.value ?? null

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
        Quantas cores e quanta cobertura em cada via/lâmina{{ coverSheets.length ? ' e capa' : '' }}.
        Zero cores nas duas faces = a folha não entra nesta impressão. As tintas vêm depois, junto
        com a impressora.
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

          <!-- Formato de impressão: em que tamanho a folha-mãe entra na máquina. -->
          <div v-if="printsSheet(sheet)" class="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h5 class="text-xs font-semibold text-slate-900 dark:text-white">
                Formato de impressão
                <span v-if="costingOf(sheet)" class="font-normal text-slate-500 dark:text-slate-400">
                  — da folha {{ costingOf(sheet)!.chosen.motherFormatName }}
                </span>
              </h5>
              <button
                v-if="sheet.printFormatNumber !== null"
                type="button"
                @click="store.setPrintFormat(sheet.uid, null)"
                class="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Voltar à escolha do sistema
              </button>
            </div>

            <p v-if="!formatOptionsFor(sheet).length" class="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Complete a configuração para o motor listar os formatos.
            </p>

            <template v-else>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Quantas aplicações da peça cabem na folha que entra na máquina — quanto mais
                aplicações, menos folhas para imprimir, mas o corte e a quebra mudam junto.
              </p>
              <div class="mt-2 grid gap-2 sm:grid-cols-2">
                <button
                  v-for="(option, index) in formatOptionsFor(sheet)"
                  :key="option.formatNumber"
                  type="button"
                  @click="store.setPrintFormat(sheet.uid, option.formatNumber)"
                  class="rounded-lg border p-3 text-left transition-colors"
                  :class="
                    currentFormat(sheet) === option.formatNumber
                      ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/30'
                      : 'border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700'
                  "
                >
                  <span class="flex flex-wrap items-center justify-between gap-1">
                    <span class="text-sm font-semibold text-slate-900 dark:text-white">
                      {{ option.name }}
                      <span class="font-normal text-slate-500 dark:text-slate-400">
                        · formato {{ option.formatNumber }}
                      </span>
                    </span>
                    <span class="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      {{ brl(option.total) }}
                    </span>
                  </span>
                  <span class="mt-1 block text-xs tabular-nums text-slate-600 dark:text-slate-300">
                    {{ option.finalFormatNumber }} ÷ {{ option.formatNumber }} =
                    <strong>{{ option.applications }} aplicações</strong> por folha
                  </span>
                  <span class="mt-0.5 block text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {{ option.printSheets.toLocaleString('pt-BR') }} folhas na máquina ·
                    {{ option.motherSheets.toLocaleString('pt-BR') }} folhas-mãe ·
                    {{ option.preCutDescents }}+{{ option.refileDescents }} descidas de faca
                  </span>
                  <span
                    v-if="index === 0"
                    class="mt-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  >
                    Mais barato — escolha do sistema
                  </span>
                </button>
              </div>
              <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
                O formato é da folha: vale para todas as impressões que passarem por ela. O total
                compara papel, máquina, chapas e tinta — <strong>o corte fica de fora</strong>, por
                isso as descidas de faca aparecem aqui para você pesar.
              </p>
            </template>
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

      <div v-if="asksForPlate" class="mt-3">
        <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200">
          Chapa desta impressão — {{ chosenMachine?.value }}
        </label>
        <select
          v-model.number="printing.plateSupplyId"
          class="block w-full max-w-md rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        >
          <option :value="null">A mais barata compatível</option>
          <option v-for="chapa in plateOptions" :key="chapa.id" :value="chapa.id">{{ chapa.value }}</option>
        </select>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Uma chapa por cor, por lado, nesta impressão. Esta impressora aceita mais de um tipo, e a
          diferença de preço entre eles é grande — por isso a escolha é sua.
        </p>
      </div>

      <div v-if="!printing.perSheet" class="mt-3 space-y-2">
        <p v-if="printedBody.length === 0" class="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
          Nenhuma via/lâmina com cores — esta impressão não roda o corpo do produto.
        </p>
        <p v-else-if="!bodyOptions.length" class="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
          Complete a configuração para o motor calcular as opções de impressora.
        </p>
        <template v-else-if="printing.machineId">
          <MachineOptionCard
            v-for="option in bodyOptions.filter((o) => o.machineId === printing.machineId)"
            :key="option.machineId"
            :option="option"
            :best="option.machineId === bodyOptions[0]?.machineId"
            :best-total="bodyOptions[0]?.total ?? 0"
            :selected="true"
            clearable
            @clear="store.setMachine(step.uid, 'PRODUCT', null)"
          />
        </template>
        <MachineOptionCard
          v-for="(option, index) in printing.machineId ? [] : bodyOptions"
          :key="option.machineId"
          :option="option"
          :best="index === 0"
          :best-total="bodyOptions[0]?.total ?? 0"
          :selected="false"
          @select="store.setMachine(step.uid, 'PRODUCT', option.machineId)"
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
                v-for="option in optionsFor([sheet]).filter((o) => o.machineId === printing.machineIdBySheet[sheet.uid])"
                :key="option.machineId"
                :option="option"
                :best="option.machineId === optionsFor([sheet])[0]?.machineId"
                :best-total="optionsFor([sheet])[0]?.total ?? 0"
                :selected="true"
                clearable
                @clear="store.setMachine(step.uid, sheet.uid, null)"
              />
            </template>
            <MachineOptionCard
              v-for="(option, index) in printing.machineIdBySheet[sheet.uid] ? [] : optionsFor([sheet])"
              :key="option.machineId"
              :option="option"
              :best="index === 0"
              :best-total="optionsFor([sheet])[0]?.total ?? 0"
              :selected="false"
              @select="store.setMachine(step.uid, sheet.uid, option.machineId)"
            />
          </div>
        </div>
      </div>
    </section>


    <!-- ─── 3. Tintas ────────────────────────────────────────────────────── -->
    <section v-if="printedSheets.length">
      <h4 class="text-sm font-semibold text-slate-900 dark:text-white">Tintas</h4>
      <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        Vêm depois da impressora: são as que ela imprime. Toner e tinta offset não se misturam, e
        trocar de máquina pode derrubar a seleção.
      </p>

      <div class="mt-3 space-y-3">
        <div
          v-for="sheet in printedSheets"
          :key="`tintas-${sheet.uid}`"
          class="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm font-medium text-slate-900 dark:text-white">
              {{ sheetLabel(sheet) }}
              <span class="font-normal text-slate-500 dark:text-slate-400">
                — {{ colorsLabel(setup(sheet)) }}
              </span>
            </span>
            <span v-if="machineNameOf(sheet)" class="text-xs text-slate-500 dark:text-slate-400">
              {{ machineNameOf(sheet) }}
            </span>
          </div>

          <p v-if="!machineNameOf(sheet)" class="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Escolha a impressora acima para liberar as tintas.
          </p>

          <template v-else>
            <div v-for="face in (['front', 'back'] as const)" :key="face" class="mt-3">
              <div v-if="(face === 'front' ? setup(sheet).frontColors : setup(sheet).backColors) > 0" class="space-y-1.5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {{ face === 'front' ? 'Frente' : 'Verso' }}
                    <span class="font-normal text-slate-500 dark:text-slate-400">
                      — {{ (face === 'front' ? setup(sheet).frontInkIds : setup(sheet).backInkIds).length }} de
                      {{ face === 'front' ? setup(sheet).frontColors : setup(sheet).backColors }}
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
                    Nenhuma tinta cadastrada que a {{ machineNameOf(sheet) }} imprima.
                  </span>
                </div>
              </div>
            </div>
            <p v-if="issuesOf(sheet).length" class="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Faltam tintas — {{ issuesOf(sheet).join(' · ') }}.
            </p>
          </template>
        </div>
      </div>
    </section>

    <!-- ─── 4. Capas ─────────────────────────────────────────────────────── -->
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
            v-for="option in coverOptions.filter((o) => o.machineId === printing.coverMachineId)"
            :key="option.machineId"
            :option="option"
            :best="option.machineId === coverOptions[0]?.machineId"
            :best-total="coverOptions[0]?.total ?? 0"
            :selected="true"
            clearable
            @clear="store.setMachine(step.uid, 'COVERS', null)"
          />
        </template>
        <MachineOptionCard
          v-for="(option, index) in printing.coverMachineId ? [] : coverOptions"
          :key="option.machineId"
          :option="option"
          :best="index === 0"
          :best-total="coverOptions[0]?.total ?? 0"
          :selected="false"
          @select="store.setMachine(step.uid, 'COVERS', option.machineId)"
        />
      </div>
    </section>
  </div>
</template>
