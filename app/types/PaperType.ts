/** Tipo de papel (Sulfite, Couché, Cartão, etc.). */
export interface PaperType {
  id: number
  name: string
  description: string | null
  active: boolean
}

/** Payload de POST /paper-types. */
export interface CreatePaperTypeRequest {
  name: string
  description?: string | null
}

/** Payload de PUT /paper-types/{id}. */
export interface UpdatePaperTypeRequest {
  name: string
  description?: string | null
  active: boolean
}
