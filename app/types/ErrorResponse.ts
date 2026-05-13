/** Formato padrão de erro retornado pela API GraphicOS. */
export interface ErrorResponse {
  error: string
  message: string
  details?: string[]
}
