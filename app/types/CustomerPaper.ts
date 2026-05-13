import type { Paper } from './Paper'

/** Vínculo papel ↔ empresa em customer_papers. */
export interface CustomerPaper {
  id: number
  customerId: number
  paperId: number
  active: boolean
  totalQuantity: number
  pricePerSheet: number
  pricePerKg: number
}

/** Resposta de GET /customers/{id}/papers — papel + vínculo. */
export interface CustomerPaperEntry {
  customerPaper: CustomerPaper
  paper: Paper
}

/** Resposta de POST /papers. `customerPaper` só vem quando o caller foi CUSTOMER. */
export interface CreatePaperResponse {
  paper: Paper
  customerPaper: CustomerPaper | null
}

/** Payload de PUT /customers/{id}/papers/{paperId}. */
export interface ToggleCustomerPaperRequest {
  active: boolean
}
