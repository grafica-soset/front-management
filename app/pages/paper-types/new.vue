<script setup lang="ts">
import type { CreatePaperTypeRequest } from '~/types'

const paperTypesApi = usePaperTypes()
const router = useRouter()

const saving = ref(false)
const errorMessage = ref<string | null>(null)

const handleSubmit = async (payload: CreatePaperTypeRequest) => {
  saving.value = true
  errorMessage.value = null
  try {
    await paperTypesApi.create(payload)
    router.push('/paper-types')
  } catch (err) {
    logApiError('Falha ao criar tipo de papel', err)
    errorMessage.value = extractApiErrorMessage(err, 'Falha ao criar tipo de papel.')
  } finally {
    saving.value = false
  }
}

const handleCancel = () => router.push('/paper-types')
</script>

<template>
  <section class="mx-auto flex w-full max-w-2xl flex-col gap-4">
    <header class="flex items-center gap-3">
      <BaseButton variant="ghost" @click="handleCancel">
        <Icon name="lucide:arrow-left" class="size-4" />
      </BaseButton>
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Novo tipo de papel</h1>
        <p class="text-sm text-slate-500">
          Cadastre uma categoria que poderá ser referenciada por SKUs de papel.
        </p>
      </div>
    </header>

    <div v-if="errorMessage" class="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <div class="card p-5">
      <PaperTypeForm :loading="saving" @submit="handleSubmit" @cancel="handleCancel" />
    </div>
  </section>
</template>
