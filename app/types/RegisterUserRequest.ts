/**
 * Payload de POST /users (cadastro de pessoa física com role global USER).
 *
 * Mesmo contrato utilizado por POST /admin/setup.
 */
export interface RegisterUserRequest {
  name: string
  document: string
  email?: string | null
  phone?: string | null
  username: string
  password: string
}
