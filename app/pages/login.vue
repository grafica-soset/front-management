<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const authStore = useAuthStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const handleSubmit = async () => {
  errorMessage.value = null
  if (!username.value || !password.value) {
    errorMessage.value = 'Informe usuário e senha'
    return
  }

  loading.value = true
  try {
    await authStore.login({ username: username.value, password: password.value })
    await router.push('/')
  } catch (err: unknown) {
    const message = err && typeof err === 'object' && 'data' in err
      ? (err as { data?: { message?: string; statusMessage?: string } }).data?.message
        ?? (err as { data?: { statusMessage?: string } }).data?.statusMessage
      : null
    errorMessage.value = message ?? 'Falha ao autenticar'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BaseForm @submit="handleSubmit">
    <h2 class="text-lg font-semibold text-slate-800">Acessar conta</h2>

    <BaseInput
      v-model="username"
      label="Usuário"
      placeholder="seu.usuario"
      autocomplete="username"
      required
    />
    <BaseInput
      v-model="password"
      type="password"
      label="Senha"
      placeholder="••••••••"
      autocomplete="current-password"
      required
    />

    <div v-if="errorMessage" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <BaseButton type="submit" :loading="loading" class="w-full">
      Entrar
    </BaseButton>

    <p class="text-center text-xs text-slate-400">
      Autenticação ainda em modo mock — qualquer credencial é aceita.
    </p>
  </BaseForm>
</template>
