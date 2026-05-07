/**
 * DTOs alinhados com UserController.kt (backend Kotlin/Quarkus).
 */

export interface PersonDto {
  id?: number
  name: string
  email?: string | null
  phone?: string | null
  document?: string | null
}

export interface UserResponse {
  id: number
  username: string
  active: boolean
  person: PersonDto
  createdAt?: string
  updatedAt?: string
}

export interface CreateUserRequest {
  username: string
  password: string
  active?: boolean
  person: PersonDto
}

export interface UpdateUserRequest {
  username?: string
  password?: string
  active?: boolean
  person?: PersonDto
}

export interface UserListQuery {
  page?: number
  size?: number
  nameFilter?: string
}
