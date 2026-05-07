import type { BasePagedQuery, PersonDto } from './shared'

/**
 * DTOs alinhados com CustomerController.kt e CustomerDtos.kt.
 */

export interface CustomerResponse {
  id: number
  active: boolean
  creditLimit: number
  person: PersonDto
  createdAt?: string
  updatedAt?: string
}

export interface CreateCustomerRequest {
  active: boolean
  creditLimit: number
  person: PersonDto
}

export interface UpdateCustomerRequest {
  active?: boolean
  creditLimit?: number
  person?: PersonDto
}

export interface CustomerListQuery extends BasePagedQuery {
  name?: string
  active?: boolean
}
