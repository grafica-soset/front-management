/**
 * Representação de uma Pessoa (física ou jurídica) conforme o backend GraphicOS.
 *
 * - PHYSICAL: usuários cadastrados via POST /users ou POST /admin/setup.
 * - LEGAL: empresas (Customer) cadastradas via POST /customers.
 */
export type PersonType = 'PHYSICAL' | 'LEGAL'

export type GlobalRole = 'ADMIN' | 'USER' | 'CUSTOMER' | 'PROVIDER'

export interface Person {
  id: number
  personType: PersonType
  name: string
  corporateName: string | null
  document: string
  email: string | null
  phone: string | null
  roles: GlobalRole[]
  active: boolean
}
