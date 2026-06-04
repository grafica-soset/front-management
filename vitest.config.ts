import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Configuração do Vitest para testes unitários (lógica pura — sem runtime do
 * Nuxt). O alias `@` aponta para `app/`, igual ao usado nos componentes/utils.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
})
