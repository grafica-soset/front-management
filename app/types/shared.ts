/**
 * Tipagens compartilhadas entre os módulos do sistema.
 * Espelham os DTOs comuns expostos pela API (Quarkus/Kotlin).
 */

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface KeyValueDto {
  id: number
  value: string
}

/**
 * Códigos do indicador de contribuinte de ICMS (padrão fiscal brasileiro).
 * 1 = Contribuinte | 2 = Isento de IE | 9 = Não contribuinte.
 */
export type IcmsTaxpayerIndicator = '1' | '2' | '9'

export interface PersonDto {
  id?: number
  name: string
  corporateName?: string | null
  document: string
  email?: string | null
  stateRegistration?: string | null
  municipalRegistration?: string | null
  suframaRegistration?: string | null
  isFinalConsumer: boolean
  icmsTaxpayerIndicator: IcmsTaxpayerIndicator
}

export const ICMS_TAXPAYER_OPTIONS: Array<{ value: IcmsTaxpayerIndicator, label: string }> = [
  { value: '1', label: '1 - Contribuinte de ICMS' },
  { value: '2', label: '2 - Contribuinte isento de IE' },
  { value: '9', label: '9 - Não contribuinte' },
]

export interface BasePagedQuery {
  page?: number
  size?: number
}
