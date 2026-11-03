import { describe, expect, it } from 'vitest'
import {
  addressLines, defaultProposalHeader, headerLines, headerSegments, imageUrlIssue, itemsForPrint, logoUrlIssue, longDate,
  proposalHeaderIssue, proposalMoney, proposalPlaceAndDate, proposalUnitMoney, recipientAddressLine,
} from '@/utils/proposal'

/** Apresentação da proposta de fornecimento (atividade 038), no jeito que a gráfica já escreve. */
describe('proposta', () => {
  it('cidade e data por extenso', () => {
    expect(proposalPlaceAndDate('Iguape', '2026-11-02T10:00:00-03:00')).toBe('Iguape, 2 de novembro de 2026')
    expect(proposalPlaceAndDate(null, '2026-09-25T10:00:00-03:00')).toBe('25 de setembro de 2026')
  })

  it('a data é a de Brasília, e o dia 1º se escreve com o ordinal', () => {
    // 01:30 em UTC ainda é 30 de novembro em Brasília.
    expect(longDate(new Date('2026-12-01T01:30:00Z'))).toBe('30 de novembro de 2026')
    expect(longDate(new Date('2026-12-01T12:00:00-03:00'))).toBe('1º de dezembro de 2026')
    expect(longDate(new Date('2027-03-15T09:00:00-03:00'))).toBe('15 de março de 2027')
  })

  it('o endereço do cliente numa linha, com CEP', () => {
    expect(
      recipientAddressLine({
        street: 'Av. Princesa Isabel', number: '1020', complement: 'Loja 2', neighborhood: 'Centro',
        city: 'Registro', state: 'SP', postalCode: '11900000',
      }),
    ).toBe('Av. Princesa Isabel, 1020 - Loja 2 - Centro - Registro - SP - CEP 11900-000')
    expect(recipientAddressLine({ street: null, number: null, complement: null, neighborhood: null, city: 'Iguape', state: 'SP', postalCode: null }))
      .toBe('Iguape - SP')
    expect(recipientAddressLine(null)).toBe('')
  })

  it('valores sem o símbolo, que já está no rótulo', () => {
    expect(proposalMoney(145)).toBe('145,00')
    expect(proposalMoney(1234.5)).toBe('1.234,50')
  })

  it('o unitário sai com 3 casas — 0,283 × 103.000 = 29.149,00 fecha na mão do cliente', () => {
    expect(proposalUnitMoney(0.283)).toBe('0,283')
    expect(proposalUnitMoney(14.5)).toBe('14,500')
  })

  it('o mesmo produto em outra quantidade vira "Idem acima"', () => {
    const description = "Blocos ''Controle de Vendas Pequeno'', 50 x 2 vias."
    const items = itemsForPrint([
      { position: 2, quantity: 20, description, totalPrice: 228, unitPrice: 11.4, approved: false, notes: null, deliveryTerms: null, omitDescription: false },
      { position: 1, quantity: 10, description, totalPrice: 145, unitPrice: 14.5, approved: false, notes: null, deliveryTerms: null, omitDescription: false },
      { position: 3, quantity: 5000, description: "''Folder''.", totalPrice: 900, unitPrice: 0.18, approved: false, notes: null, deliveryTerms: null, omitDescription: false },
    ])
    expect(items.map((i) => i.printedDescription)).toEqual([description, 'Idem acima ...', "''Folder''."])
  })

  it('item marcado como similar ao anterior sai sem descrição — menos o primeiro', () => {
    const base = { totalPrice: 100, unitPrice: 1, approved: false, notes: 'Obs.', deliveryTerms: null }
    const items = itemsForPrint([
      { ...base, position: 1, quantity: 100, description: 'Panfleto A5.', omitDescription: true },
      { ...base, position: 2, quantity: 200, description: 'Panfleto A5 com verniz.', omitDescription: true },
      { ...base, position: 3, quantity: 300, description: 'Cartão.', omitDescription: false },
    ])
    expect(items.map((i) => i.printedDescription)).toEqual(['Panfleto A5.', null, 'Cartão.'])
  })

  it('carimbo e assinatura seguem a regra das imagens: só http ou https', () => {
    expect(imageUrlIssue(null)).toBeNull()
    expect(imageUrlIssue('https://cdn.soset.com.br/carimbo.png')).toBeNull()
    expect(imageUrlIssue('file:///c:/carimbo.png')).not.toBeNull()
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

  it('cabeçalho com negrito e itálico, como a Soset escreve o dela', () => {
    expect(headerSegments('CNPJ ***49.204.274/0001-91***')).toEqual([
      { text: 'CNPJ ', bold: false, italic: false },
      { text: '49.204.274/0001-91', bold: true, italic: true },
    ])
    expect(headerSegments('**gráfica soset**')).toEqual([{ text: 'gráfica soset', bold: true, italic: false }])
    expect(headerSegments('*itálico* e 2 * 3')).toEqual([
      { text: 'itálico', bold: false, italic: true },
      { text: ' e 2 * 3', bold: false, italic: false },
    ])
  })

  it('linha em branco do meio fica; as das pontas saem', () => {
    const lines = headerLines('\r\n**gráfica soset**\r\n**indústria e comércio ltda.**\r\n\r\nRua Tte. Cel. Zacarias, 88\n\n')
    expect(lines).toHaveLength(4)
    expect(lines[2]).toEqual([])
    expect(lines[3]).toEqual([{ text: 'Rua Tte. Cel. Zacarias, 88', bold: false, italic: false }])
  })

  it('no máximo 12 linhas no cabeçalho', () => {
    expect(proposalHeaderIssue('')).toBeNull()
    expect(proposalHeaderIssue(Array.from({ length: 12 }, (_, i) => `linha ${i}`).join('\n'))).toBeNull()
    expect(proposalHeaderIssue(Array.from({ length: 13 }, (_, i) => `linha ${i}`).join('\n'))).not.toBeNull()
  })

  it('cabeçalho montado do cadastro no formato do texto', () => {
    const text = defaultProposalHeader(
      {
        name: 'Gráfica Soset', corporateName: 'Gráfica Soset Indústria e Comércio Ltda.', document: '49204274000191',
        email: 'soset@soset.com.br', phone: '1338411142',
        address: { street: 'Rua Tte. Cel. Zacarias', number: '88', complement: null, neighborhood: null, city: 'Iguape', state: 'SP', postalCode: null },
      },
      { document: () => '49.204.274/0001-91', phone: () => '(13) 3841-1142' },
    )
    expect(text).toBe(
      '**Gráfica Soset Indústria e Comércio Ltda.**\nRua Tte. Cel. Zacarias, 88\nIguape - SP\n' +
        'Fone: (13) 3841-1142\nE-mail: soset@soset.com.br\nCNPJ ***49.204.274/0001-91***',
    )
  })
})
