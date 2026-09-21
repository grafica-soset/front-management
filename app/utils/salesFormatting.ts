import { digitsOnly } from '@/utils/clientFormatting'

/** Código do vendedor: só letras, no máximo duas, sempre em maiúsculo. */
export function sanitizeSellerCode(value: string | null | undefined): string {
  return (value ?? '').replace(/[^A-Za-z]/gu, '').slice(0, 2).toUpperCase()
}

/** Código (CFOP) da operação de venda: só números, no máximo quatro. */
export function sanitizeSaleOperationCode(value: string | null | undefined): string {
  return digitsOnly(value).slice(0, 4)
}

/** Nome completo exibido na grid de vendedores. */
export function sellerFullName(seller: { name: string, lastName: string }): string {
  return `${seller.name} ${seller.lastName}`.trim()
}
