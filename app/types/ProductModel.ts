/**
 * MODELO — a família do produto: "Blocos", "Talões", "Calendários" (atividade 028, redesenhado na
 * 037). É só o nome: a configuração do produto está no Modelo de Produto salvo (ProductTemplate),
 * identificado por Modelo + Tipo.
 */
export interface ProductModel {
  id: number
  customerId: number
  name: string
  active: boolean
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
}

export interface UpdateProductModelRequest extends CreateProductModelRequest {
  active: boolean
}
