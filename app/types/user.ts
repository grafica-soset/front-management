import type { BasePagedQuery, PersonDto } from './shared'

/**
 * DTOs alinhados com UserController.kt e UserDtos.kt.
 */

export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR'

export const USER_ROLE_OPTIONS: Array<{ value: UserRole, label: string }> = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Gerente' },
  { value: 'OPERATOR', label: 'Operador' },
]

export interface UserResponse {
  id: number
  username: string
  role: UserRole
  active: boolean
  person: PersonDto
  createdAt?: string
  updatedAt?: string
}

export interface CreateUserRequest {
  username: string
  password: string
  role: UserRole
  active: boolean
  person: PersonDto
}

export interface UpdateUserRequest {
  username?: string
  password?: string
  role?: UserRole
  active?: boolean
  person?: PersonDto
}

export interface UserListQuery extends BasePagedQuery {
  name?: string
  active?: boolean
}
