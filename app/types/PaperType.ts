/**
 * Agrupamento de medidas (PaperType na API). É o agrupador principal do
 * módulo — análogo a um produto de estoque com vários SKUs (os papéis).
 *
 * Define os atributos compartilhados por todos os seus papéis:
 * gramatura (weightPerM2Grams), espessura (thicknessMicrometers) e
 * lado do papel (bothSidesEqual).
 *
 * Lado do papel (`bothSidesEqual`): `true` = "2 lados" (lados iguais, ex.:
 * Couché Brilho); `false` = "1 lado" (lados diferentes, ex.: cartão duplex).
 *
 * Taxa de absorção (atividade 032 — ajuste 0001): quantos gramas de tinta por metro quadrado
 * impresso a superfície do papel absorve. São duas, porque toner e tinta offset se comportam
 * de forma diferente na mesma superfície. Fica no agrupamento (e não no papel) porque depende
 * do revestimento, comum a todas as dimensões.
 */
export interface PaperType {
  id: number
  name: string
  description: string | null
  weightPerM2Grams: number
  thicknessMicrometers: number
  bothSidesEqual: boolean
  /** g/m² de toner absorvidos (impressão digital). */
  tonerAbsorptionGramsPerM2: number
  /** g/m² de tinta offset absorvidos. */
  offsetAbsorptionGramsPerM2: number
  active: boolean
}

/** Payload de POST /paper-types. */
export interface CreatePaperTypeRequest {
  name: string
  description?: string | null
  weightPerM2Grams: number
  thicknessMicrometers: number
  bothSidesEqual: boolean
  tonerAbsorptionGramsPerM2: number
  offsetAbsorptionGramsPerM2: number
}

/** Payload de PUT /paper-types/{id}. */
export interface UpdatePaperTypeRequest {
  name: string
  description?: string | null
  weightPerM2Grams: number
  thicknessMicrometers: number
  bothSidesEqual: boolean
  /** g/m² de toner absorvidos (impressão digital). */
  tonerAbsorptionGramsPerM2: number
  /** g/m² de tinta offset absorvidos. */
  offsetAbsorptionGramsPerM2: number
  active: boolean
}
