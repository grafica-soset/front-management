/**
 * Extrai uma mensagem amigável de um erro propagado pelo $fetch.
 *
 * O backend retorna ErrorResponse { error, message, details } em data;
 * mapeamos os principais `error` codes para mensagens em PT-BR e
 * caímos no campo `message` ou em mensagens padrão para 401/500.
 */
import type { ErrorResponse } from '@/types/ErrorResponse'

const FRIENDLY_MESSAGES: Record<string, string> = {
  ValidationError: 'Há campos inválidos no formulário. Revise os dados e tente novamente.',
  InvalidCredentialsException: 'Usuário ou senha inválidos.',
  PersonNotFoundException: 'Sua sessão expirou. Faça login novamente.',
  DocumentAlreadyInUseException: 'Este documento já está cadastrado.',
  UsernameAlreadyInUseException: 'Este nome de usuário já está em uso.',
  SystemAlreadyInitializedException: 'O sistema já foi inicializado.',
  CustomerAlreadyExistsForPersonException: 'Esta pessoa jurídica já está vinculada a uma empresa.',
}

export function extractApiError(err: unknown, fallback = 'Não foi possível concluir a operação.'): string {
  const fetchErr = err as { data?: ErrorResponse; statusCode?: number; status?: number }
  const data = fetchErr?.data
  if (data?.error && FRIENDLY_MESSAGES[data.error]) return FRIENDLY_MESSAGES[data.error]
  if (data?.message) return data.message

  const status = fetchErr?.statusCode ?? fetchErr?.status
  if (status === 401) return 'Não autorizado. Faça login novamente.'
  if (status && status >= 500) return 'Erro inesperado no servidor. Tente novamente em instantes.'
  return fallback
}
