/** Payload de POST /sale-operations e PUT /sale-operations/{id}. */
export interface SaleOperationRequest {
  name: string
  code: string
  /** Descrição na NF-e: texto do campo natOp da nota (máx. 60 caracteres). */
  description: string
}

/** Resposta de GET/POST/PUT/PATCH /sale-operations e item da paginação. */
export interface SaleOperation {
  id: number
  code: string
  name: string
  description: string
  active: boolean
}

/** Item de GET /sale-operations — apenas operações ativas, ordenadas pelo código. */
export interface SaleOperationListItem {
  id: number
  code: string
  name: string
}

export interface SaleOperationPage {
  items: SaleOperation[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}
