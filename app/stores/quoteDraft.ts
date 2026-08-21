/**
 * Store do RASCUNHO DE ORÇAMENTO (atividade 034).
 *
 * Guarda os produtos do orçamento em edição e o produto que está no assistente. Vive só no
 * navegador: nada é enviado para a API nesta fase.
 *
 * A responsabilidade mais delicada daqui é manter as FOLHAS em sincronia com a estrutura: mexer em
 * lâmina/jogos/vias/capas reconstrói a lista PRESERVANDO o que já estava configurado nas folhas
 * que continuam existindo — inclusive dentro de cada etapa de impressão.
 */
import { defineStore } from 'pinia'
import type { PrintingSetup, ProductStructure, QuoteProduct, QuoteSheet, QuoteStep, SheetKind } from '@/types/QuoteDraft'
import type { ProductCostingResponse, QuoteProductRequest, QuoteStepRequest } from '@/types/Quote'
import { defaultSheetSetup, isSheetPrinted, machineForSheet, setupFor } from '@/utils/quoteModel'
import { useQuotes } from '@/composables/useQuotes'
import { useQuoteCatalogs } from '@/composables/useQuoteCatalogs'
import { extractApiError } from '@/utils/apiError'

let uidSeq = 0
function uid(prefix: string): string {
  uidSeq += 1
  return `${prefix}-${uidSeq}-${Math.random().toString(36).slice(2, 7)}`
}

function emptySheet(kind: SheetKind, index: number): QuoteSheet {
  return { uid: uid(kind.toLowerCase()), kind, index, paperTypeId: null }
}

/** Etapa de impressão nova: nenhuma máquina escolhida e cada folha na configuração padrão. */
function emptyPrintingSetup(sheets: QuoteSheet[]): PrintingSetup {
  const bySheet: PrintingSetup['bySheet'] = {}
  for (const sheet of sheets) bySheet[sheet.uid] = defaultSheetSetup()
  return {
    bySheet,
    machineId: null,
    perSheet: false,
    machineIdBySheet: {},
    separateCovers: false,
    coverMachineId: null,
  }
}

export function emptyProduct(): QuoteProduct {
  return {
    uid: uid('produto'),
    name: '',
    widthMm: null,
    heightMm: null,
    quantity: null,
    structure: 'BLADE',
    blades: 1,
    sets: 50,
    vias: 2,
    hasCovers: false,
    coverCount: 1,
    sheets: [emptySheet('BLADE', 1)],
    steps: [],
  }
}

export const useQuoteDraftStore = defineStore('quoteDraft', {
  state: () => ({
    /** Produtos já salvos no orçamento. */
    products: [] as QuoteProduct[],
    /** Produto aberto no assistente (null = ninguém editando). */
    draft: null as QuoteProduct | null,
    /** uid do produto em edição; null quando o rascunho é novo. */
    editingUid: null as string | null,
    /** Custo calculado de cada produto salvo, vindo do motor. */
    costs: {} as Record<string, ProductCostingResponse>,
    /** Custo do produto em edição, recalculado a cada mexida. */
    draftCost: null as ProductCostingResponse | null,
    /** Recusa do motor: o cadastro não sustenta o cálculo. */
    calcError: null as string | null,
    calculating: false,
  }),

  getters: {
    /** Total do orçamento: soma dos produtos já salvos. */
    quoteTotal(state): number {
      return Object.values(state.costs).reduce((sum, cost) => sum + cost.totalCost, 0)
    },
  },

  actions: {
    startNew() {
      this.draft = emptyProduct()
      this.editingUid = null
    },

    /** Abre um produto salvo no assistente (cópia: cancelar não pode sujar a lista). */
    edit(productUid: string) {
      const found = this.products.find((p) => p.uid === productUid)
      if (!found) return
      this.draft = JSON.parse(JSON.stringify(found)) as QuoteProduct
      this.editingUid = productUid
    },

    discard() {
      this.draft = null
      this.editingUid = null
    },

    /** Salva o rascunho na lista do orçamento (novo ou substituindo o que estava em edição). */
    commit() {
      if (!this.draft) return
      const product = JSON.parse(JSON.stringify(this.draft)) as QuoteProduct
      const index = this.products.findIndex((p) => p.uid === this.editingUid)
      if (index >= 0) this.products.splice(index, 1, product)
      else this.products.push(product)
      if (this.draftCost) this.costs[product.uid] = this.draftCost
      this.draft = null
      this.editingUid = null
      this.draftCost = null
    },

    duplicate(productUid: string) {
      const found = this.products.find((p) => p.uid === productUid)
      if (!found) return
      const copy = JSON.parse(JSON.stringify(found)) as QuoteProduct
      copy.uid = uid('produto')
      copy.name = `${found.name} (cópia)`
      this.products.push(copy)
    },

    remove(productUid: string) {
      this.products = this.products.filter((p) => p.uid !== productUid)
      delete this.costs[productUid]
    },

    clearQuote() {
      this.products = []
      this.costs = {}
      this.draft = null
      this.editingUid = null
      this.draftCost = null
    },

    /** Troca a estrutura do produto (lâmina ⇄ bloco) e refaz as folhas. */
    setStructure(structure: ProductStructure) {
      if (!this.draft) return
      this.draft.structure = structure
      this.syncSheets()
    },

    /**
     * Reconstrói a lista de folhas a partir da estrutura atual, preservando a configuração das
     * que continuam existindo (via 1 continua via 1). Folhas que somem levam junto a impressora
     * que tinham escolhido no modo "por folha".
     */
    syncSheets() {
      const draft = this.draft
      if (!draft) return

      const previous = draft.sheets
      const take = (kind: SheetKind, index: number): QuoteSheet => {
        const existing = previous.find((s) => s.kind === kind && s.index === index)
        return existing ?? emptySheet(kind, index)
      }

      const next: QuoteSheet[] = []
      if (draft.structure === 'BLADE') {
        const blades = Math.max(1, draft.blades || 1)
        for (let i = 1; i <= blades; i += 1) next.push(take('BLADE', i))
      } else {
        const vias = Math.min(9, Math.max(1, draft.vias || 1))
        for (let i = 1; i <= vias; i += 1) next.push(take('VIA', i))
      }
      if (draft.hasCovers) {
        // Uma folha POR CAPA: capa 1 e capa 2 têm papel próprio e podem ter impressão diferente
        // (é comum a capa de trás não ser impressa).
        const covers = Math.max(1, draft.coverCount || 1)
        for (let i = 1; i <= covers; i += 1) next.push(take('COVER', i))
      }

      draft.sheets = next

      // Cada etapa de impressão acompanha a nova lista: folha criada entra com a configuração
      // padrão, folha que sumiu leva junto cores, tintas e impressora que tinha nela.
      const validUids = new Set(next.map((s) => s.uid))
      for (const step of draft.steps) {
        const printing = step.printing
        if (!printing) continue
        for (const sheet of next) {
          if (!printing.bySheet[sheet.uid]) printing.bySheet[sheet.uid] = defaultSheetSetup()
        }
        for (const key of Object.keys(printing.bySheet)) {
          if (!validUids.has(key)) delete printing.bySheet[key]
        }
        for (const key of Object.keys(printing.machineIdBySheet)) {
          if (!validUids.has(key)) delete printing.machineIdBySheet[key]
        }
        if (!draft.hasCovers) {
          printing.separateCovers = false
          printing.coverMachineId = null
        }
      }
    },

    addStep(activityId: number) {
      const draft = this.draft
      if (!draft) return
      const step: QuoteStep = { uid: uid('etapa'), activityId, parameters: {} }
      // Impressão nasce com a sua própria configuração: duas impressões no mesmo produto são dois
      // acertos independentes, cada um com as suas cores, tintas e máquina.
      if (useQuoteCatalogs().findActivity(activityId)?.type === 'PRINTING') {
        step.printing = emptyPrintingSetup(draft.sheets)
      }
      draft.steps.push(step)
    },

    /**
     * Traduz o rascunho no corpo de `POST /quotes/calculate`.
     *
     * É aqui que o modelo da tela vira o do motor: a folha leva só o papel, e cada etapa de
     * impressão leva as cores, a cobertura, as tintas, a máquina e a chapa daquela passada. Folha
     * com cores zero nas duas faces é omitida — o motor entende como "não entra nesta passada".
     */
    toPayload(product: QuoteProduct): QuoteProductRequest {
      const steps: QuoteStepRequest[] = product.steps.map((step) => {
        const base: QuoteStepRequest = {
          activityId: step.activityId,
          parameters: {
            laborMinutes: step.parameters.laborMinutes ?? null,
            numberingUnits: step.parameters.numberingUnits ?? 0,
          },
        }
        if (!step.printing) return base
        return {
          ...base,
          printing: {
            machineId: step.printing.perSheet ? null : step.printing.machineId,
            plateSupplyId: step.printing.plateSupplyId ?? null,
            sheets: product.sheets
              .map((sheet) => {
                const setup = setupFor(step, sheet)
                if (!isSheetPrinted(sheet, setup)) return null
                return {
                  sheetNumber: sheet.index,
                  kind: sheet.kind,
                  frontColors: setup.frontColors,
                  backColors: setup.backColors,
                  frontInkSupplyIds: setup.frontInkIds,
                  backInkSupplyIds: setup.backInkIds,
                  frontCoveragePercent: setup.frontCoverage,
                  backCoveragePercent: setup.backCoverage,
                  printingMachineId: machineForSheet(step, sheet),
                }
              })
              .filter((s): s is NonNullable<typeof s> => s !== null),
          },
        }
      })

      return {
        name: product.name,
        quantity: product.quantity ?? 0,
        widthMm: product.widthMm ?? 0,
        heightMm: product.heightMm ?? 0,
        structure: product.structure,
        sets: product.structure === 'BLOCK' ? product.sets : 1,
        sheets: product.sheets.map((sheet) => ({
          number: sheet.index,
          kind: sheet.kind,
          paperTypeId: sheet.paperTypeId!,
        })),
        steps,
      }
    },

    /** Recalcula o produto em edição no motor. Quem exibe o erro é a tela. */
    async calculateDraft() {
      const product = this.draft
      if (!product) return
      this.calculating = true
      this.calcError = null
      try {
        const result = await useQuotes().calculate({ products: [this.toPayload(product)] })
        this.draftCost = result.products[0] ?? null
      } catch (err) {
        this.draftCost = null
        this.calcError = extractApiError(err, 'Não foi possível calcular o orçamento.')
      } finally {
        this.calculating = false
      }
    },

    removeStep(stepUid: string) {
      if (!this.draft) return
      this.draft.steps = this.draft.steps.filter((s) => s.uid !== stepUid)
    },

    moveStep(stepUid: string, direction: -1 | 1) {
      if (!this.draft) return
      const steps = this.draft.steps
      const index = steps.findIndex((s) => s.uid === stepUid)
      const target = index + direction
      if (index < 0 || target < 0 || target >= steps.length) return
      const [moved] = steps.splice(index, 1)
      steps.splice(target, 0, moved!)
    },

    /**
     * Troca a impressora de uma ETAPA de impressão. `scope` é 'PRODUCT', 'COVERS' ou o uid de uma
     * folha (modo por folha). `machineId` nulo limpa a seleção e devolve a lista de opções.
     */
    setMachine(stepUid: string, scope: 'PRODUCT' | 'COVERS' | string, machineId: number | null) {
      const printing = this.draft?.steps.find((s) => s.uid === stepUid)?.printing
      if (!printing) return
      if (scope === 'PRODUCT') printing.machineId = machineId
      else if (scope === 'COVERS') printing.coverMachineId = machineId
      else printing.machineIdBySheet[scope] = machineId
      this.pruneInks()
    },

    /**
     * Tira de cada folha as tintas que a impressora dela não aceita. É a regra que o usuário
     * pediu: trocou a impressora e o tipo de tinta é outro, a seleção cai e ele escolhe de novo.
     * Chamada depois de qualquer mexida em impressora (inclusive ao ligar/desligar os modos).
     */
    pruneInks() {
      const draft = this.draft
      if (!draft) return
      for (const step of draft.steps) {
        if (!step.printing) continue
        for (const sheet of draft.sheets) {
          const setup = setupFor(step, sheet)
          // Folha que esta etapa não imprime não guarda tinta nenhuma.
          if (!isSheetPrinted(sheet, setup)) {
            setup.frontInkIds = []
            setup.backInkIds = []
          }
        }
      }
    },
  },
})
