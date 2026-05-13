import { defineStore } from 'pinia'
import type { PaperType } from '@/types/PaperType'
import type { Paper } from '@/types/Paper'
import type { CustomerPaper, CustomerPaperEntry } from '@/types/CustomerPaper'

interface PapersState {
  paperTypes: PaperType[]
  papers: Paper[]
  /** Vínculos da empresa ativa, indexados por paperId para lookup O(1) no toggle. */
  customerPapersByPaperId: Record<number, CustomerPaper>
}

/**
 * Cache global de catálogo de papéis e dos vínculos da empresa ativa.
 *
 * Persistido em cookie para sobreviver a refresh durante o fluxo de orçamento
 * — o reset acontece manualmente em troca de empresa (ver CompanySwitcher).
 */
export const usePapersStore = defineStore('papers', {
  state: (): PapersState => ({
    paperTypes: [],
    papers: [],
    customerPapersByPaperId: {},
  }),

  getters: {
    paperTypeById: (state) => (id: number) => state.paperTypes.find((t) => t.id === id) ?? null,
    paperById: (state) => (id: number) => state.papers.find((p) => p.id === id) ?? null,
    /** Lista somente os papéis que estão ativos para a empresa. */
    activeCustomerPapers: (state): CustomerPaper[] =>
      Object.values(state.customerPapersByPaperId).filter((cp) => cp.active),
    /** Conjunto de paperIds ativos — útil para pintar toggles na biblioteca. */
    activePaperIds(): Set<number> {
      return new Set(this.activeCustomerPapers.map((cp) => cp.paperId))
    },
  },

  actions: {
    setPaperTypes(types: PaperType[]) {
      this.paperTypes = types
    },
    upsertPaperType(type: PaperType) {
      const idx = this.paperTypes.findIndex((t) => t.id === type.id)
      if (idx >= 0) this.paperTypes.splice(idx, 1, type)
      else this.paperTypes = [...this.paperTypes, type]
    },
    removePaperType(id: number) {
      this.paperTypes = this.paperTypes.filter((t) => t.id !== id)
    },

    setPapers(papers: Paper[]) {
      this.papers = papers
    },
    upsertPaper(paper: Paper) {
      const idx = this.papers.findIndex((p) => p.id === paper.id)
      if (idx >= 0) this.papers.splice(idx, 1, paper)
      else this.papers = [...this.papers, paper]
    },
    removePaper(id: number) {
      this.papers = this.papers.filter((p) => p.id !== id)
      delete this.customerPapersByPaperId[id]
    },

    setCustomerPapers(entries: CustomerPaperEntry[]) {
      const map: Record<number, CustomerPaper> = {}
      for (const entry of entries) map[entry.paper.id] = entry.customerPaper
      this.customerPapersByPaperId = map
    },
    upsertCustomerPaper(cp: CustomerPaper) {
      this.customerPapersByPaperId = { ...this.customerPapersByPaperId, [cp.paperId]: cp }
    },

    clear() {
      this.paperTypes = []
      this.papers = []
      this.customerPapersByPaperId = {}
    },
  },

  persist: true,
})
