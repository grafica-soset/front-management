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
import { computed, watch } from 'vue'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import type { QuoteSheet, QuoteStep } from '@/types/QuoteDraft'
import MachineOptionCard from '@/components/quotes/MachineOptionCard.vue'
import CalculateButton from '@/components/quotes/CalculateButton.vue'
import {
  brl,
  colorsLabel,
  formatLabel,
  coverageIssues,
  coverageLabel,
  inkIssues,
  isSheetPrinted,
  machineForSheet,
  plateLabel,
  platesForMachine,
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
    sheetLabel: string; applicationsPerSheet: number; wholeSheets: number
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
      sheetLabel: `${plan.paperCode} — ${formatLabel(plan.printFormatName, plan.printFormatNumber)}`,
      applicationsPerSheet: plan.applicationsPerSheet,
      wholeSheets: plan.wholeSheets,
    })
  }
  return Array.from(best.values()).sort((a, b) => a.total - b.total)
}
const bodyOptions = computed(() => optionsFor(printedBody.value))
const coverOptions = computed(() => optionsFor(printedCovers.value))

/**
 * As impressoras que o motor testou e NÃO pôde usar, com o motivo — a resposta para "por que só
 * essas?".
 *
 * Fica ao lado da lista de propósito: é ali que a pergunta nasce, quando o orçamentista conhece uma
 * máquina que daria conta e não a encontra. Cada motivo aponta um lugar diferente para corrigir —
 * o cadastro da atividade, a faixa de formato da máquina ou a tabela de conversões do papel.
 */
const excludedMachines = (sheets: QuoteSheet[]) => {
  const costing = sheets[0] ? costingOf(sheets[0]) : undefined
  if (!costing) return []
  const usadas = new Set(
    (costing.selection ?? [])
      .filter((e) => e.outcome !== 'REJECTED' && e.machineId !== null)
      .map((e) => e.machineId as number),
  )
  const porMaquina = new Map<number, { name: string; reasons: string[] }>()
  for (const entry of costing.selection ?? []) {
    if (entry.outcome !== 'REJECTED' || entry.machineId === null || !entry.reason) continue
    if (usadas.has(entry.machineId)) continue
    const atual = porMaquina.get(entry.machineId) ?? { name: entry.machineName ?? '—', reasons: [] }
    if (!atual.reasons.includes(entry.reason)) atual.reasons.push(entry.reason)
    porMaquina.set(entry.machineId, atual)
  }
  return Array.from(porMaquina.values())
}
const excludedBody = computed(() => excludedMachines(printedBody.value))

/**
 * Formatos de impressão oferecidos para UMA folha, montados a partir dos planos que o motor já
 * avaliou — o escolhido mais as alternativas.
 *
 * Só entram os formatos da FOLHA INTEIRA em uso: se o papel é 66x96, a lista é a tabela de conversões
 * do 66x96. Formatos de outra folha inteira não são alternativa nenhuma — trocá-los seria trocar o
 * papel, que é outra decisão.
 *
 * De cada formato fica o plano mais barato, e o critério vai junto: quantas aplicações do formato
 * final cabem nele, que é o número que manda no custo.
 */
const formatOptionsFor = (sheet: QuoteSheet) => {
  const costing = costingOf(sheet)
  if (!costing) return []
  const wholeFormat = costing.chosen.wholeFormatName
  const best = new Map<number, {
    formatNumber: number; name: string; applications: number; finalFormatNumber: number
    total: number; printSheets: number; wholeSheets: number
    preCutDescents: number; refileDescents: number
  }>()
  for (const plan of [costing.chosen, ...costing.alternatives]) {
    if (plan.wholeFormatName !== wholeFormat) continue
    const atual = best.get(plan.printFormatNumber)
    if (atual && atual.total <= plan.totalCost) continue
    best.set(plan.printFormatNumber, {
      formatNumber: plan.printFormatNumber,
      name: plan.printFormatName,
      applications: plan.applicationsPerSheet,
      finalFormatNumber: plan.finalFormatNumber,
      total: plan.totalCost,
      printSheets: plan.printSheetsNet,
      wholeSheets: plan.wholeSheets,
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
 * Chapas a oferecer NESTA impressão: AS CHAPAS DA IMPRESSORA escolhida (atividade 034).
 *
 * A lista não é mais "toda chapa do tipo que a máquina aceita": é a que a própria impressora
 * declara no cadastro dela. A chapa é comprada para a máquina, e a de outra não entra nesta — antes
 * o orçamento oferecia matriz que a gráfica não usaria naquela impressora.
 *
 * A digital não usa matriz, então nem o campo aparece; e com uma chapa só não há o que perguntar —
 * o motor usa aquela.
 */
const chosenMachine = computed(() => catalogs.findMachine(printing.value.machineId))

const plateOptions = computed(() => platesForMachine(chosenMachine.value, catalogs.plates.value))

/**
 * Só vale perguntar quando a impressora tem mais de uma chapa — e aí a resposta é OBRIGATÓRIA: a
 * diferença de preço entre as chapas da mesma máquina chega a três vezes (R$ 29,89 e R$ 100,80 na
 * mesma Sakurai), então deixar o motor "pegar a mais barata" seria decidir o preço do trabalho no
 * lugar de quem sabe qual matriz vai ser gravada.
 */
const asksForPlate = computed(() => plateOptions.value.length > 1)

/** A chapa única da impressora — não há escolha, mas o preço dela interessa. */
const onlyPlate = computed(() => (plateOptions.value.length === 1 ? plateOptions.value[0] : null))

/** A chapa escolhida, para mostrar o preço ao lado da resposta. */
const chosenPlate = computed(() =>
  plateOptions.value.find((chapa) => chapa.id === printing.value.plateSupplyId) ?? null,
)

/** Falta responder: é o que pinta o bloco de âmbar e segura o cálculo. */
const plateMissing = computed(() => asksForPlate.value && printing.value.plateSupplyId == null)

/**
 * Impressora sem chapa cadastrada: o orçamento dela sai SEM MATRIZ, e o custo fica menor do que o
 * real. É erro de cadastro, e o conserto não está nesta tela — daí a frase apontar para lá.
 */
const machineWithoutPlates = computed(() => {
  const machine = chosenMachine.value
  if (!machine || machine.machineType === 'DIGITAL') return null
  return (machine.plateSupplyIds ?? []).length === 0 ? machine : null
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

/**
 * O produto reaproveita chapa entre vias/lâminas? Então a impressora é UMA só.
 *
 * Não é preferência: a chapa está montada NAQUELA máquina. Por isso a opção de escolher uma
 * impressora por via desaparece — oferecer a escolha e o motor ignorá-la em silêncio seria pior do
 * que não oferecer.
 */
const sharesPlates = computed(() => {
  const p = product.value
  const total = p.structure === 'BLOCK' ? p.vias : p.blades
  if (total < 2) return false
  if (p.identicalArtwork === true) return true
  return p.identicalArtwork === false && (p.distinctArtworks ?? total) < total
})

const togglePerSheet = () => {
  printing.value.perSheet = !printing.value.perSheet
  if (printing.value.perSheet) {
    for (const sheet of printedBody.value) {
      printing.value.machineIdBySheet[sheet.uid] = printing.value.machineIdBySheet[sheet.uid] ?? printing.value.machineId
    }
  }
  store.pruneInks()
}

// Responder "as vias são iguais" depois de ter aberto a escolha por via desfaz a escolha: a
// impressora passa a ser uma só, e deixar o modo ligado esconderia a lista do produto.
watch(
  sharesPlates,
  (shares) => {
    if (shares && printing.value.perSheet) {
      printing.value.perSheet = false
      store.pruneInks()
    }
  },
  { immediate: true },
)

// Trocar a impressora troca as chapas disponíveis: a que estava escolhida pode não ser mais dela.
// Deixá-la ali mandaria ao motor uma escolha que ele ignora — ele cai na mais barata e avisa; melhor
// a tela já mostrar a verdade. Só mexe com o catálogo carregado e a máquina declarando chapas, senão
// apagaria a escolha de quem só está esperando a lista chegar.
//
// Com UMA chapa só, a tela responde sozinha: não há escolha a fazer, mas há um id a mandar — é ele
// que põe o preço da matriz na conta e o nome dela no resumo.
watch(
  plateOptions,
  (opcoes) => {
    if (!catalogs.plates.value.length) return
    if (!(chosenMachine.value?.plateSupplyIds ?? []).length) return
    const escolhida = printing.value.plateSupplyId
    if (opcoes.length === 1) {
      if (escolhida !== opcoes[0]!.id) printing.value.plateSupplyId = opcoes[0]!.id
      return
    }
    if (escolhida != null && !opcoes.some((chapa) => chapa.id === escolhida)) {
      printing.value.plateSupplyId = null
    }
  },
  { immediate: true },
)

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

          <!-- Formato de impressão: em que tamanho a folha inteira entra na máquina. -->
          <div v-if="printsSheet(sheet)" class="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h5 class="text-xs font-semibold text-slate-900 dark:text-white">
                Formato de impressão
                <span v-if="costingOf(sheet)" class="font-normal text-slate-500 dark:text-slate-400">
                  — da folha {{ costingOf(sheet)!.chosen.wholeFormatName }}
                </span>
              </h5>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  v-if="sheet.printFormatNumber !== null"
                  type="button"
                  @click="store.setPrintFormat(sheet.uid, null)"
                  class="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Voltar à escolha do sistema
                </button>
                <CalculateButton compact />
              </div>
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
                      {{ formatLabel(option.name, option.formatNumber) }}
                    </span>
                    <span class="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      {{ brl(option.total) }}
                    </span>
                  </span>
                  <span class="mt-1 block text-xs tabular-nums text-slate-600 dark:text-slate-300">
                    F{{ option.finalFormatNumber }} ÷ F{{ option.formatNumber }} =
                    <strong>{{ option.applications }} aplicações</strong> por folha
                  </span>
                  <span class="mt-0.5 block text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {{ option.printSheets.toLocaleString('pt-BR') }} folhas na máquina ·
                    {{ option.wholeSheets.toLocaleString('pt-BR') }} folhas inteiras ·
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
        <div class="flex flex-wrap items-center gap-2">
          <CalculateButton />
          <button
            v-if="printedBody.length && !sharesPlates"
            type="button"
            @click="togglePerSheet"
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {{ printing.perSheet ? '← Usar uma impressora para o produto' : 'Selecionar impressora diferente por via/lâmina' }}
          </button>
        </div>
      </div>

      <p
        v-if="sharesPlates && printedBody.length"
        class="mt-3 rounded-lg bg-slate-50 px-4 py-2.5 text-xs text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
      >
        As {{ product.structure === 'BLOCK' ? 'vias' : 'lâminas' }} que repetem o desenho rodam na
        <strong>mesma impressora</strong> — é nela que a chapa está montada. A chapa e a montagem são
        cobradas uma vez só.
      </p>

      <!--
        A CHAPA (atividade 034). Sai da linha solta e vira bloco: é um campo de preço, não um
        detalhe — e enquanto não for respondido ele segura o cálculo, então precisa se fazer notar.
      -->
      <div
        v-if="asksForPlate"
        class="mt-3 rounded-xl border p-4"
        :class="
          plateMissing
            ? 'border-amber-300 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-500/5'
            : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/40'
        "
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <label for="chapa-impressao" class="text-sm font-medium text-slate-900 dark:text-white">
            Chapa desta impressão <span class="text-rose-500">*</span>
            <span class="font-normal text-slate-500 dark:text-slate-400">— {{ chosenMachine?.value }}</span>
          </label>
          <span
            v-if="chosenPlate"
            class="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
          >
            {{ brl(chosenPlate.unitCost ?? 0) }} por chapa
          </span>
        </div>

        <select
          id="chapa-impressao"
          v-model.number="printing.plateSupplyId"
          class="mt-2 block w-full max-w-xl rounded-lg border bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-indigo-600 dark:bg-slate-700 dark:text-white"
          :class="
            plateMissing
              ? 'border-amber-400 dark:border-amber-500/60'
              : 'border-slate-300 dark:border-slate-600'
          "
        >
          <option :value="null" disabled>Selecione a chapa desta impressora…</option>
          <option v-for="chapa in plateOptions" :key="chapa.id" :value="chapa.id">
            {{ plateLabel(chapa) }}
          </option>
        </select>

        <p class="mt-2 text-xs" :class="plateMissing ? 'text-amber-800 dark:text-amber-200' : 'text-slate-500 dark:text-slate-400'">
          <template v-if="plateMissing">
            A <strong>{{ chosenMachine?.value }}</strong> tem {{ plateOptions.length }} chapas
            cadastradas, e a diferença de preço entre elas pesa no trabalho — escolher é com você.
          </template>
          <template v-else>
            Uma chapa por cor, por lado, nesta impressão. Só entram aqui as chapas
            <strong>desta impressora</strong>.
          </template>
        </p>
      </div>

      <div
        v-else-if="onlyPlate"
        class="mt-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/40"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-sm font-medium text-slate-900 dark:text-white">
            Chapa desta impressão
            <span class="font-normal text-slate-500 dark:text-slate-400">— {{ chosenMachine?.value }}</span>
          </span>
          <span class="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
            {{ brl(onlyPlate.unitCost ?? 0) }} por chapa
          </span>
        </div>
        <p class="mt-1.5 text-sm text-slate-700 dark:text-slate-200">{{ onlyPlate.value }}</p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Única chapa cadastrada nesta impressora — já vai selecionada. Uma por cor, por lado.
        </p>
      </div>

      <p
        v-else-if="machineWithoutPlates"
        class="mt-3 rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
      >
        A <strong>{{ machineWithoutPlates.value }}</strong> não tem chapa cadastrada: o orçamento sai
        <strong>sem a matriz</strong>, e o custo fica menor do que o real. Selecione as chapas dela no
        cadastro da impressora.
      </p>

      <div v-if="!printing.perSheet" class="mt-3 space-y-2">
        <p v-if="printedBody.length === 0" class="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
          Nenhuma via/lâmina com cores — esta impressão não roda o corpo do produto.
        </p>
        <p v-else-if="!bodyOptions.length" class="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
          Complete a configuração e use <strong>Calcular</strong> para o motor listar as opções de
          impressora.
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

        <details v-if="excludedBody.length" class="rounded-lg border border-slate-200 dark:border-slate-700">
          <summary class="cursor-pointer px-4 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            Por que só essas? {{ excludedBody.length }} impressora(s) ficaram de fora
          </summary>
          <ul class="divide-y divide-slate-100 px-4 pb-3 dark:divide-slate-700/50">
            <li v-for="maquina in excludedBody" :key="maquina.name" class="py-2">
              <p class="text-sm text-slate-800 dark:text-slate-100">{{ maquina.name }}</p>
              <p v-for="motivo in maquina.reasons" :key="motivo" class="text-xs text-amber-700 dark:text-amber-400">
                {{ motivo }}
              </p>
            </li>
          </ul>
        </details>
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
