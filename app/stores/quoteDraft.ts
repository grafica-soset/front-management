/**
 * Store do RASCUNHO DE ORÇAMENTO (atividade 034).
 *
 * Guarda os produtos do orçamento em edição e o produto que está no assistente. Desde a atividade
 * 037 o orçamento também é SALVO (cliente, comissão de agência, número e status) — mas o rascunho
 * continua morando aqui enquanto o usuário edita; a API só entra no "Salvar orçamento".
 *
 * A responsabilidade mais delicada daqui é manter as FOLHAS em sincronia com a estrutura: mexer em
 * lâmina/jogos/vias/capas reconstrói a lista PRESERVANDO o que já estava configurado nas folhas
 * que continuam existindo — inclusive dentro de cada etapa de impressão.
 */
import { defineStore } from 'pinia'
import type { PrintingSetup, ProductStructure, QuoteProduct, QuoteSheet, QuoteStep, SheetKind } from '@/types/QuoteDraft'
import type { ProductCostingResponse, QuoteProductRequest, QuoteStepRequest } from '@/types/Quote'
import type { ProductTemplate, ProductTemplateRequest } from '@/types/ProductTemplate'
import type { QuoteStatus, SaveQuoteRequest, SavedQuote } from '@/types/SavedQuote'
import { defaultSheetSetup, isSheetPrinted, machineForSheet, setupFor } from '@/utils/quoteModel'
import {
  agencyCommissionAmount,
  emptyPricing,
  emptyTaxes,
  normalizePricing,
  normalizeTaxes,
  priceFromCost,
  round2,
  type PriceBreakdown,
} from '@/utils/pricing'
import { useQuotes } from '@/composables/useQuotes'
import { useQuoteCatalogs } from '@/composables/useQuoteCatalogs'
import { extractApiError } from '@/utils/apiError'

let uidSeq = 0
function uid(prefix: string): string {
  uidSeq += 1
  return `${prefix}-${uidSeq}-${Math.random().toString(36).slice(2, 7)}`
}

/** Quantas vias/lâminas o produto tem — o universo sobre o qual os desenhos se repetem. */
function artworkSheetCount(product: QuoteProduct): number {
  return product.structure === 'BLOCK' ? Math.max(1, product.vias || 1) : Math.max(1, product.blades || 1)
}

function emptySheet(kind: SheetKind, index: number): QuoteSheet {
  return { uid: uid(kind.toLowerCase()), kind, index, paperTypeId: null, printFormatNumber: null }
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
    productModelId: null,
    productModelName: '',
    typeName: '',
    productTemplateId: null,
    name: '',
    widthMm: null,
    heightMm: null,
    quantity: null,
    structure: 'BLADE',
    blades: 1,
    sets: 50,
    vias: 2,
    identicalArtwork: null,
    distinctArtworks: null,
    hasCovers: false,
    coverCount: 1,
    // Numeração (atividade 036): sem resposta até o usuário dizer. Os defaults abaixo só entram
    // em cena depois do "sim".
    hasNumbering: null,
    numberingUnits: 1,
    numberingStart: 1,
    numberingDigits: 6,
    sheets: [emptySheet('BLADE', 1)],
    steps: [],
    taxes: emptyTaxes(),
    pricing: emptyPricing(),
  }
}

/**
 * Completa um rascunho vindo de fora — o `editorState` de um orçamento salvo — com os campos que
 * ele não tinha quando foi gravado. Sem isso, um orçamento salvo antes de um campo existir abriria
 * o assistente com `undefined` onde a tela espera número.
 */
export function withProductDefaults(product: Partial<QuoteProduct>): QuoteProduct {
  const base = emptyProduct()
  return {
    ...base,
    ...product,
    uid: product.uid || base.uid,
    productModelName: product.productModelName ?? '',
    typeName: product.typeName ?? '',
    taxes: normalizeTaxes(product.taxes),
    pricing: normalizePricing(product.pricing),
  } as QuoteProduct
}

/**
 * O rascunho vira o corpo de `POST /product-templates` — só o que se repete entre pedidos: Modelo,
 * Tipo, estrutura, etapas na ordem e impostos. Formato, quantidade, papéis e os parâmetros das
 * etapas ficam de fora de propósito (decisão do usuário, atividade 037).
 */
export function templateRequestFromProduct(product: QuoteProduct, customerId: number): ProductTemplateRequest {
  const artworkSheets = artworkSheetCount(product)
  return {
    customerId,
    productModelId: product.productModelId ?? 0,
    typeName: product.typeName.trim(),
    structure: product.structure,
    blades: Math.max(1, product.blades || 1),
    vias: Math.min(9, Math.max(1, product.vias || 1)),
    hasCovers: product.hasCovers,
    coverCount: product.hasCovers ? Math.max(1, product.coverCount || 1) : 0,
    // Com uma via/lâmina só a pergunta não existe; o servidor recusa resposta para ela.
    identicalArtwork: artworkSheets >= 2 ? product.identicalArtwork : null,
    distinctArtworks: artworkSheets >= 2 && product.identicalArtwork === false ? product.distinctArtworks : null,
    activityIds: product.steps.map((s) => s.activityId),
    taxes: product.taxes,
    pricing: product.pricing,
    active: true,
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

    // ---- O orçamento em si (atividade 037) ----
    /** Nulo enquanto o orçamento nunca foi salvo. */
    quoteId: null as number | null,
    quoteNumber: null as number | null,
    quoteStatus: null as QuoteStatus | null,
    clientId: null as number | null,
    /** Comissão de agência: percentual SOBRE o total dos produtos. */
    agencyCommissionPercent: 0,
    notes: '',
    saving: false,
  }),

  getters: {
    /** Custo do orçamento: soma dos custos dos produtos. */
    quoteTotal(state): number {
      return Object.values(state.costs).reduce((sum, cost) => sum + cost.totalCost, 0)
    },

    /** Preço de cada produto: o custo calculado passado pelo divisor de comissão, impostos e markup. */
    productPrices(state): Record<string, PriceBreakdown> {
      const prices: Record<string, PriceBreakdown> = {}
      for (const product of state.products) {
        const cost = state.costs[product.uid]
        if (cost) prices[product.uid] = priceFromCost(cost.totalCost, product.pricing, product.taxes)
      }
      return prices
    },

    /** Soma dos preços. Nulo se algum produto ainda não tem custo ou tem percentuais impossíveis. */
    productsTotal(): number | null {
      let total = 0
      for (const product of this.products) {
        const price = this.productPrices[product.uid]?.price
        if (price == null) return null
        total += price
      }
      return round2(total)
    },

    agencyCommission(): number {
      return agencyCommissionAmount(this.productsTotal ?? 0, this.agencyCommissionPercent)
    },

    grandTotal(): number | null {
      return this.productsTotal == null ? null : round2(this.productsTotal + this.agencyCommission)
    },

    /** Aprovado ou rejeitado: o orçamento é o que foi enviado e não se altera. */
    readOnly(state): boolean {
      return state.quoteStatus != null && state.quoteStatus !== 'PENDING_APPROVAL'
    },
  },

  actions: {
    startNew() {
      this.draft = emptyProduct()
      this.editingUid = null
    },

    /**
     * Abre um produto salvo no assistente (cópia: cancelar não pode sujar a lista).
     *
     * O custo calculado volta junto. Sem ele a tela reabre sem resultado nenhum, e o passo de
     * parâmetros perde as opções de impressora — que saem do cálculo, não do cadastro —, deixando
     * a máquina já escolhida sem card para exibir. O recálculo confirma tudo em seguida.
     */
    edit(productUid: string) {
      const found = this.products.find((p) => p.uid === productUid)
      if (!found) return
      this.draft = JSON.parse(JSON.stringify(found)) as QuoteProduct
      this.editingUid = productUid
      this.draftCost = this.costs[productUid] ?? null
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
      this.quoteId = null
      this.quoteNumber = null
      this.quoteStatus = null
      this.clientId = null
      this.agencyCommissionPercent = 0
      this.notes = ''
    },

    /**
     * Abre o assistente a partir de um MODELO DE PRODUTO do catálogo (atividade 037).
     *
     * Traz o que o modelo guarda — estrutura, etapas na ordem, impostos e markup — e deixa o resto
     * para o pedido: nome, formato, quantidade, papéis e os parâmetros de cada etapa. As etapas
     * entram pelo mesmo `addStep` da tela, para a impressão nascer com a sua configuração por folha.
     */
    startFromTemplate(template: ProductTemplate) {
      this.startNew()
      const draft = this.draft!
      draft.productModelId = template.productModelId
      draft.productModelName = template.productModelName ?? ''
      draft.typeName = template.typeName
      draft.productTemplateId = template.id
      draft.structure = template.structure
      draft.blades = Math.max(1, template.blades)
      draft.vias = Math.min(9, Math.max(1, template.vias))
      draft.hasCovers = template.hasCovers
      draft.coverCount = template.hasCovers ? Math.max(1, template.coverCount) : 1
      this.syncSheets()
      // Depois do sync: é ele que zera a resposta quando o número de vias muda.
      draft.identicalArtwork = template.identicalArtwork
      draft.distinctArtworks = template.distinctArtworks
      draft.taxes = normalizeTaxes(template.taxes)
      draft.pricing = normalizePricing(template.pricing)
      for (const activityId of template.activityIds) this.addStep(activityId)
    },

    /**
     * Carrega um orçamento salvo para edição. Cada produto volta pelo `editorState` — o rascunho
     * como o usuário o deixou —, e os custos são recalculados em seguida (o catálogo pode ter
     * mudado desde que o orçamento foi salvo).
     */
    loadSaved(saved: SavedQuote) {
      this.clearQuote()
      this.quoteId = saved.id
      this.quoteNumber = saved.number
      this.quoteStatus = saved.status
      this.clientId = saved.clientId
      this.agencyCommissionPercent = Number(saved.agencyCommissionPercent) || 0
      this.notes = saved.notes ?? ''
      this.products = saved.products.map((p) =>
        withProductDefaults({
          ...(p.editorState ?? {}),
          productModelId: p.productModelId,
          productModelName: p.productModelName ?? p.editorState?.productModelName ?? '',
          typeName: p.typeName ?? '',
          productTemplateId: p.productTemplateId,
          taxes: p.taxes,
          pricing: p.pricing,
        }),
      )
    },

    /** Recalcula TODOS os produtos do orçamento numa chamada só. */
    async recalculateAll() {
      if (this.products.length === 0) return
      this.calcError = null
      try {
        const result = await useQuotes().calculate({ products: this.products.map((p) => this.toPayload(p)) })
        const costs: Record<string, ProductCostingResponse> = {}
        this.products.forEach((p, index) => {
          const cost = result.products[index]
          if (cost) costs[p.uid] = cost
        })
        this.costs = costs
      } catch (err) {
        this.calcError = extractApiError(err, 'Não foi possível recalcular o orçamento.')
      }
    },

    /** O corpo de `POST/PUT /quotes`. O custo não vai: o servidor recalcula. */
    toSaveRequest(): Omit<SaveQuoteRequest, 'customerId'> {
      return {
        clientId: this.clientId ?? 0,
        agencyCommissionPercent: Number(this.agencyCommissionPercent) || 0,
        notes: this.notes.trim() || null,
        products: this.products.map((p) => ({
          configuration: this.toPayload(p),
          editorState: JSON.parse(JSON.stringify(p)) as QuoteProduct,
          productModelId: p.productModelId,
          typeName: p.typeName.trim() || null,
          productTemplateId: p.productTemplateId,
          taxes: p.taxes,
          pricing: p.pricing,
        })),
      }
    },

    /** Salva (cria ou atualiza). Devolve o orçamento gravado; o erro sobe para a tela exibir. */
    async saveQuote(): Promise<SavedQuote> {
      this.saving = true
      try {
        const api = useQuotes()
        const body = this.toSaveRequest()
        const saved = this.quoteId ? await api.update(this.quoteId, body) : await api.create(body)
        this.quoteId = saved.id
        this.quoteNumber = saved.number
        this.quoteStatus = saved.status
        return saved
      } finally {
        this.saving = false
      }
    },

    /** Troca a estrutura do produto (lâmina ⇄ bloco) e refaz as folhas. */
    setStructure(structure: ProductStructure) {
      if (!this.draft) return
      this.draft.structure = structure
      // A pergunta "são iguais?" é sobre as vias OU sobre as lâminas: trocar a estrutura troca o
      // que está sendo perguntado, e a resposta antiga não vale para o novo desenho do produto.
      this.draft.identicalArtwork = null
      this.draft.distinctArtworks = null
      this.syncSheets()
    },

    /**
     * Responde "vias/lâminas iguais?".
     *
     * O NÃO nasce com o pior caso — todas diferentes —, que é o que o sistema sempre cobrou. Daí o
     * usuário reduz o número se algumas se repetem.
     */
    setIdenticalArtwork(identical: boolean) {
      const draft = this.draft
      if (!draft) return
      draft.identicalArtwork = identical
      draft.distinctArtworks = identical ? null : artworkSheetCount(draft)
    },

    /** Quantos desenhos diferentes há, quando as vias/lâminas NÃO são todas iguais. */
    setDistinctArtworks(count: number) {
      const draft = this.draft
      if (!draft) return
      const total = artworkSheetCount(draft)
      draft.distinctArtworks = Math.min(total, Math.max(1, Math.floor(count) || 1))
    },

    /**
     * Responde "tem numeração?" (atividade 036).
     *
     * O SIM repõe os valores de partida — um numerador, a partir de 1, com 6 dígitos —, para o
     * usuário não herdar o que digitou antes de dizer "não".
     */
    setHasNumbering(has: boolean) {
      const draft = this.draft
      if (!draft) return
      draft.hasNumbering = has
      if (has && draft.numberingUnits < 1) draft.numberingUnits = 1
    },

    /** Quantos numeradores o trabalho usa. Acima do que a offset comporta, ela fica inelegível. */
    setNumberingUnits(units: number) {
      const draft = this.draft
      if (!draft) return
      draft.numberingUnits = Math.max(1, Math.floor(Number(units)) || 1)
    },

    /** Numeração inicial: não muda o preço, muda o que a produção monta no numerador. */
    setNumberingStart(start: number) {
      const draft = this.draft
      if (!draft) return
      draft.numberingStart = Math.max(0, Math.floor(Number(start)) || 0)
    },

    /** Dígitos do numerador (1 a 12). */
    setNumberingDigits(digits: number) {
      const draft = this.draft
      if (!draft) return
      draft.numberingDigits = Math.min(12, Math.max(1, Math.floor(Number(digits)) || 1))
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

      // Mudar a quantidade de vias/lâminas muda o universo da pergunta: não faz sentido guardar
      // "3 desenhos diferentes" num produto que passou a ter 2 vias.
      if (draft.distinctArtworks != null) {
        draft.distinctArtworks = Math.min(draft.distinctArtworks, artworkSheetCount(draft))
      }
      if (artworkSheetCount(draft) < 2) {
        draft.identicalArtwork = null
        draft.distinctArtworks = null
      }

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
            // Talão (atividade 035): picote e grampo. O picote vai com 1 por padrão — a folha que
            // leva picote leva pelo menos um —, e "em quantas vias" nulo significa em todas.
            perforationCount: step.parameters.perforationCount ?? 1,
            perforatedSheetCount: step.parameters.perforatedSheetCount ?? null,
            stapleCount: step.parameters.stapleCount ?? 0,
            machineId: step.parameters.machineId ?? null,
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
        identicalArtwork: product.identicalArtwork === true,
        // Só viaja quando é a resposta "não são todas iguais, são N": com vias iguais o motor
        // recusaria os dois campos juntos, e sem resposta o default dele já é "todas diferentes".
        distinctArtworkCount: product.identicalArtwork === false ? product.distinctArtworks : null,
        // Numeração (atividade 036): só viaja quando o usuário disse SIM. Nula = produto sem
        // numeração, e aí nenhuma impressora é descartada por causa dela.
        numbering:
          product.hasNumbering === true
            ? {
                units: product.numberingUnits,
                startNumber: product.numberingStart,
                digits: product.numberingDigits,
              }
            : null,
        sheets: product.sheets.map((sheet) => ({
          number: sheet.index,
          kind: sheet.kind,
          paperTypeId: sheet.paperTypeId!,
          printFormatNumber: sheet.printFormatNumber,
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
    /**
     * Formato de impressão da FOLHA — não da etapa: uma folha é cortada uma vez, então a escolha
     * vale para todas as impressões que passarem por ela.
     */
    setPrintFormat(sheetUid: string, formatNumber: number | null) {
      const sheet = this.draft?.sheets.find((s) => s.uid === sheetUid)
      if (sheet) sheet.printFormatNumber = formatNumber
    },

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
