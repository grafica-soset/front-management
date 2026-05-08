// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

const apiBaseUrl = process.env.NUXT_API_BASE_URL || 'http://localhost:5000'
const componentsDir = fileURLToPath(new URL('./app/components', import.meta.url))

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxt/icon',
  ],
  css: ['~/assets/css/tailwind.css'],
  // Registra os componentes sem prefixar pelo nome da subpasta
  // (ex.: app/components/forms/UserForm.vue -> <UserForm />).
  // Em Nuxt 4 com `srcDir = app/` o resolver `~/components` não captura
  // confiavelmente as subpastas — usamos caminho absoluto por isso.
  components: [
    { path: componentsDir, pathPrefix: false },
  ],
  runtimeConfig: {
    apiBaseUrl,
    public: {},
  },
  app: {
    head: {
      title: 'Soset',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
  imports: {
    dirs: ['stores'],
  },
  pinia: {
    storesDirs: ['./app/stores/**'],
  },
  piniaPluginPersistedstate: {
    storage: 'cookies',
  },
})
