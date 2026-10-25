import { describe, it, expect } from 'vitest'
import { extractApiError } from '@/utils/apiError'

/**
 * Garante que erros de validação do backend (ErrorResponse com `details`) são
 * convertidos em mensagens legíveis para o usuário: rótulo do campo em PT-BR +
 * mensagem traduzida, com cada problema em uma linha. Regras de negócio que já
 * vêm em PT-BR (frase completa) são exibidas como estão.
 */
describe('extractApiError', () => {
  it('humaniza detalhes de ValidationError (campo + mensagem traduzida)', () => {
    const err = {
      data: {
        error: 'ValidationError',
        message: 'Payload inválido',
        details: [
          'create.request.offset.speedRamp.minSpeedSheetsPerHour: must be greater than or equal to 1',
        ],
      },
    }
    expect(extractApiError(err)).toBe('Velocidade mínima: deve ser maior ou igual a 1')
  })

  it('exibe mensagem de negócio customizada (PT-BR) sem alteração', () => {
    const customMsg = 'Com a numeração habilitada, informe a velocidade máxima com numeração (maior ou igual a 1).'
    const err = {
      data: {
        error: 'ValidationError',
        message: 'Payload inválido',
        details: [`create.request.offset.numberingMaxSpeedValid: ${customMsg}`],
      },
    }
    expect(extractApiError(err)).toBe(customMsg)
  })

  it('lista múltiplos problemas em linhas separadas', () => {
    const err = {
      data: {
        error: 'ValidationError',
        message: 'Payload inválido',
        details: [
          'create.request.name: must not be blank',
          'create.request.offset.speedRamp.idealWeightMinGsm: must be greater than or equal to 1',
        ],
      },
    }
    expect(extractApiError(err)).toBe(
      'Nome: é obrigatório\nGramatura ideal mínima: deve ser maior ou igual a 1',
    )
  })

  it('cai na mensagem genérica de ValidationError quando não há details', () => {
    const err = { data: { error: 'ValidationError', message: 'Payload inválido' } }
    expect(extractApiError(err)).toBe(
      'Há campos inválidos no formulário. Revise os dados e tente novamente.',
    )
  })
})
