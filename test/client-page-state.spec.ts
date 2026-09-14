import { describe, expect, it } from 'vitest'
import {
  addStatusMutation,
  canSubmitClientForm,
  canRefreshAfterStatusMutation,
  hasPendingClientEditor,
  pageToReloadAfterEmptyResult,
  removeStatusMutation,
} from '@/utils/clientPageState'

describe('estado da página de clientes', () => {
  it('volta para a última página existente quando a página atual fica vazia', () => {
    expect(pageToReloadAfterEmptyResult({
      requestedPage: 3,
      totalPages: 3,
      itemCount: 0,
    })).toBe(2)
  })

  it('não recarrega quando a página possui itens', () => {
    expect(pageToReloadAfterEmptyResult({
      requestedPage: 2,
      totalPages: 3,
      itemCount: 1,
    })).toBeNull()
  })

  it('identifica endereço ou contato ainda aberto no cadastro', () => {
    expect(hasPendingClientEditor('new', null)).toBe(true)
    expect(hasPendingClientEditor(null, 0)).toBe(true)
    expect(hasPendingClientEditor(null, null)).toBe(false)
  })

  it('bloqueia reenvio durante carregamento e com editor pendente', () => {
    expect(canSubmitClientForm({ loading: true, hasPendingEditor: false })).toBe(false)
    expect(canSubmitClientForm({ loading: false, hasPendingEditor: true })).toBe(false)
    expect(canSubmitClientForm({ loading: false, hasPendingEditor: false })).toBe(true)
  })

  it('mantém alterações de status simultâneas independentes', () => {
    const primeiro = addStatusMutation([], 10)
    const doisEmAndamento = addStatusMutation(primeiro, 20)

    expect(doisEmAndamento).toEqual([10, 20])
    expect(removeStatusMutation(doisEmAndamento, 10)).toEqual([20])
    expect(canRefreshAfterStatusMutation(3, 3)).toBe(true)
    expect(canRefreshAfterStatusMutation(3, 4)).toBe(false)
  })
})
