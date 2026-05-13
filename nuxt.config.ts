// https://nuxt.com/docs/api/configuration/nuxt-config

// URL do backend GraphicOS — usada para proxiar /api/** via Nitro, evitando CORS
// entre o dev server (localhost:3000) e a API (localhost:5000).
const apiBaseUrl = process.env.NUXT_API_BASE_URL || 'http://localhost:5000'

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  future: {
    compatibilityVersion: 4,
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
  ],
  runtimeConfig: {
    public: {
      // Mantido público caso algum trecho precise da URL absoluta da API.
      apiBaseUrl,
    },
  },
  // Proxy reverso: o front bate em /api/** (mesma origem) e o Nitro
  // encaminha para o backend real. Resolve CORS sem alterar o backend.
  routeRules: {
    '/api/**': { proxy: `${apiBaseUrl}/**` },
  },
  piniaPluginPersistedstate: {
    storage: 'cookies',
    cookieOptions: {
      sameSite: 'lax',
      secure: false,
      path: '/',
    },
  },
})
