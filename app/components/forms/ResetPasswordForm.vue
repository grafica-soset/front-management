<script setup lang="ts">
/**
 * Formulário para o admin redefinir a senha de um usuário da empresa.
 * Mapeia para PUT /customer-users/{linkId}/password (cf. .docs/customer-users.md §3).
 */
import { reactive, ref } from 'vue'
import { z } from 'zod'
import type { ResetCustomerUserPasswordRequest } from '@/types/CustomerUser'

const props = defineProps<{
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: ResetCustomerUserPasswordRequest): void
  (e: 'cancel'): void
}>()

const form = reactive({
  newPassword: '',
  confirmPassword: '',
})

const showPassword = ref(false)
const errors = ref<{ newPassword?: string; confirmPassword?: string }>({})

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Senha deve ter ao menos 8 caracteres.')
      .max(200, 'Senha não pode ter mais que 200 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'A confirmação não confere com a nova senha.',
    path: ['confirmPassword'],
  })

const handleSubmit = () => {
  errors.value = {}
  const result = schema.safeParse(form)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0] as 'newPassword' | 'confirmPassword'
      if (key && !errors.value[key]) errors.value[key] = issue.message
    }
    return
  }
  emit('submit', { newPassword: result.data.newPassword })
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <div>
      <label for="reset-password" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
        Nova senha <span class="text-rose-500">*</span>
      </label>
      <div class="relative">
        <input
          id="reset-password"
          v-model="form.newPassword"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          placeholder="Mínimo de 8 caracteres"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 pr-10 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.newPassword }"
        />
        <button
          type="button"
          @click="showPassword = !showPassword"
          :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
          :aria-pressed="showPassword"
          class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none focus:text-indigo-600 dark:focus:text-indigo-400 transition-colors"
        >
          <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
        </button>
      </div>
      <p v-if="errors.newPassword" class="mt-1 text-xs text-rose-600">{{ errors.newPassword }}</p>
    </div>

    <div>
      <label for="reset-password-confirm" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
        Confirmar nova senha <span class="text-rose-500">*</span>
      </label>
      <input
        id="reset-password-confirm"
        v-model="form.confirmPassword"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="new-password"
        placeholder="Repita a nova senha"
        class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.confirmPassword }"
      />
      <p v-if="errors.confirmPassword" class="mt-1 text-xs text-rose-600">{{ errors.confirmPassword }}</p>
    </div>

    <div
      v-if="serverError"
      class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300"
    >
      {{ serverError }}
    </div>

    <div class="flex justify-end gap-3 pt-2">
      <button
        type="button"
        @click="emit('cancel')"
        class="text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
      >
        Cancelar
      </button>
      <button
        type="submit"
        :disabled="loading"
        class="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed font-medium rounded-lg text-sm px-5 py-2.5 shadow-md shadow-indigo-500/20"
      >
        {{ loading ? 'Salvando...' : 'Redefinir senha' }}
      </button>
    </div>
  </form>
</template>
