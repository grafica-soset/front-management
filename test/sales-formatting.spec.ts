import { describe, expect, it } from 'vitest'
import { sanitizeSaleOperationCode } from '../app/utils/salesFormatting'
import { canManageTenantRecords } from '../app/utils/tenantPermissions'

describe('código da operação de venda', () => {
  it('aceita só 4 números, inclusive 0000', () => {
    expect(sanitizeSaleOperationCode('0000')).toBe('0000')
    expect(sanitizeSaleOperationCode('5.101')).toBe('5101')
    expect(sanitizeSaleOperationCode('51a01x9')).toBe('5101')
    expect(sanitizeSaleOperationCode(undefined)).toBe('')
  })
})

describe('permissão de cadastro na empresa', () => {
  it('libera o ADMIN da empresa e o ADMIN global', () => {
    expect(canManageTenantRecords(false, 'ADMIN')).toBe(true)
    expect(canManageTenantRecords(true, 'USER')).toBe(true)
    expect(canManageTenantRecords(true, null)).toBe(true)
  })

  it('deixa o USER da empresa só consultando', () => {
    expect(canManageTenantRecords(false, 'USER')).toBe(false)
    expect(canManageTenantRecords(false, undefined)).toBe(false)
  })
})
