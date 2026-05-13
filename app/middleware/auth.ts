/**
 * Middleware de rota: exige usuário autenticado (JWT presente na store).
 *
 * Aplicar nas páginas via `definePageMeta({ middleware: 'auth' })`.
 */
import { useAuthStore } from '@/stores/auth'

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()

  if (!auth.isAuthenticated) {
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath },
    })
  }
})
