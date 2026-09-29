import type { TenantRole } from '@/types/CustomerUser'

/**
 * Cadastros restritos ao ADMIN da empresa (vendedores, operações de venda).
 * O back é quem garante a regra; aqui só decidimos se os botões aparecem.
 * ADMIN global tem acesso a todas as empresas.
 */
export function canManageTenantRecords(isGlobalAdmin: boolean, role: TenantRole | null | undefined): boolean {
  return isGlobalAdmin || role === 'ADMIN'
}
