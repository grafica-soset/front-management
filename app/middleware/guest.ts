/**
 * Middleware de rota: redireciona usuários já autenticados.
 *
 * Útil em /auth/login e /auth/cadastro para evitar que um usuário logado
 * volte para essas páginas. Quem ainda não tem empresa cai no onboarding;
 * o restante segue para o dashboard.
 */
import { useAuthStore } from '@/stores/auth'

export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore()
  if (!auth.isAuthenticated) return
  return navigateTo(auth.hasCustomer ? '/' : '/onboarding')
})
