import { defineStore } from 'pinia'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  variant: ToastVariant
  message: string
  /** Time-to-live em ms; 0 = persistente até o usuário fechar. */
  ttl: number
}

interface ToastState {
  items: Toast[]
  nextId: number
}

/**
 * Fila global de toasts. Usado pelo composable `useToast()` e renderizado
 * pelo componente `ToastContainer.vue` montado no layout default.
 */
export const useToastStore = defineStore('toast', {
  state: (): ToastState => ({ items: [], nextId: 1 }),
  actions: {
    push(toast: Omit<Toast, 'id'>): number {
      const id = this.nextId++
      this.items = [...this.items, { id, ...toast }]
      return id
    },
    dismiss(id: number) {
      this.items = this.items.filter((t) => t.id !== id)
    },
    clear() {
      this.items = []
    },
  },
})
