// https://nuxt.com/docs/api/configuration/nuxt-config

const apiBaseUrl = process.env.NUXT_API_BASE_URL || 'http://localhost:5000'

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
