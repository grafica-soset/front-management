import { digitsOnly } from '@/utils/clientFormatting'

/** Código (CFOP) da operação de venda: só números, no máximo quatro. */
export function sanitizeSaleOperationCode(value: string | null | undefined): string {
  return digitsOnly(value).slice(0, 4)
}
