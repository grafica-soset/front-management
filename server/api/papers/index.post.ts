import { readBody } from 'h3'
import type { CreatePaperRequest, PaperResponse } from '~/types/paper'

/**
 * Mock temporário do POST /api/papers.
 * O backend exige JWT válido nos métodos de escrita; enquanto a autenticação
 * real não está pronta, este handler retorna um PaperResponse simulado com base
 * no body enviado, permitindo validar o fluxo do formulário.
 *
 * TODO: remover este arquivo quando o login real for integrado e o token
 * passar a ser repassado pelo proxy.
 */
let nextId = 1
let nextTypeId = 1

export default defineEventHandler(async (event) => {
  const body = await readBody<CreatePaperRequest>(event)

  console.log('[mock POST /api/papers] payload:', JSON.stringify(body, null, 2))

  const type = body.typeId
    ? { id: body.typeId, name: `Tipo #${body.typeId}` }
    : { id: nextTypeId++, name: body.typeName ?? 'Novo tipo' }

  const response: PaperResponse = {
    id: nextId++,
    sku: {
      id: 1000 + nextId,
      name: body.sku.name,
      code: body.sku.code ?? null,
      description: body.sku.description ?? null,
    },
    type,
    formatWidth: body.formatWidth,
    formatHeight: body.formatHeight,
    grammageG: body.grammageG,
    pricePerKg: body.pricePerKg ?? null,
    pricePerSheet: body.pricePerSheet ?? null,
    supplier: body.supplier ?? null,
    active: body.active,
    createdAt: new Date().toISOString(),
  }

  setResponseStatus(event, 201)
  return response
})
