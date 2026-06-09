import type { FormattedDimension } from './FormattedDimension'

/**
 * Formato = dimensão-padrão de mercado (ex.: 66,0 cm × 96,0 cm).
 *
 * O cadastro é global (padrão de indústria, compartilhado entre tenants). As dimensões
 * vêm já na unidade configurada da empresa (`FormattedDimension`), preservando o valor
 * canônico em milímetros. O `name` é gerado pelo backend no padrão larguraXcomprimento
 * em centímetros (ex.: "66x96").
 */
export interface Format {
  id: number
  name: string
  width: FormattedDimension
  height: FormattedDimension
  conversions: FormatConversion[]
  active: boolean
}

/** Subformato de um formato: dimensão menor obtida por corte (relacionamento 1:N). */
export interface FormatConversion {
  id: number
  name: string
  width: FormattedDimension
  height: FormattedDimension
  /** Número do formato (ordinal do subformato na tabela de conversões). */
  formatNumber: number
  /** Quantidade de cortes para obter o subformato a partir do formato de origem. */
  cutCount: number
}

/** Subformato no payload de criação/edição (dimensões sempre em milímetros). */
export interface FormatConversionRequest {
  widthMm: number
  heightMm: number
  formatNumber: number
  cutCount: number
}

/** Payload de POST /formats. O nome é gerado pelo backend — não é enviado. */
export interface CreateFormatRequest {
  widthMm: number
  heightMm: number
  conversions: FormatConversionRequest[]
}

/** Payload de PUT /formats/{id}. */
export interface UpdateFormatRequest extends CreateFormatRequest {
  active: boolean
}
