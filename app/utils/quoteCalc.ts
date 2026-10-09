/**
 * Cálculo sob demanda do produto (atividade 047).
 *
 * O assistente fornece (provide) as pendências que impedem o cálculo; o botão Calcular, onde quer
 * que esteja, as lê (inject) para ficar desabilitado e dizer o que falta.
 */
import type { ComputedRef, InjectionKey } from 'vue'

export const CALC_BLOCKERS_KEY: InjectionKey<ComputedRef<string[]>> = Symbol('calcBlockers')

/**
 * O produto está aberto só para DETALHAR (atividade 047): o orçamento é aprovado (imutável) ou
 * rejeitado. O assistente mostra as mesmas abas com os campos travados; Calcular e Salvar somem.
 */
export const QUOTE_READONLY_KEY: InjectionKey<ComputedRef<boolean>> = Symbol('quoteReadOnly')
