/**
 * Sentido da fibra de um papel — em qual lado da folha a fibra corre.
 *
 * - `WIDTH`  → fibra no sentido da **largura** (`width`).
 * - `HEIGHT` → fibra no sentido do **comprimento** (`height`).
 *
 * Propriedade do papel (não do agrupamento). Pode vir `null` em papéis legados.
 */
export type GrainDirection = 'WIDTH' | 'HEIGHT'
