<script setup lang="ts">
import type { CreateUserRequest } from '~/types'

const usersApi = useUsers()
const router = useRouter()

const saving = ref(false)
const errorMessage = ref<string | null>(null)

const handleSubmit = async (payload: CreateUserRequest) => {
  saving.value = true
  errorMessage.value = null
  try {
    await usersApi.create(payload)
    router.push('/users')
  } catch (err) {
    logApiError('Falha ao criar usuário', err)
    errorMessage.value = extractApiErrorMessage(err, 'Falha ao criar usuário.')
  } finally {
    saving.value = false
  }
}

const handleCancel = () => router.push('/users')
</script>

<template>
  <section class="mx-auto flex w-full max-w-3xl flex-col gap-4">
    <header class="flex items-center gap-3">
      <BaseButton variant="ghost" @click="handleCancel">
        <Icon name="lucide:arrow-left" class="size-4" />
      </BaseButton>
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Novo usuário</h1>
        <p class="text-sm text-slate-500">
          Cadastre um novo acesso ao sistema (Pessoa Física).
        </p>
      </div>
    </header>

    <div v-if="errorMessage" class="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <div class="card p-5">
      <UserForm :loading="saving" @submit="handleSubmit" @cancel="handleCancel" />
    </div>
  </section>
</template>
