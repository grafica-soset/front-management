/**
 * Extrai uma mensagem amigável de um erro propagado pelo $fetch.
 *
 * O backend retorna ErrorResponse { error, message, details } em data;
 * mapeamos os principais `error` codes para mensagens em PT-BR e
 * caímos no campo `message` ou em mensagens padrão para 401/500.
 *
 * Para erros de validação (`ValidationError` / `MalformedRequest`), o backend envia
 * em `details` a lista de problemas campo a campo. Em vez de uma mensagem genérica,
 * humanizamos esses detalhes (rótulo do campo + mensagem traduzida) e os exibimos ao
 * usuário, para que ele saiba exatamente o que corrigir. As mensagens já vêm em PT-BR
 * quando são regras de negócio customizadas do backend; nesse caso são exibidas como estão.
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
  CustomerContextRequiredException: 'Selecione uma empresa antes de prosseguir.',
  NotCustomerAdminException: 'Você precisa ser administrador da empresa para executar esta ação.',
  CustomerUserNotFoundException: 'Usuário não encontrado nesta empresa.',
  CredentialNotFoundException: 'Este usuário não possui credencial de senha cadastrada.',
}

// Rótulos amigáveis por nome do campo (último segmento do propertyPath enviado pelo backend),
// para que a mensagem mostre "Velocidade mínima" em vez de "minSpeedSheetsPerHour".
const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  hourlyCost: 'Custo por hora',
  minWidthMm: 'Largura mínima',
  maxWidthMm: 'Largura máxima',
  minLengthMm: 'Comprimento mínimo',
  maxLengthMm: 'Comprimento máximo',
  gripMm: 'Pinça',
  maxImageMarginMm: 'Limite máximo de mancha',
  maxStackHeightMm: 'Altura máxima do alimentador',
  numberOfColors: 'Nº de cores',
  maxNumberingUnits: 'Máx. de numeradores',
  numberingMaxSheetsPerHour: 'Velocidade máxima com numeração',
  minSpeedSheetsPerHour: 'Velocidade mínima',
  maxSpeedSheetsPerHour: 'Velocidade máxima',
  idealWeightMinGsm: 'Gramatura ideal mínima',
  idealWeightMaxGsm: 'Gramatura ideal máxima',
  plateSetupMinutesPerColor: 'Acerto de chapa por cor',
  colorMatchingMinutes: 'Acerto das cores',
  numberingSetupMinutesPerUnit: 'Setup por numerador',
  paperFeedSetupMinutes: 'Ajuste do papel',
  feedTimeSecondsPerLoad: 'Tempo por alimentação',
  feedLoadIncrementMm: 'Altura de alimentação',
  washMinutesPerColor: 'Lavagem por cor',
  belowIdealSpeedReducerPercent: 'Redutor de velocidade abaixo do ideal',
  aboveIdealSpeedReducerPercent: 'Redutor de velocidade acima do ideal',
  fullCoverageSpeedReducerPercent: 'Redutor de velocidade impressão chapada',
  numberingSpeedReducerPercent: 'Redutor de velocidade numeração',
  initialWasteSheets: 'Quebra inicial',
  fullCoverageExtraWastePercent: 'Quebra extra chapado',
  fromQuantity: 'Faixa "De"',
  toQuantity: 'Faixa "Até"',
  sheetsPerHour: 'Velocidade da faixa',
  wastePercent: 'Quebra da faixa',
  inkType: 'Tipo de tinta',
}

// Traduz as mensagens padrão (inglês) do Bean Validation para PT-BR. Se nenhuma casar,
// a mensagem é tratada como customizada do backend (já em PT-BR) e exibida sem alteração.
const MESSAGE_TRANSLATIONS: { pattern: RegExp; replace: string }[] = [
  { pattern: /^must be greater than or equal to (.+)$/, replace: 'deve ser maior ou igual a $1' },
  { pattern: /^must be less than or equal to (.+)$/, replace: 'deve ser menor ou igual a $1' },
  { pattern: /^must be greater than (.+)$/, replace: 'deve ser maior que $1' },
  { pattern: /^must be less than (.+)$/, replace: 'deve ser menor que $1' },
  { pattern: /^size must be between (\d+) and (\d+)$/, replace: 'deve ter entre $1 e $2 caracteres' },
  { pattern: /^must not be null$/, replace: 'é obrigatório' },
  { pattern: /^must not be blank$/, replace: 'é obrigatório' },
  { pattern: /^must not be empty$/, replace: 'é obrigatório' },
  { pattern: /^must be a positive number$/, replace: 'deve ser um número positivo' },
  { pattern: /^must be a positive number or zero$/, replace: 'deve ser zero ou positivo' },
]

function translateMessage(msg: string): { text: string; translated: boolean } {
  for (const { pattern, replace } of MESSAGE_TRANSLATIONS) {
    if (pattern.test(msg)) return { text: msg.replace(pattern, replace), translated: true }
  }
  return { text: msg, translated: false }
}

/**
 * Converte um detalhe cru ("create.request.offset.speedRamp.minSpeedSheetsPerHour: must be
 * greater than or equal to 1") em algo legível ("Velocidade mínima: deve ser maior ou igual a 1").
 * Detalhes sem propertyPath ou com mensagem já em PT-BR (regras de negócio) são exibidos como estão.
 */
function humanizeDetail(detail: string): string {
  const sep = detail.indexOf(': ')
  if (sep < 0) return detail
  const path = detail.slice(0, sep)
  const rawMsg = detail.slice(sep + 2)
  const leaf = path.split('.').pop() ?? ''
  const label = FIELD_LABELS[leaf]
  const { text, translated } = translateMessage(rawMsg)
  // Mensagem customizada do backend (já em PT-BR, frase completa): exibe como veio.
  if (!translated) return text
  return label ? `${label}: ${text}` : text
}

function humanizeDetails(details: string[]): string {
  return details.map(humanizeDetail).join('\n')
}

export function extractApiError(err: unknown, fallback = 'Não foi possível concluir a operação.'): string {
  const fetchErr = err as { data?: ErrorResponse; statusCode?: number; status?: number }
  const data = fetchErr?.data

  // Erros de validação/payload: mostra os problemas campo a campo em vez de uma mensagem genérica.
  if (
    (data?.error === 'ValidationError' || data?.error === 'MalformedRequest') &&
    data.details?.length
  ) {
    return humanizeDetails(data.details)
  }

  if (data?.error && FRIENDLY_MESSAGES[data.error]) return FRIENDLY_MESSAGES[data.error]
  if (data?.message) return data.message

  const status = fetchErr?.statusCode ?? fetchErr?.status
  if (status === 401) return 'Não autorizado. Faça login novamente.'
  if (status && status >= 500) return 'Erro inesperado no servidor. Tente novamente em instantes.'
  return fallback
}
