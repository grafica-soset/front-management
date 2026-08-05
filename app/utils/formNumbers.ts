/**
 * Guardas numéricas dos formulários.
 *
 * Um `<input type="number">` esvaziado devolve STRING VAZIA — e o JavaScript é traiçoeiro aqui:
 * `'' >= 0` é `true` e `Number('')` é `0`. Sem estas funções o campo em branco passa pela
 * validação do formulário e vai para a API como `""`, que o backend recusa com um 400 genérico
 * ("JSON inválido ou campo obrigatório ausente") — o usuário vê o salvamento falhar sem saber
 * qual campo corrigir.
 */

/** `true` quando o valor é nulo ou texto vazio/só espaços (campo não preenchido). */
export function isBlank(value: unknown): boolean {
  return value == null || (typeof value !== 'number' && String(value).trim() === '')
}

/** `true` se [value] é um NÚMERO finito (não texto, não NaN) e vale pelo menos [min]. */
export function isNumberAtLeast(value: unknown, min: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= min
}
