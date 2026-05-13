/**
 * Middleware aplicado à página /onboarding.
 *
 * Exige autenticação e impede que usuários que já têm empresa
 * (role global CUSTOMER) revisitem o fluxo — eles vão direto ao dashboard.
 */
import { useAuthStore } from '@/stores/auth'

export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore()

  if (!auth.isAuthenticated) {
    return navigateTo('/auth/login')
  }

  if (auth.hasCustomer) {
    return navigateTo('/')
  }
})
