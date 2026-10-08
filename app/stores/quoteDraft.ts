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
import type {
  CoverPosition,
  CoverSelection,
  PrintingSetup,
  PrintingSheetSetup,
  ProductStructure,
  QuoteProduct,
  QuoteSheet,
  QuoteStep,
  SheetKind,
} from '@/types/QuoteDraft'
import type { ProductCostingResponse, QuoteProductRequest, QuoteStepRequest } from '@/types/Quote'
import type { ProductTemplate, ProductTemplateRequest } from '@/types/ProductTemplate'
import type { QuoteStatus, SaveQuoteRequest, SavedQuote, SupplyConditions } from '@/types/SavedQuote'
import {
  coverCount,
  coverIsPrinted,
  coverPositionOf,
  coverPositions,
  coverSidesFromCount,
  positionsOf,
  printedCoverPositions,
  selectionOf,
  defaultSheetSetup,
  duplexModeFor,
  followsFirstVia,
  isSheetPrinted,
  machineForSheet,
  setupFor,
} from '@/utils/quoteModel'
import {
  agencyCommissionAmount,
  emptyPricing,
  emptyTaxes,
  normalizePricing,
  normalizeTaxes,
  priceFromCost,
  round2,
  totalFromUnit,
  unitPriceOf,
  type PriceBreakdown,
} from '@/utils/pricing'
import { useQuotes } from '@/composables/useQuotes'
import { useQuoteCatalogs } from '@/composables/useQuoteCatalogs'
import { extractApiError } from '@/utils/apiError'
import { defaultConditions } from '@/utils/quoteTermOptions'
import type { QuoteTermOptionKeyValue } from '@/types/QuoteTermOption'

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
  return { uid: uid(kind.toLowerCase()), kind, index, paperTypeId: null, printFormatNumber: null, paperId: null }
}

/** Folha fora da impressão: zero cores nas duas faces. */
function blankSheetSetup(): PrintingSheetSetup {
  return { frontColors: 0, backColors: 0, frontInkIds: [], backInkIds: [], frontCoverage: null, backCoverage: null }
}

/**
 * Configuração com que a folha nasce numa etapa de impressão: a padrão, menos na capa respondida
 * como "sem impressão" (atividade 040) — essa nem aparece na etapa.
 */
function initialSheetSetup(product: QuoteProduct, sheet: QuoteSheet): PrintingSheetSetup {
  return coverIsPrinted(product, sheet) ? defaultSheetSetup() : blankSheetSetup()
}

/** Etapa de impressão nova: nenhuma máquina escolhida e cada folha na configuração padrão. */
function emptyPrintingSetup(product: QuoteProduct): PrintingSetup {
  const bySheet: PrintingSetup['bySheet'] = {}
  for (const sheet of product.sheets) bySheet[sheet.uid] = initialSheetSetup(product, sheet)
  return {
    bySheet,
    machineId: null,
    perSheet: false,
    machineIdBySheet: {},
    separateCovers: false,
    coverMachineId: null,
  }
}

/** Condições de fornecimento vazias — o que ficar vazio não sai na proposta. */
export function emptyConditions(): SupplyConditions {
  return { proposalValidity: null, deliveryTerms: null, paymentTerms: null, bankDetails: null }
}

const blankToNull = (value: string | null | undefined) => value?.trim() || null

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
    coverSides: 'BOTH',
    coverPrinted: { FRONT: null, BACK: null },
    coverRepeatsArtwork: false,
    identicalCovers: false,
    // Numeração (atividade 036): sem resposta até o usuário dizer. Os defaults abaixo só entram
    // em cena depois do "sim".
    // Numeração desligada por padrão (atividade 046): o trabalho comum não é numerado.
    hasNumbering: false,
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
  // Rascunho anterior à atividade 040 guardava "quantas capas": vira a posição.
  const legacyCoverCount = (product as { coverCount?: number }).coverCount
  return {
    ...base,
    ...product,
    coverSides: product.coverSides ?? coverSidesFromCount(legacyCoverCount),
    coverPrinted: product.coverPrinted ?? inferCoverPrinted(product),
    coverRepeatsArtwork: product.coverRepeatsArtwork ?? false,
    identicalCovers: product.identicalCovers ?? false,
    uid: product.uid || base.uid,
    productModelName: product.productModelName ?? '',
    typeName: product.typeName ?? '',
    taxes: normalizeTaxes(product.taxes),
    pricing: normalizePricing(product.pricing),
  } as QuoteProduct
}

/**
 * Capas impressas no formato do modelo de produto. Alguma capa sem resposta = nulo: o modelo não
 * responde, e cada orçamento pergunta.
 */
function templatePrintedCovers(product: QuoteProduct): CoverSelection | null {
  if (!product.hasCovers) return null
  const positions = coverPositions(product.coverSides)
  if (positions.some((p) => product.coverPrinted[p] == null)) return null
  return selectionOf(positions.filter((p) => product.coverPrinted[p] === true))
}

/**
 * Rascunho salvo antes da pergunta "a capa tem impressão?": a resposta sai do que ele já tinha —
 * capa com cor em alguma etapa de impressão é impressa; sem cor em nenhuma, não é.
 */
function inferCoverPrinted(product: Partial<QuoteProduct>): QuoteProduct['coverPrinted'] {
  const answer: QuoteProduct['coverPrinted'] = { FRONT: null, BACK: null }
  for (const sheet of product.sheets ?? []) {
    if (sheet.kind !== 'COVER') continue
    answer[coverPositionOf(sheet.index)] = (product.steps ?? []).some((step) => {
      const setup = step.printing?.bySheet[sheet.uid]
      return !!setup && setup.frontColors + setup.backColors > 0
    })
  }
  return answer
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
    coverCount: coverCount(product),
    // Atividade 040: onde vai a capa, quais são impressas (sem resposta em alguma = o orçamento
    // pergunta) e o desenho.
    coverSides: product.hasCovers ? product.coverSides : 'NONE',
    printedCovers: templatePrintedCovers(product),
    coverRepeatsArtwork: product.hasCovers && product.coverRepeatsArtwork,
    identicalCovers: product.hasCovers && product.identicalCovers,
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
    /** Mexeram no produto enquanto o cálculo corria: a resposta que chegar já é velha. */
    calcRerun: false,
    /**
     * O produto aberto no assistente, como ele estava ao abrir (o corpo do cálculo). Se ele voltar
     * igual e sem cálculo novo, mantém o custo GRAVADO — abrir para olhar não recalcula (atividade 044).
     */
    draftBaseline: null as string | null,
    /** O assistente calculou o produto aberto: salvá-lo é pedir o recálculo. */
    draftRecalculated: false,

    // ---- O orçamento em si (atividade 037) ----
    /** Nulo enquanto o orçamento nunca foi salvo. */
    quoteId: null as number | null,
    quoteNumber: null as number | null,
    quoteStatus: null as QuoteStatus | null,
    clientId: null as number | null,
    /** Comissão de agência: percentual SOBRE o total dos produtos. */
    agencyCommissionPercent: 0,
    notes: '',
    /** Condições de fornecimento da proposta (atividade 038). */
    conditions: emptyConditions(),
    /** A proposta soma os produtos num total (atividade 044) — sem isso, os produtos são opções. */
    totalizeProposal: false,
    /**
     * Orçamento novo ainda sem as condições PADRÃO da empresa (Orçamento > Configurações). O editor
     * aplica uma vez só: depois disso, o que o usuário apagou fica apagado — inclusive na volta do
     * assistente de produto.
     */
    conditionDefaultsPending: false,
    saving: false,
    /**
     * Chave da tentativa de CRIAR o orçamento. Se o servidor gravou e a resposta se perdeu, o
     * próximo "Salvar" manda a mesma chave e recebe o orçamento já criado — sem duplicar.
     */
    createRequestId: null as string | null,
    /**
     * O corpo do salvar como estava na última vez que o orçamento foi salvo ou aberto. A proposta
     * imprime a versão SALVA; comparar com isto é o que diz à tela que há alteração pendente.
     */
    savedSnapshot: null as string | null,
  }),

  getters: {
    /**
     * Custo que vale para cada produto (atividade 044): o GRAVADO, enquanto ninguém pediu recálculo
     * — é o que foi passado ao cliente —; o do motor, para produto novo ou recalculado.
     */
    productCosts(state): Record<string, number> {
      const costs: Record<string, number> = {}
      for (const product of state.products) {
        const frozen = !product.recalculate && product.savedTotalCost != null
        const cost = frozen ? product.savedTotalCost : state.costs[product.uid]?.totalCost
        if (cost != null) costs[product.uid] = cost
      }
      return costs
    },

    /** Custo do orçamento: soma dos custos dos produtos. */
    quoteTotal(): number {
      return round2(Object.values(this.productCosts).reduce((sum, cost) => sum + cost, 0))
    },

    /** Preço de cada produto: o custo passado pelo divisor de comissão, impostos e markup. */
    productPrices(state): Record<string, PriceBreakdown> {
      const prices: Record<string, PriceBreakdown> = {}
      for (const product of state.products) {
        const cost = this.productCosts[product.uid]
        if (cost != null) prices[product.uid] = priceFromCost(cost, product.pricing, product.taxes)
      }
      return prices
    },

    /**
     * O preço PRATICADO de cada produto (atividade 044): o unitário calculado com 3 casas, o
     * assumido pelo orçamentista (se houver) e o total = unitário × quantidade. É o que o servidor
     * grava e o que a proposta imprime.
     */
    productUnitPrices(state): Record<string, { calculated: number; unit: number; total: number }> {
      const result: Record<string, { calculated: number; unit: number; total: number }> = {}
      for (const product of state.products) {
        const price = this.productPrices[product.uid]?.price
        const quantity = product.quantity ?? 0
        if (price == null || quantity <= 0) continue
        const calculated = unitPriceOf(price, quantity)
        const unit = product.unitPriceOverride ?? calculated
        result[product.uid] = { calculated, unit, total: totalFromUnit(unit, quantity) }
      }
      return result
    },

    /** Soma dos preços praticados. Nulo se algum produto ainda não tem custo ou tem percentuais impossíveis. */
    productsTotal(): number | null {
      let total = 0
      for (const product of this.products) {
        const line = this.productUnitPrices[product.uid]
        if (!line) return null
        total += line.total
      }
      return round2(total)
    },

    /** No aprovado, a soma dos produtos que o cliente escolheu. */
    approvedTotal(): number | null {
      if (this.quoteStatus !== 'APPROVED') return null
      const chosen = this.products.filter((p) => p.approved)
      if (chosen.length === 0) return null
      return round2(chosen.reduce((sum, p) => sum + (this.productUnitPrices[p.uid]?.total ?? 0), 0))
    },

    /** Comissão de agência sobre os produtos que valem: no aprovado, os escolhidos. */
    agencyCommission(): number {
      return agencyCommissionAmount(this.approvedTotal ?? this.productsTotal ?? 0, this.agencyCommissionPercent)
    },

    grandTotal(): number | null {
      const base = this.approvedTotal ?? this.productsTotal
      return base == null ? null : round2(base + this.agencyCommission)
    },

    /** Aprovado ou rejeitado: o orçamento é o que foi enviado e não se altera. */
    readOnly(state): boolean {
      return state.quoteStatus != null && state.quoteStatus !== 'PENDING_APPROVAL'
    },

    /** Há alteração que ainda não foi salva? */
    dirty(): boolean {
      if (this.savedSnapshot == null) return this.products.length > 0 || this.clientId != null
      // Em runtime o `this` do getter é a store inteira, actions incluídas; a tipagem do Pinia é que
      // só enxerga state e getters.
      const store = this as unknown as { toSaveRequest(): unknown }
      return this.savedSnapshot !== JSON.stringify(store.toSaveRequest())
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
      this.draftBaseline = JSON.stringify(this.toPayload(found))
      this.draftRecalculated = false
    },

    discard() {
      this.draft = null
      this.editingUid = null
      this.draftBaseline = null
      this.draftRecalculated = false
    },

    /** Salva o rascunho na lista do orçamento (novo ou substituindo o que estava em edição). */
    commit() {
      if (!this.draft) return
      const product = JSON.parse(JSON.stringify(this.draft)) as QuoteProduct
      // Produto que voltou do assistente MEXIDO ou CALCULADO de novo: o usuário pediu outro cálculo,
      // e o servidor o refaz ao salvar. Aberto só para olhar, fica com o custo gravado (atividade 044).
      const changed = this.draftBaseline !== JSON.stringify(this.toPayload(product))
      product.recalculate = !!product.recalculate || changed || this.draftRecalculated
      const index = this.products.findIndex((p) => p.uid === this.editingUid)
      if (index >= 0) this.products.splice(index, 1, product)
      else this.products.push(product)
      if (this.draftCost && (product.recalculate || !this.costs[product.uid])) this.costs[product.uid] = this.draftCost
      this.draft = null
      this.editingUid = null
      this.draftCost = null
      this.draftBaseline = null
      this.draftRecalculated = false
    },

    duplicate(productUid: string) {
      const found = this.products.find((p) => p.uid === productUid)
      if (!found) return
      const copy = JSON.parse(JSON.stringify(found)) as QuoteProduct
      copy.uid = uid('produto')
      copy.name = `${found.name} (cópia)`
      // A cópia é um produto NOVO: o servidor a calcula ao salvar, e a tela também — o custo gravado
      // do original é de outro momento.
      copy.savedId = null
      copy.savedTotalCost = null
      copy.recalculate = true
      copy.approved = false
      this.products.push(copy)
      void this.recalculateProducts([copy.uid])
    },

    remove(productUid: string) {
      this.products = this.products.filter((p) => p.uid !== productUid)
      delete this.costs[productUid]
    },

    /**
     * Preenche o orçamento NOVO com as condições padrão da empresa (atividade 038, configurações).
     * Só uma vez e só no novo: o orçamento aberto já tem as suas.
     */
    applyConditionDefaults(options: QuoteTermOptionKeyValue[]) {
      if (!this.conditionDefaultsPending) return
      this.conditionDefaultsPending = false
      if (this.quoteId != null) return
      this.conditions = defaultConditions(options)
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
      this.conditions = emptyConditions()
      this.totalizeProposal = false
      this.conditionDefaultsPending = true
      this.savedSnapshot = null
      this.createRequestId = null
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
      draft.coverSides =
        template.coverSides && template.coverSides !== 'NONE' ? template.coverSides : coverSidesFromCount(template.coverCount)
      // Capas impressas: o modelo que não responde deixa a pergunta para o orçamento.
      const printed = template.printedCovers == null ? null : positionsOf(template.printedCovers)
      draft.coverPrinted = {
        FRONT: printed == null ? null : printed.includes('FRONT'),
        BACK: printed == null ? null : printed.includes('BACK'),
      }
      draft.coverRepeatsArtwork = template.coverRepeatsArtwork ?? false
      draft.identicalCovers = template.identicalCovers ?? false
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
     * como o usuário o deixou — com o CÁLCULO GRAVADO (atividade 044). Nada é recalculado ao abrir:
     * o orçamento salvo é o que foi passado ao cliente, e só muda quando o usuário pede.
     */
    loadSaved(saved: SavedQuote) {
      this.clearQuote()
      this.quoteId = saved.id
      this.quoteNumber = saved.number
      this.quoteStatus = saved.status
      this.clientId = saved.clientId
      this.agencyCommissionPercent = Number(saved.agencyCommissionPercent) || 0
      this.notes = saved.notes ?? ''
      this.conditions = { ...emptyConditions(), ...(saved.conditions ?? {}) }
      this.totalizeProposal = !!saved.totalizeProposal
      this.conditionDefaultsPending = false
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
      this.syncSaved(saved)
    },

    /**
     * Acerta os produtos da tela com o que o servidor gravou: o id (muda a cada gravação), o custo
     * gravado, o cálculo gravado, o preço assumido e a aprovação. Depois disso o orçamento está
     * "salvo" — nada pendente de recálculo.
     */
    syncSaved(saved: SavedQuote) {
      ;(saved.products ?? []).forEach((sp, index) => {
        const product = this.products[index]
        if (!product) return
        product.savedId = sp.id
        product.savedTotalCost = Number(sp.totalCost)
        product.recalculate = false
        product.unitPriceOverride = sp.unitPriceOverride == null ? null : Number(sp.unitPriceOverride)
        product.approved = !!sp.approved
        if (sp.costing) this.costs[product.uid] = sp.costing
      })
      this.savedSnapshot = JSON.stringify(this.toSaveRequest())
    },

    /**
     * Recalcula produtos com o catálogo de AGORA — só a pedido do usuário (botão "Recalcular") ou
     * para produto novo. Os recalculados vão marcados para o servidor refazer a conta ao salvar.
     */
    async recalculateProducts(uids: string[]) {
      const targets = this.products.filter((p) => uids.includes(p.uid))
      if (targets.length === 0) return
      this.calcError = null
      try {
        const result = await useQuotes().calculate({ products: targets.map((p) => this.toPayload(p)) })
        targets.forEach((p, index) => {
          const cost = result.products[index]
          if (!cost) return
          this.costs[p.uid] = cost
          p.recalculate = true
        })
      } catch (err) {
        this.calcError = extractApiError(err, 'Não foi possível recalcular o orçamento.')
      }
    },

    /** "Recalcular orçamento": todos os produtos, numa chamada só. */
    async recalculateAll() {
      await this.recalculateProducts(this.products.map((p) => p.uid))
    },

    /**
     * Preço praticado (atividade 044): o unitário que o orçamentista assume, maior ou menor que o
     * calculado. Nulo volta ao calculado. O cálculo não muda — só o preço do produto.
     */
    setUnitPriceOverride(productUid: string, value: number | null) {
      const product = this.products.find((p) => p.uid === productUid)
      if (!product) return
      product.unitPriceOverride = value != null && Number.isFinite(value) && value > 0 ? Math.round(value * 1000) / 1000 : null
    },

    /** O corpo de `POST/PUT /quotes`. O custo não vai: o servidor recalcula. */
    toSaveRequest(): Omit<SaveQuoteRequest, 'customerId'> {
      return {
        clientId: this.clientId ?? 0,
        agencyCommissionPercent: Number(this.agencyCommissionPercent) || 0,
        notes: this.notes.trim() || null,
        conditions: {
          proposalValidity: blankToNull(this.conditions.proposalValidity),
          deliveryTerms: blankToNull(this.conditions.deliveryTerms),
          paymentTerms: blankToNull(this.conditions.paymentTerms),
          bankDetails: blankToNull(this.conditions.bankDetails),
        },
        totalizeProposal: this.totalizeProposal,
        products: this.products.map((p) => ({
          configuration: this.toPayload(p),
          editorState: JSON.parse(JSON.stringify(p)) as QuoteProduct,
          productModelId: p.productModelId,
          typeName: p.typeName.trim() || null,
          productTemplateId: p.productTemplateId,
          taxes: p.taxes,
          pricing: p.pricing,
          // Atividade 044: o servidor só recalcula o que é novo, mexido ou pedido.
          id: p.savedId ?? null,
          recalculate: !!p.recalculate,
          unitPriceOverride: p.unitPriceOverride ?? null,
        })),
      }
    },

    /** Salva (cria ou atualiza). Devolve o orçamento gravado; o erro sobe para a tela exibir. */
    async saveQuote(): Promise<SavedQuote> {
      this.saving = true
      try {
        const api = useQuotes()
        const body = this.toSaveRequest()
        let saved: SavedQuote
        if (this.quoteId) {
          saved = await api.update(this.quoteId, body)
        } else {
          // A chave sobrevive ao erro: é ela que faz a nova tentativa achar o que já foi gravado.
          this.createRequestId ??= crypto.randomUUID()
          saved = await api.create({ ...body, requestId: this.createRequestId })
          this.createRequestId = null
        }
        this.quoteId = saved.id
        this.quoteNumber = saved.number
        this.quoteStatus = saved.status
        this.syncSaved(saved)
        return saved
      } finally {
        this.saving = false
      }
    },

    /**
     * Aprova o orçamento com os produtos que o cliente escolheu (atividade 044) — os demais eram
     * opções que ele não quis. Mudar para outro status desmarca a escolha.
     */
    async changeStatus(status: QuoteStatus, approvedUids?: string[]): Promise<SavedQuote> {
      if (!this.quoteId) throw new Error('Orçamento ainda não salvo')
      const ids = approvedUids
        ?.map((u) => this.products.find((p) => p.uid === u)?.savedId)
        .filter((id): id is number => id != null)
      const saved = await useQuotes().changeStatus(this.quoteId, status, ids)
      this.quoteStatus = saved.status
      ;(saved.products ?? []).forEach((sp, index) => {
        const product = this.products[index]
        if (product) product.approved = !!sp.approved
      })
      this.savedSnapshot = JSON.stringify(this.toSaveRequest())
      return saved
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
    /**
     * "A capa tem impressão?" (atividade 040). Não = a capa sai de todas as etapas de impressão
     * (zero cores) e só consome papel. Sim = volta a elas na configuração padrão, para o usuário
     * dizer as cores — como qualquer via.
     */
    setCoverPrinted(position: CoverPosition, printed: boolean) {
      const draft = this.draft
      if (!draft) return
      draft.coverPrinted[position] = printed
      const sheet = draft.sheets.find((s) => s.kind === 'COVER' && coverPositionOf(s.index) === position)
      if (sheet) {
        for (const step of draft.steps) {
          const printing = step.printing
          if (!printing) continue
          const current = printing.bySheet[sheet.uid]
          const hasColor = !!current && current.frontColors + current.backColors > 0
          if (!printed) printing.bySheet[sheet.uid] = blankSheetSetup()
          else if (!hasColor) printing.bySheet[sheet.uid] = defaultSheetSetup()
        }
      }
      // As perguntas do desenho só existem para capa impressa.
      const impressas = printedCoverPositions(draft).length
      if (impressas === 0) draft.coverRepeatsArtwork = false
      if (impressas < 2) draft.identicalCovers = false
    },

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
        // Uma folha POR CAPA, fixa na posição: a da frente é a capa 1 e a do verso a capa 2, cada
        // uma com papel próprio e impressa ou não (é comum a capa de trás não ser impressa).
        for (const position of coverPositions(draft.coverSides)) {
          next.push(take('COVER', position === 'FRONT' ? 1 : 2))
        }
      }
      // Capas iguais entre si só existem com as duas capas.
      if (coverCount(draft) < 2) draft.identicalCovers = false
      if (!draft.hasCovers) draft.coverRepeatsArtwork = false

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
          if (!printing.bySheet[sheet.uid]) printing.bySheet[sheet.uid] = initialSheetSetup(draft, sheet)
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
        step.printing = emptyPrintingSetup(draft)
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
            // Corte e vinco (atividade 046): bocas e canaleta por faca (nula = o perímetro da peça).
            dieCount: step.parameters.dieCount ?? 0,
            channelLengthMm: step.parameters.channelLengthMm ?? null,
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
                // A capa sem impressão não viaja, qualquer que seja a cor que sobrou nela.
                if (!coverIsPrinted(product, sheet) || !isSheetPrinted(sheet, setup)) return null
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
                  duplexMode: duplexModeFor(setup),
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
        // Capa (atividade 040): o desenho repete o da via? E frente igual ao verso? Só pesam em capa
        // impressa — e "iguais" só com as duas impressas.
        coverRepeatsArtwork: printedCoverPositions(product).length > 0 && product.coverRepeatsArtwork,
        identicalCovers: printedCoverPositions(product).length === 2 && product.identicalCovers,
        sheets: product.sheets.map((sheet) => ({
          number: sheet.index,
          kind: sheet.kind,
          coverPosition: sheet.kind === 'COVER' ? coverPositionOf(sheet.index) : null,
          paperTypeId: sheet.paperTypeId!,
          // No bloco o formato é da via 1 (atividade 039): uma escolha antiga numa outra via ou na
          // capa não viaja — o motor a ignoraria e devolveria um aviso sobre algo que a tela não
          // mostra mais.
          printFormatNumber: followsFirstVia(product, sheet) ? null : sheet.printFormatNumber,
          // O papel vai junto com o formato (atividade 044): o número do formato é da folha inteira.
          paperId: followsFirstVia(product, sheet) ? null : (sheet.paperId ?? null),
        })),
        steps,
      }
    },

    /**
     * Recalcula o produto em edição no motor. Quem exibe o erro é a tela.
     *
     * UM cálculo por vez, e só a resposta mais nova vale. O cálculo chegou a levar 13 s em
     * produção; com um disparo a cada mexida, as chamadas se empilhavam no servidor e uma resposta
     * velha podia chegar por último e mostrar o preço de uma configuração que já não existia.
     * Mexeu durante o cálculo: a resposta em curso é descartada e roda uma nova, com o estado atual.
     */
    async calculateDraft() {
      if (!this.draft) return
      if (this.calculating) {
        this.calcRerun = true
        return
      }
      this.calculating = true
      try {
        do {
          this.calcRerun = false
          const product = this.draft
          if (!product) break
          this.calcError = null
          try {
            const result = await useQuotes().calculate({ products: [this.toPayload(product)] })
            // Outro produto no assistente ou nova mexida: esta resposta não é mais a da tela.
            if (!this.calcRerun && this.draft === product) {
              this.draftCost = result.products[0] ?? null
              this.draftRecalculated = true
            }
          } catch (err) {
            if (!this.calcRerun && this.draft === product) {
              this.draftCost = null
              this.calcError = extractApiError(err, 'Não foi possível calcular o orçamento.')
            }
          }
        } while (this.calcRerun)
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
    setPrintFormat(sheetUid: string, formatNumber: number | null, paperId: number | null = null) {
      const sheet = this.draft?.sheets.find((s) => s.uid === sheetUid)
      if (!sheet) return
      sheet.printFormatNumber = formatNumber
      // O papel acompanha o formato (atividade 044): "s756696 no F9" é um par — o F9 de outra folha
      // inteira é outro formato. "Voltar à escolha do sistema" limpa os dois.
      sheet.paperId = formatNumber == null ? null : paperId
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
