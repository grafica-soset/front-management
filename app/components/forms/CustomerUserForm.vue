<script setup lang="ts">
/**
 * Formulário de cadastro de usuário interno da empresa.
 *
 * Implementa as regras do POST /customer-users:
 *  - name, document, username, password e role são obrigatórios.
 *  - document: 11–14 dígitos (CPF, somente números).
 *  - username: 3–100 caracteres.
 *  - password: 8–200 caracteres (BCrypt cost 12 no backend).
 *  - email opcional (validado se informado).
 *  - role: ADMIN ou USER.
 */
import { reactive, ref } from 'vue'
import { z } from 'zod'
import type { CreateCustomerUserRequest, TenantRole } from '@/types/CustomerUser'

const props = defineProps<{
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: CreateCustomerUserRequest): void
  (e: 'cancel'): void
}>()

const form = reactive<CreateCustomerUserRequest>({
  name: '',
  document: '',
  email: '',
  phone: '',
  username: '',
  password: '',
  role: 'USER',
})

const showPassword = ref(false)
const errors = ref<Partial<Record<keyof CreateCustomerUserRequest, string>>>({})

const schema = z.object({
  name: z.string().min(1, 'Informe o nome.'),
  document: z
    .string()
    .min(11, 'Documento deve ter entre 11 e 14 dígitos.')
    .max(14, 'Documento deve ter entre 11 e 14 dígitos.')
    .regex(/^\d+$/u, 'Use apenas dígitos no documento.'),
  email: z
    .string()
    .email('E-mail inválido.')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  username: z
    .string()
    .min(3, 'Usuário deve ter entre 3 e 100 caracteres.')
    .max(100, 'Usuário deve ter entre 3 e 100 caracteres.'),
  password: z
    .string()
    .min(8, 'Senha deve ter ao menos 8 caracteres.')
    .max(200, 'Senha não pode ter mais que 200 caracteres.'),
  role: z.enum(['ADMIN', 'USER']),
})

const handleSubmit = () => {
  errors.value = {}
  const result = schema.safeParse(form)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof CreateCustomerUserRequest
      if (key && !errors.value[key]) errors.value[key] = issue.message
    }
    return
  }

  // Remove campos opcionais vazios para não enviar strings em branco ao backend.
  const data = result.data
  const payload: CreateCustomerUserRequest = {
    name: data.name,
    document: data.document,
    username: data.username,
    password: data.password,
    role: data.role as TenantRole,
  }
  if (data.email) payload.email = data.email
  if (data.phone) payload.phone = data.phone
  emit('submit', payload)
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <!-- Dados pessoais -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="md:col-span-2">
        <label for="user-name" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Nome <span class="text-rose-500">*</span>
        </label>
        <input
          id="user-name"
          v-model="form.name"
          type="text"
          placeholder="Mariana Souza"
          autocomplete="name"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.name }"
        />
        <p v-if="errors.name" class="mt-1 text-xs text-rose-600">{{ errors.name }}</p>
      </div>

      <div>
        <label for="user-document" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          CPF <span class="text-rose-500">*</span>
        </label>
        <input
          id="user-document"
          v-model="form.document"
          type="text"
          inputmode="numeric"
          maxlength="14"
          placeholder="Somente números"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.document }"
        />
        <p v-if="errors.document" class="mt-1 text-xs text-rose-600">{{ errors.document }}</p>
      </div>

      <div>
        <label for="user-phone" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          Telefone
        </label>
        <input
          id="user-phone"
          v-model="form.phone"
          type="tel"
          placeholder="+55 19 9 8811 7722"
          autocomplete="tel"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        />
      </div>

      <div class="md:col-span-2">
        <label for="user-email" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
          E-mail
        </label>
        <input
          id="user-email"
          v-model="form.email"
          type="email"
          autocomplete="email"
          placeholder="usuario@empresa.com.br"
          class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.email }"
        />
        <p v-if="errors.email" class="mt-1 text-xs text-rose-600">{{ errors.email }}</p>
      </div>
    </div>

    <!-- Credenciais -->
    <div class="border-t border-slate-200 dark:border-slate-700 pt-5">
      <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">Credenciais de acesso</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="user-username" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
            Usuário <span class="text-rose-500">*</span>
          </label>
          <input
            id="user-username"
            v-model="form.username"
            type="text"
            autocomplete="username"
            placeholder="mariana.souza"
            class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.username }"
          />
          <p v-if="errors.username" class="mt-1 text-xs text-rose-600">{{ errors.username }}</p>
        </div>

        <div>
          <label for="user-password" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
            Senha <span class="text-rose-500">*</span>
          </label>
          <div class="relative">
            <input
              id="user-password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Mínimo de 8 caracteres"
              class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-3 pr-10 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              :class="{ 'border-rose-500 focus:ring-rose-500 focus:border-rose-500': errors.password }"
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
          <p v-if="errors.password" class="mt-1 text-xs text-rose-600">{{ errors.password }}</p>
        </div>
      </div>
    </div>

    <!-- Papel na empresa -->
    <div>
      <span class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">
        Papel na empresa <span class="text-rose-500">*</span>
      </span>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label
          class="flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors"
          :class="form.role === 'USER'
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400'
            : 'border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700'"
        >
          <input v-model="form.role" type="radio" value="USER" class="mt-1 text-indigo-600 focus:ring-indigo-500" />
          <span>
            <span class="block font-medium text-slate-900 dark:text-white">Usuário</span>
            <span class="block text-xs text-slate-500 dark:text-slate-400">Acesso padrão às funcionalidades da empresa.</span>
          </span>
        </label>
        <label
          class="flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors"
          :class="form.role === 'ADMIN'
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400'
            : 'border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700'"
        >
          <input v-model="form.role" type="radio" value="ADMIN" class="mt-1 text-indigo-600 focus:ring-indigo-500" />
          <span>
            <span class="block font-medium text-slate-900 dark:text-white">Administrador</span>
            <span class="block text-xs text-slate-500 dark:text-slate-400">Pode gerenciar usuários e configurações da empresa.</span>
          </span>
        </label>
      </div>
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
        {{ loading ? 'Salvando...' : 'Cadastrar usuário' }}
      </button>
    </div>
  </form>
</template>
