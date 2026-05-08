<script setup lang="ts">
interface MenuChild {
  label: string
  to: string
  icon?: string
}

interface MenuItem {
  label: string
  icon: string
  to?: string
  children?: MenuChild[]
}

const authStore = useAuthStore()
const router = useRouter()

const sidebarOpen = ref(true)
const expandedGroups = reactive<Record<string, boolean>>({})

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const toggleGroup = (label: string) => {
  expandedGroups[label] = !expandedGroups[label]
}

// Apenas as rotas já implementadas estão habilitadas; novas serão adicionadas
// conforme cada módulo for entregue (Clientes, Ordens, Orçamentos, etc.).
const menu: MenuItem[] = [
  { label: 'Dashboard', icon: 'lucide:layout-dashboard', to: '/' },
  {
    label: 'Cadastros',
    icon: 'lucide:folder-cog',
    children: [
      { label: 'Usuários', to: '/users', icon: 'lucide:users' },
    ],
  },
]

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex h-full overflow-hidden bg-slate-100">
    <!-- Sidebar -->
    <aside
      class="flex h-full flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out"
      :class="sidebarOpen ? 'w-64' : 'w-16'"
    >
      <div class="flex h-14 items-center justify-between border-b border-slate-200 px-3">
        <div class="flex items-center gap-2 overflow-hidden">
          <div class="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-600 text-white">
            <Icon name="lucide:layers" class="size-4" />
          </div>
          <span
            v-if="sidebarOpen"
            class="whitespace-nowrap text-sm font-semibold text-slate-800"
          >Soset</span>
        </div>
        <button
          class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          @click="toggleSidebar"
        >
          <Icon
            :name="sidebarOpen ? 'lucide:panel-left-close' : 'lucide:panel-left-open'"
            class="size-4"
          />
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto px-2 py-3">
        <ul class="flex flex-col gap-1">
          <li v-for="item in menu" :key="item.label">
            <NuxtLink
              v-if="item.to"
              :to="item.to"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              active-class="bg-brand-50 text-brand-700 font-medium"
            >
              <Icon :name="item.icon" class="size-4 shrink-0" />
              <span v-if="sidebarOpen">{{ item.label }}</span>
            </NuxtLink>

            <template v-else-if="item.children">
              <button
                class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                @click="toggleGroup(item.label)"
              >
                <Icon :name="item.icon" class="size-4 shrink-0" />
                <span v-if="sidebarOpen" class="flex-1 text-left">{{ item.label }}</span>
                <Icon
                  v-if="sidebarOpen"
                  name="lucide:chevron-down"
                  class="size-4 shrink-0 transition-transform"
                  :class="{ 'rotate-180': expandedGroups[item.label] }"
                />
              </button>
              <ul
                v-show="sidebarOpen && expandedGroups[item.label]"
                class="ml-4 mt-1 flex flex-col gap-1 border-l border-slate-200 pl-2"
              >
                <li v-for="child in item.children" :key="child.to">
                  <NuxtLink
                    :to="child.to"
                    class="flex items-center gap-3 rounded-md px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    active-class="bg-brand-50 text-brand-700 font-medium"
                  >
                    <Icon v-if="child.icon" :name="child.icon" class="size-4 shrink-0" />
                    <span>{{ child.label }}</span>
                  </NuxtLink>
                </li>
              </ul>
            </template>
          </li>
        </ul>
      </nav>
    </aside>

    <!-- Main column -->
    <div class="flex h-full flex-1 flex-col overflow-hidden">
      <!-- Topbar -->
      <header class="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div class="text-sm font-medium text-slate-500">
          Painel administrativo
        </div>
        <div class="flex items-center gap-3">
          <div class="hidden text-right sm:block">
            <div class="text-sm font-medium text-slate-700">
              {{ authStore.displayName }}
            </div>
            <div class="text-xs text-slate-400">
              {{ authStore.user?.username ?? 'visitante' }}
            </div>
          </div>
          <div class="flex size-9 items-center justify-center rounded-full bg-slate-200 text-slate-600">
            <Icon name="lucide:user" class="size-4" />
          </div>
          <button
            class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            @click="handleLogout"
          >
            <Icon name="lucide:log-out" class="size-4" />
            <span class="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 overflow-y-auto p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
