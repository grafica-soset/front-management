import { defineStore } from 'pinia'
import type { Format } from '@/types/Format'

interface FormatsState {
  formats: Format[]
}

/**
 * Cache do catálogo global de Formatos (dimensões-padrão de mercado).
 *
 * Persistido em cookie para sobreviver a refresh durante fluxos que dependem do
 * formato (ex.: cadastro de papel).
 */
export const useFormatsStore = defineStore('formats', {
  state: (): FormatsState => ({
    formats: [],
  }),

  getters: {
    formatById: (state) => (id: number) => state.formats.find((f) => f.id === id) ?? null,
  },

  actions: {
    setFormats(formats: Format[]) {
      this.formats = formats
    },
    upsertFormat(format: Format) {
      const idx = this.formats.findIndex((f) => f.id === format.id)
      if (idx >= 0) this.formats.splice(idx, 1, format)
      else this.formats = [...this.formats, format]
    },
    removeFormat(id: number) {
      this.formats = this.formats.filter((f) => f.id !== id)
    },
    clear() {
      this.formats = []
    },
  },

  persist: true,
})
