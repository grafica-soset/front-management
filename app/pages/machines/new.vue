<script setup lang="ts">
import type { CreateMachineRequest } from '~/types'

const machinesApi = useMachines()
const router = useRouter()

const saving = ref(false)
const errorMessage = ref<string | null>(null)

const handleSubmit = async (payload: CreateMachineRequest) => {
  saving.value = true
  errorMessage.value = null
  try {
    await machinesApi.create(payload)
    router.push('/machines')
  } catch (err) {
    logApiError('Falha ao criar máquina', err)
    errorMessage.value = extractApiErrorMessage(err, 'Falha ao criar máquina.')
  } finally {
    saving.value = false
  }
}

const handleCancel = () => router.push('/machines')
</script>

<template>
  <section class="mx-auto flex w-full max-w-5xl flex-col gap-4">
    <header class="flex items-center gap-3">
      <BaseButton variant="ghost" @click="handleCancel">
        <Icon name="lucide:arrow-left" class="size-4" />
      </BaseButton>
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Nova máquina</h1>
        <p class="text-sm text-slate-500">
          Cadastre um equipamento com suas especificações técnicas e dimensionais.
        </p>
      </div>
    </header>

    <div v-if="errorMessage" class="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <div class="card p-5">
      <MachineForm :loading="saving" @submit="handleSubmit" @cancel="handleCancel" />
    </div>
  </section>
</template>
