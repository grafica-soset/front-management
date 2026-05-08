/**
 * Tipos centrais do sistema Soset.
 *
 * Espelham os DTOs publicados pelo backend (Quarkus/Kotlin) — qualquer
 * mudança aqui deve refletir o contrato da API descrito em
 * `docs/api-crud-endpoints.md`.
 */

// ---------------------------------------------------------------------------
// Compartilhados
// ---------------------------------------------------------------------------

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface KeyValueDto {
  id: number
  value: string
}

export interface BasePagedQuery {
  page?: number
  size?: number
}

/**
 * Indicador de contribuinte de ICMS conforme contrato do backend.
 * - TAXPAYER: contribuinte do ICMS.
 * - NON_TAXPAYER: não contribuinte (geralmente pessoa física).
 * - EXEMPT: contribuinte isento de inscrição estadual.
 */
export type IcmsTaxpayerIndicator = 'TAXPAYER' | 'NON_TAXPAYER' | 'EXEMPT'

export const ICMS_TAXPAYER_OPTIONS: ReadonlyArray<{
  value: IcmsTaxpayerIndicator
  label: string
}> = [
  { value: 'TAXPAYER', label: 'Contribuinte do ICMS' },
  { value: 'NON_TAXPAYER', label: 'Não contribuinte' },
  { value: 'EXEMPT', label: 'Contribuinte isento de IE' },
]

/**
 * DTO de pessoa, compartilhado por usuários e clientes (PF e PJ).
 * `name` e `document` são obrigatórios; demais campos podem ser nulos.
 */
export interface PersonDto {
  id?: number | null
  name: string
  corporateName?: string | null
  document: string
  email?: string | null
  stateRegistration?: string | null
  municipalRegistration?: string | null
  suframaRegistration?: string | null
  isFinalConsumer: boolean
  icmsTaxpayerIndicator: IcmsTaxpayerIndicator
}

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------

export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'SELLER'

export const USER_ROLE_OPTIONS: ReadonlyArray<{ value: UserRole, label: string }> = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Gerente' },
  { value: 'OPERATOR', label: 'Operador' },
  { value: 'SELLER', label: 'Vendedor' },
]

export interface UserResponse {
  id: number
  person: PersonDto
  username: string
  role: UserRole
  active: boolean
}

export interface CreateUserRequest {
  person: PersonDto
  username: string
  password: string
  role: UserRole
  active: boolean
}

export interface UpdateUserRequest {
  person: PersonDto
  username: string
  password?: string | null
  role: UserRole
  active: boolean
}

export interface UserListQuery extends BasePagedQuery {
  name?: string
  active?: boolean
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export interface CustomerResponse {
  id: number
  person: PersonDto
  creditLimit: number
  active: boolean
}

export interface CreateCustomerRequest {
  person: PersonDto
  creditLimit: number
  active: boolean
}

export interface UpdateCustomerRequest {
  person: PersonDto
  creditLimit: number
  active: boolean
}

export interface CustomerListQuery extends BasePagedQuery {
  name?: string
  active?: boolean
}

// ---------------------------------------------------------------------------
// Papéis / Insumos
// ---------------------------------------------------------------------------

export type UnitOfMeasure =
  | 'SHEET'
  | 'KG'
  | 'UN'
  | 'LITERS'
  | 'METER'
  | 'BOX'
  | 'PACKAGE'

export const UNIT_OF_MEASURE_OPTIONS: ReadonlyArray<{
  value: UnitOfMeasure
  label: string
}> = [
  { value: 'SHEET', label: 'Folha (SHEET)' },
  { value: 'KG', label: 'Quilograma (KG)' },
  { value: 'UN', label: 'Unidade (UN)' },
  { value: 'LITERS', label: 'Litros (LITERS)' },
  { value: 'METER', label: 'Metro (METER)' },
  { value: 'BOX', label: 'Caixa (BOX)' },
  { value: 'PACKAGE', label: 'Pacote (PACKAGE)' },
]

export interface PaperSkuDto {
  id: number
  code: string
  name: string
  unitOfMeasure: UnitOfMeasure
}

export interface PaperTypeDto {
  id: number
  name: string
  description?: string | null
}

/**
 * Resposta completa do recurso de tipo de papel.
 * Equivalente ao DTO inline `PaperTypeDto`, mas exposto separadamente para
 * o módulo dedicado (lista, criação e edição via `/paper-types`).
 */
export interface PaperTypeResponse {
  id: number
  name: string
  description?: string | null
}

export interface CreatePaperTypeRequest {
  name: string
  description?: string | null
}

export interface UpdatePaperTypeRequest {
  name: string
  description?: string | null
}

export interface PaperTypeListQuery extends BasePagedQuery {
  name?: string
}

export interface PaperResponse {
  id: number
  sku: PaperSkuDto
  type: PaperTypeDto
  supplier?: PersonDto | null
  isEnvelope: boolean
  formatWidth: number
  formatHeight: number
  thicknessUm: number
  grammageG: number
  pricePerKg?: number | null
  pricePerSheet?: number | null
}

/**
 * Payload de criação de papel.
 * `typeId` reaproveita um tipo existente; quando ausente, o backend cria
 * um novo tipo a partir de `typeName` + `typeDescription`.
 * `supplier` é opcional.
 */
export interface CreatePaperRequest {
  skuCode?: string | null
  skuName: string
  unitOfMeasure: UnitOfMeasure
  typeId?: number | null
  typeName?: string | null
  typeDescription?: string | null
  supplier?: PersonDto | null
  isEnvelope: boolean
  formatWidth: number
  formatHeight: number
  thicknessUm: number
  grammageG: number
  pricePerKg?: number | null
  pricePerSheet?: number | null
}

/**
 * Payload de atualização de papel.
 * Diferente do create, `skuCode`, `typeId` e `typeName` são obrigatórios.
 */
export interface UpdatePaperRequest {
  skuCode: string
  skuName: string
  unitOfMeasure: UnitOfMeasure
  typeId: number
  typeName: string
  typeDescription?: string | null
  supplier?: PersonDto | null
  isEnvelope: boolean
  formatWidth: number
  formatHeight: number
  thicknessUm: number
  grammageG: number
  pricePerKg?: number | null
  pricePerSheet?: number | null
}

export interface PaperListQuery extends BasePagedQuery {
  name?: string
  typeId?: number
}
