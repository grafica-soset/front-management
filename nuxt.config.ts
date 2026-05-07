// https://nuxt.com/docs/api/configuration/nuxt-config
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
  // (ex.: components/forms/UserForm.vue -> <UserForm />).
  components: [
    { path: '~/components', pathPrefix: false },
  ],

  // O frontend chama /api/... do próprio Nuxt; o proxy em server/api repassa para o backend.
  runtimeConfig: {
    apiBaseUrl: '', // preenchido por NUXT_API_BASE_URL
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

  // Em Nuxt 4 (srcDir = app/) precisamos incluir explicitamente o diretório
  // de stores no auto-import do Nuxt; @pinia/nuxt apenas auto-importa helpers.
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
