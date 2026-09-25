import { describe, expect, it } from 'vitest'
import { addressLines, itemsForPrint, logoUrlIssue, proposalMoney, proposalPlaceAndDate } from '@/utils/proposal'

/** Apresentação da proposta de fornecimento (atividade 038), no jeito que a gráfica já escreve. */
describe('proposta', () => {
  it('cidade e data como na proposta da gráfica', () => {
    expect(proposalPlaceAndDate('Iguape', '2022-02-15T10:00:00-03:00')).toBe('Iguape, 15.02.2022')
    expect(proposalPlaceAndDate(null, '2026-09-25T10:00:00-03:00')).toBe('25.09.2026')
  })

  it('valores sem o símbolo, que já está no rótulo', () => {
    expect(proposalMoney(145)).toBe('145,00')
    expect(proposalMoney(1234.5)).toBe('1.234,50')
  })

  it('o mesmo produto em outra quantidade vira "Idem acima"', () => {
    const description = "Blocos ''Controle de Vendas Pequeno'', 50 x 2 vias."
    const items = itemsForPrint([
      { position: 2, quantity: 20, description, totalPrice: 228, unitPrice: 11.4 },
      { position: 1, quantity: 10, description, totalPrice: 145, unitPrice: 14.5 },
      { position: 3, quantity: 5000, description: "''Folder''.", totalPrice: 900, unitPrice: 0.18 },
    ])
    expect(items.map((i) => i.printedDescription)).toEqual([description, 'Idem acima ...', "''Folder''."])
  })

  it('endereço em duas linhas, pulando o que falta', () => {
    expect(
      addressLines({
        street: 'Rua Tte. Cel. Zacarias', number: '88', complement: null, neighborhood: 'Centro',
        city: 'Iguape', state: 'SP', postalCode: '11920000',
      }),
    ).toEqual(['Rua Tte. Cel. Zacarias, 88 - Centro', 'Iguape - SP'])
    expect(addressLines(null)).toEqual([])
  })

  it('logo só por http ou https', () => {
    expect(logoUrlIssue('')).toBeNull()
    expect(logoUrlIssue('https://cdn.soset.com.br/logo.png')).toBeNull()
    expect(logoUrlIssue('javascript:alert(1)')).not.toBeNull()
    expect(logoUrlIssue('logo.png')).not.toBeNull()
  })
})
