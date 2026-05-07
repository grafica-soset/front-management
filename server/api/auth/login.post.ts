import { readBody, createError } from 'h3'

/**
 * Mock temporário do endpoint de login.
 * Aceita qualquer credencial e retorna um token + usuário fictícios.
 *
 * TODO: Quando o backend (Quarkus) expuser /auth/login, remover este arquivo
 * para que o catch-all proxy ([...path].ts) repasse a chamada.
 */
interface LoginPayload {
  username?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginPayload>(event)

  if (!body?.username || !body?.password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'username e password são obrigatórios',
    })
  }

  return {
    token: 'mock-jwt-token-' + Date.now(),
    user: {
      id: 1,
      username: body.username,
      role: 'ADMIN',
      active: true,
      person: {
        id: 1,
        name: body.username,
        document: '',
        isFinalConsumer: false,
        icmsTaxpayerIndicator: '9',
      },
    },
  }
})
