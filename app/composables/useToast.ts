/**
 * Composable de notificações (toasts).
 *
 * Uso:
 *   const toast = useToast()
 *   toast.success('Tipo de papel salvo!')
 *   toast.error('Falha ao salvar.')
 */
import { useToastStore } from '@/stores/toast'

const DEFAULT_TTL = 4000

export function useToast() {
  const store = useToastStore()

  function show(variant: 'success' | 'error' | 'info' | 'warning', message: string, ttl = DEFAULT_TTL) {
    const id = store.push({ variant, message, ttl })
    if (ttl > 0 && typeof window !== 'undefined') {
      window.setTimeout(() => store.dismiss(id), ttl)
    }
    return id
  }

  return {
    success: (message: string, ttl?: number) => show('success', message, ttl),
    error: (message: string, ttl?: number) => show('error', message, ttl ?? 6000),
    info: (message: string, ttl?: number) => show('info', message, ttl),
    warning: (message: string, ttl?: number) => show('warning', message, ttl),
    dismiss: (id: number) => store.dismiss(id),
    clear: () => store.clear(),
  }
}
