<script setup lang="ts">
/**
 * Listagem de usuários internos da empresa (GET /customer-users/page).
 *
 * Inclui usuários ativos e inativos, ordenados alfabeticamente pelo backend.
 * Ações disponíveis para administradores:
 *  - Cadastrar novo usuário (link para /usuarios/new).
 *  - Desativar vínculo (PATCH /customer-users/{linkId}/deactivate).
 *  - Redefinir senha (PUT /customer-users/{linkId}/password) via modal.
 */
import { computed, onMounted, ref } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import ResetPasswordForm from '@/components/forms/ResetPasswordForm.vue'
import { useCustomerUsers } from '@/composables/useCustomerUsers'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/apiError'
import type {
  CustomerUserPage,
  CustomerUserPageItem,
  ResetCustomerUserPasswordRequest,
} from '@/types/CustomerUser'

definePageMeta({
  middleware: 'auth',
})

const auth = useAuthStore()
const toast = useToast()
const { listPage, deactivateUser, resetPassword } = useCustomerUsers()

const PAGE_SIZE = 20

const loading = ref(false)
const listError = ref<string | null>(null)
const data = ref<CustomerUserPage | null>(null)
const currentPage = ref(0)
const deactivatingIds = ref<Set<number>>(new Set())

const passwordTarget = ref<CustomerUserPageItem | null>(null)
const passwordLoading = ref(false)
const passwordError = ref<string | null>(null)

const items = computed<CustomerUserPageItem[]>(() => data.value?.items ?? [])
const totalItems = computed(() => data.value?.totalItems ?? 0)
const totalPages = computed(() => data.value?.totalPages ?? 0)
const hasPrev = computed(() => currentPage.value > 0)
const hasNext = computed(() => currentPage.value + 1 < totalPages.value)

const refresh = async (targetPage: number = currentPage.value) => {
  if (!auth.activeCompanyId) {
    listError.value = 'Selecione uma empresa para visualizar os usuários.'
    return
  }
  loading.value = true
  listError.value = null
  try {
    data.value = await listPage({ page: targetPage, size: PAGE_SIZE })
    currentPage.value = data.value.page
  } catch (err) {
    listError.value = extractApiError(err, 'Falha ao carregar usuários da empresa.')
  } finally {
    loading.value = false
  }
}

onMounted(() => refresh(0))

const goToPage = (next: number) => {
  if (next < 0 || (totalPages.value > 0 && next >= totalPages.value)) return
  refresh(next)
}

const handleDeactivate = async (item: CustomerUserPageItem) => {
  if (!item.active) return
  const confirmed = typeof window !== 'undefined'
    ? window.confirm(`Desativar o vínculo de "${item.name}" com a empresa?`)
    : true
  if (!confirmed) return

  deactivatingIds.value = new Set([...deactivatingIds.value, item.linkId])
  try {
    await deactivateUser(item.linkId)
    data.value = data.value
      ? {
          ...data.value,
          items: data.value.items.map((u) =>
            u.linkId === item.linkId ? { ...u, active: false } : u,
          ),
        }
      : data.value
    toast.success(`Usuário "${item.name}" desativado.`)
  } catch (err) {
    toast.error(extractApiError(err, 'Falha ao desativar usuário.'))
  } finally {
    const copy = new Set(deactivatingIds.value)
    copy.delete(item.linkId)
    deactivatingIds.value = copy
  }
}

const openPasswordModal = (item: CustomerUserPageItem) => {
  passwordError.value = null
  passwordTarget.value = item
}

const closePasswordModal = () => {
  if (passwordLoading.value) return
  passwordTarget.value = null
  passwordError.value = null
}

const handleResetPassword = async (payload: ResetCustomerUserPasswordRequest) => {
  if (!passwordTarget.value) return
  passwordLoading.value = true
  passwordError.value = null
  try {
    await resetPassword(passwordTarget.value.linkId, payload)
    toast.success(`Senha de "${passwordTarget.value.name}" redefinida.`)
    passwordTarget.value = null
  } catch (err) {
    passwordError.value = extractApiError(err, 'Falha ao redefinir senha.')
  } finally {
    passwordLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Usuários da empresa</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Gerencie os usuários internos de <span class="font-medium">{{ auth.activeCompany?.value ?? '—' }}</span>.
          Apenas administradores podem cadastrar, desativar ou redefinir senhas.
        </p>
      </div>
      <NuxtLink
        to="/usuarios/new"
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        Novo usuário
      </NuxtLink>
    </header>

    <div
      v-if="listError"
      class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300"
    >
      {{ listError }}
    </div>

    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
      <div v-if="loading" class="p-6 text-sm text-slate-500 dark:text-slate-400">Carregando...</div>
      <div
        v-else-if="!loading && items.length === 0 && !listError"
        class="p-8 text-center text-sm text-slate-500 dark:text-slate-400"
      >
        Nenhum usuário cadastrado para esta empresa.
      </div>

      <div v-else-if="items.length > 0" class="overflow-x-auto">
        <table class="w-full text-sm text-left text-slate-700 dark:text-slate-200">
          <thead class="text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 dark:bg-slate-900/50 dark:text-slate-400">
            <tr>
              <th scope="col" class="px-4 py-3">Nome</th>
              <th scope="col" class="px-4 py-3">Documento</th>
              <th scope="col" class="px-4 py-3">E-mail</th>
              <th scope="col" class="px-4 py-3">Papel</th>
              <th scope="col" class="px-4 py-3">Status</th>
              <th scope="col" class="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in items"
              :key="user.linkId"
              class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-700/30"
              :class="{ 'opacity-60': !user.active }"
            >
              <td class="px-4 py-3 font-medium text-slate-900 dark:text-white">{{ user.name }}</td>
              <td class="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{{ user.document }}</td>
              <td class="px-4 py-3 text-slate-600 dark:text-slate-300">{{ user.email ?? '—' }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="user.role === 'ADMIN'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'"
                >
                  {{ user.role === 'ADMIN' ? 'Administrador' : 'Usuário' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="user.active
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'"
                >
                  {{ user.active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    @click="openPasswordModal(user)"
                    class="px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded-md dark:text-indigo-300 dark:hover:bg-slate-700"
                  >
                    Redefinir senha
                  </button>
                  <button
                    v-if="user.active"
                    type="button"
                    :disabled="deactivatingIds.has(user.linkId)"
                    @click="handleDeactivate(user)"
                    class="px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md dark:text-rose-300 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    Desativar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="items.length > 0"
        class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400"
      >
        <span>{{ totalItems }} usuário(s) — página {{ currentPage + 1 }} de {{ Math.max(totalPages, 1) }}</span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            :disabled="!hasPrev || loading"
            @click="goToPage(currentPage - 1)"
            class="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:hover:bg-slate-700"
          >
            Anterior
          </button>
          <button
            type="button"
            :disabled="!hasNext || loading"
            @click="goToPage(currentPage + 1)"
            class="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:hover:bg-slate-700"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>

    <Modal
      :is-open="!!passwordTarget"
      :title="passwordTarget ? `Redefinir senha — ${passwordTarget.name}` : 'Redefinir senha'"
      @close="closePasswordModal"
    >
      <p class="text-sm text-slate-600 dark:text-slate-300 mb-4">
        A nova senha será aplicada imediatamente. Comunique o usuário pelo canal apropriado.
      </p>
      <ResetPasswordForm
        :loading="passwordLoading"
        :server-error="passwordError"
        @submit="handleResetPassword"
        @cancel="closePasswordModal"
      />
    </Modal>
  </div>
</template>
