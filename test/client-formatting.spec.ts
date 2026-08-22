import { describe, expect, it } from 'vitest'
import {
  digitsOnly,
  formatBrazilianDocument,
  formatPhone,
  formatPostalCode,
} from '../app/utils/clientFormatting'
import { isValidBrazilianDocument } from '../app/utils/clientValidation'

describe('formatação de clientes', () => {
  it('remove caracteres não numéricos antes do envio', () => {
    expect(digitsOnly('(19) 99999-8877')).toBe('19999998877')
  })

  it('formata CPF e CNPJ para exibição', () => {
    expect(formatBrazilianDocument('52998224725')).toBe('529.982.247-25')
    expect(formatBrazilianDocument('04252011000110')).toBe('04.252.011/0001-10')
  })

  it('formata telefone e CEP para exibição', () => {
    expect(formatPhone('19999998877')).toBe('(19) 99999-8877')
    expect(formatPhone('1933334455')).toBe('(19) 3333-4455')
    expect(formatPostalCode('13010000')).toBe('13010-000')
  })

  it('valida o documento de acordo com o tipo de pessoa', () => {
    expect(isValidBrazilianDocument('529.982.247-25', 'PHYSICAL')).toBe(true)
    expect(isValidBrazilianDocument('529.982.247-24', 'PHYSICAL')).toBe(false)
    expect(isValidBrazilianDocument('04.252.011/0001-10', 'LEGAL')).toBe(true)
    expect(isValidBrazilianDocument('04.252.011/0001-11', 'LEGAL')).toBe(false)
  })
})
