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
 */
export interface PaperType {
  id: number
  name: string
  description: string | null
  weightPerM2Grams: number
  thicknessMicrometers: number
  bothSidesEqual: boolean
  active: boolean
}

/** Payload de POST /paper-types. */
export interface CreatePaperTypeRequest {
  name: string
  description?: string | null
  weightPerM2Grams: number
  thicknessMicrometers: number
  bothSidesEqual: boolean
}

/** Payload de PUT /paper-types/{id}. */
export interface UpdatePaperTypeRequest {
  name: string
  description?: string | null
  weightPerM2Grams: number
  thicknessMicrometers: number
  bothSidesEqual: boolean
  active: boolean
}
