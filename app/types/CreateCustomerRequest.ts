/** Payload de POST /customers (cadastro de empresa cliente — exige JWT). */
export interface CreateCustomerRequest {
  name: string
  corporateName?: string | null
  document: string
  email?: string | null
  phone?: string | null
}
