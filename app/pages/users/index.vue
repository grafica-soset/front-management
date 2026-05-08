<script setup lang="ts">
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserResponse,
} from '~/types/user'
import type { PageResponse } from '~/types/page'

const usersApi = useUsers()

const page = ref(0)
const size = ref(20)
const nameFilter = ref('')
const debouncedFilter = ref('')

const data = ref<PageResponse<UserResponse> | null>(null)
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const showForm = ref(false)
const editing = ref<UserResponse | null>(null)
const saving = ref(false)

let filterTimer: ReturnType<typeof setTimeout> | null = null
watch(nameFilter, (value) => {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    debouncedFilter.value = value.trim()
    page.value = 0
  }, 350)
})

const fetchUsers = async () => {
  loading.value = true
  errorMessage.value = null
  try {
    data.value = await usersApi.list({
      page: page.value,
      size: size.value,
      nameFilter: debouncedFilter.value || undefined,
    })
  } catch (err) {
    errorMessage.value = 'Não foi possível carregar a lista de usuários.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

watch([page, size, debouncedFilter], fetchUsers, { immediate: true })

const totalPages = computed(() => data.value?.totalPages ?? 0)

const goToPage = (target: number) => {
  if (target < 0 || target >= totalPages.value) return
  page.value = target
}

const openCreate = () => {
  editing.value = null
  showForm.value = true
}

const openEdit = (user: UserResponse) => {
  editing.value = user
  showForm.value = true
}

const closeForm = () => {
  showForm.value = false
  editing.value = null
}

const handleSubmit = async (payload: CreateUserRequest | UpdateUserRequest) => {
  saving.value = true
  errorMessage.value = null
  try {
    if (editing.value?.id) {
      await usersApi.update(editing.value.id, payload as UpdateUserRequest)
    } else {
      await usersApi.create(payload as CreateUserRequest)
    }
    closeForm()
    await fetchUsers()
  } catch (err) {
    errorMessage.value = 'Falha ao salvar usuário.'
    console.error(err)
  } finally {
    saving.value = false
  }
}

const handleDelete = async (user: UserResponse) => {
  if (!confirm(`Excluir o usuário "${user.username}"?`)) return
  try {
    await usersApi.remove(user.id)
    await fetchUsers()
  } catch (err) {
    errorMessage.value = 'Falha ao excluir usuário.'
    console.error(err)
  }
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-800">Usuários</h1>
        <p class="text-sm text-slate-500">Gerencie acessos do sistema.</p>
      </div>
      <BaseButton @click="openCreate">
        <Icon name="lucide:plus" class="size-4" />
        Novo usuário
      </BaseButton>
    </header>

    <div class="card p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-xs">
          <Icon
            name="lucide:search"
            class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
          <input
            v-model="nameFilter"
            type="text"
            placeholder="Filtrar por nome..."
            class="input-base pl-9"
          />
        </div>
        <div class="text-xs text-slate-500">
          <span v-if="data">
            {{ data.totalElements }} registro(s)
          </span>
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3">Nome</th>
              <th class="px-4 py-3">Usuário</th>
              <th class="px-4 py-3">E-mail</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr v-if="loading">
              <td colspan="5" class="px-4 py-10 text-center text-slate-500">
                <Icon name="lucide:loader-2" class="mr-2 inline size-4 animate-spin" />
                Carregando...
              </td>
            </tr>
            <tr v-else-if="!data || data.content.length === 0">
              <td colspan="5" class="px-4 py-10 text-center text-slate-400">
                Nenhum usuário encontrado.
              </td>
            </tr>
            <tr v-for="user in data?.content ?? []" v-else :key="user.id" class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium text-slate-800">{{ user.person?.name }}</td>
              <td class="px-4 py-3 text-slate-600">{{ user.username }}</td>
              <td class="px-4 py-3 text-slate-600">{{ user.person?.email ?? '—' }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="user.active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'"
                >
                  <span
                    class="size-1.5 rounded-full"
                    :class="user.active ? 'bg-emerald-500' : 'bg-slate-400'"
                  />
                  {{ user.active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <button
                    class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                    title="Editar"
                    @click="openEdit(user)"
                  >
                    <Icon name="lucide:pencil" class="size-4" />
                  </button>
                  <button
                    class="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    title="Excluir"
                    @click="handleDelete(user)"
                  >
                    <Icon name="lucide:trash-2" class="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="data && totalPages > 1"
        class="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm"
      >
        <div class="text-slate-500">
          Página {{ page + 1 }} de {{ totalPages }}
        </div>
        <div class="flex items-center gap-1">
          <button
            class="btn-secondary"
            :disabled="page === 0"
            @click="goToPage(page - 1)"
          >
            <Icon name="lucide:chevron-left" class="size-4" />
            Anterior
          </button>
          <button
            class="btn-secondary"
            :disabled="page + 1 >= totalPages"
            @click="goToPage(page + 1)"
          >
            Próximo
            <Icon name="lucide:chevron-right" class="size-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal simples de formulário -->
    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      @click.self="closeForm"
    >
      <div class="card w-full max-w-2xl">
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 class="text-base font-semibold text-slate-800">
            {{ editing ? 'Editar usuário' : 'Novo usuário' }}
          </h2>
          <button
            class="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            @click="closeForm"
          >
            <Icon name="lucide:x" class="size-4" />
          </button>
        </div>
        <div class="p-5">
          <UserForm
            :initial-value="editing"
            :loading="saving"
            @submit="handleSubmit"
            @cancel="closeForm"
          />
        </div>
      </div>
    </div>
  </section>
</template>
