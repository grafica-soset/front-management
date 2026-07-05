/**
 * Modelo de produto (atividade 028): reúne atividades marcadas como fixas (obrigatórias) ou
 * complementares (opcionais). Base do orçamento.
 */

/** Atividade do modelo: id + fixa/complementar. */
export interface ModelActivity {
  activityId: number
  /** true = fixa/obrigatória; false = complementar/opcional. */
  required: boolean
}

export interface ProductModel {
  id: number
  customerId: number
  name: string
  active: boolean
  activities: ModelActivity[]
}

/** Item KeyValue da listagem de modelos. */
export interface ProductModelKeyValue {
  id: number
  value: string
  active: boolean
}

export interface ProductModelPage {
  items: ProductModel[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export interface CreateProductModelRequest {
  customerId: number
  name: string
  activities: ModelActivity[]
}

export interface UpdateProductModelRequest extends CreateProductModelRequest {
  active: boolean
}
