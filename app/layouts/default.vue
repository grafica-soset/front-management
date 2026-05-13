<script setup lang="ts">
import useMenu from '@/composables/useMenu'
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/composables/useAuth'
import CompanySwitcher from '@/components/CompanySwitcher.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'

const isSidebarOpen = ref(false)
const isUserMenuOpen = ref(false)

// Puxa as definições do composable
const { navigation, toggleSubMenu } = useMenu()

// Sessão do usuário autenticado (nome no topbar + logout).
const auth = useAuthStore()
const { logout } = useAuth()

const userName = computed(() => auth.user?.name ?? 'Usuário')
const userInitials = computed(() => {
  const parts = (auth.user?.name ?? '').trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
})

const handleLogout = async () => {
  logout()
  isUserMenuOpen.value = false
  await navigateTo('/auth/login')
}

// Fecha a sidebar em telas menores ao mudar de rota
const route = useRoute()
watch(() => route.path, () => {
  isSidebarOpen.value = false
})

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

// Fecha o menu do usuário ao clicar fora
const closeUserMenu = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.user-menu-container')) {
    isUserMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeUserMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeUserMenu)
})
</script>

<template>
  <div class="antialiased bg-slate-50 dark:bg-slate-900 min-h-screen">
    <!-- Navbar -->
    <nav class="bg-indigo-600 border-b border-indigo-700 px-4 py-2.5 dark:bg-indigo-900 dark:border-indigo-800 fixed left-0 right-0 top-0 z-50 shadow-md">
      <div class="flex flex-wrap justify-between items-center">
        <div class="flex justify-start items-center">
          <button @click="toggleSidebar" class="p-2 mr-2 text-indigo-100 rounded-lg cursor-pointer md:hidden hover:text-white hover:bg-indigo-500 focus:bg-indigo-500 dark:focus:bg-indigo-700 focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600 dark:text-indigo-200 dark:hover:bg-indigo-700">
            <svg aria-hidden="true" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>
            <span class="sr-only">Abrir menu lateral</span>
          </button>
          <NuxtLink to="/" class="flex items-center justify-between mr-4">
            <span class="self-center text-xl font-bold whitespace-nowrap text-white">GraphicOS</span>
          </NuxtLink>
        </div>

        <!-- Menu do Usuário -->
        <div class="flex items-center gap-2 lg:order-2 user-menu-container">
          <!-- Seletor de Empresa (tenant) -->
          <CompanySwitcher v-if="auth.isAuthenticated" class="hidden sm:block" />

          <div class="relative">
            <button @click="toggleUserMenu" type="button" class="flex items-center justify-center mx-3 w-8 h-8 text-sm font-semibold text-white bg-indigo-800 rounded-full md:mr-0 focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-600 ring-2 ring-indigo-400">
              <span class="sr-only">Abrir menu do usuário</span>
              {{ userInitials }}
            </button>

            <!-- Dropdown -->
            <transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <div v-show="isUserMenuOpen" class="absolute right-0 mt-2 z-50 w-56 text-base list-none bg-white rounded divide-y divide-slate-100 shadow-xl dark:bg-slate-800 dark:divide-slate-700 ring-1 ring-slate-900/5">
                <div class="py-3 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-t">
                  <span class="block text-sm font-semibold text-slate-900 dark:text-white">{{ userName }}</span>
                  <span class="block text-xs font-light text-slate-500 truncate dark:text-slate-400">ID #{{ auth.user?.personId ?? '—' }}</span>
                </div>
                <ul class="py-1 font-medium text-slate-700 dark:text-slate-300">
                  <li>
                    <NuxtLink to="#" class="block py-2 px-4 text-sm hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 dark:hover:text-indigo-400 transition-colors">Meu Perfil</NuxtLink>
                  </li>
                  <li>
                    <NuxtLink to="#" class="block py-2 px-4 text-sm hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 dark:hover:text-indigo-400 transition-colors">Configurações da Conta</NuxtLink>
                  </li>
                </ul>
                <ul class="py-1 font-medium text-slate-700 dark:text-slate-300">
                  <li>
                    <button @click="handleLogout" type="button" class="block w-full text-left py-2 px-4 text-sm hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-700 dark:hover:text-red-400 transition-colors">Sair</button>
                  </li>
                </ul>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </nav>

    <!-- Sidebar -->
    <aside
      :class="[isSidebarOpen ? 'translate-x-0' : '-translate-x-full']"
      class="fixed top-0 left-0 z-40 w-64 h-screen pt-16 transition-transform bg-white border-r border-slate-200 md:translate-x-0 dark:bg-slate-800 dark:border-slate-700 shadow-sm"
      aria-label="Menu Lateral"
    >
      <div class="overflow-y-auto py-5 px-3 h-full bg-white dark:bg-slate-800">
        <ul class="space-y-1.5">
          <li v-for="item in navigation" :key="item.name">
            <template v-if="!item.children">
              <NuxtLink :to="item.href || '#'" class="flex items-center p-2.5 text-base font-medium text-slate-700 rounded-lg dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-slate-700 dark:hover:text-white group transition-colors">
                <!-- Ícones Dinâmicos -->
                <svg v-if="item.icon === 'dashboard'" class="w-5 h-5 text-slate-400 transition duration-75 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"></path><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"></path></svg>
                <svg v-else-if="item.icon === 'users'" class="w-5 h-5 text-slate-400 transition duration-75 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg>
                <svg v-else-if="item.icon === 'settings'" class="w-5 h-5 text-slate-400 transition duration-75 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path></svg>

                <span class="ml-3">{{ item.name }}</span>
              </NuxtLink>
            </template>
            <template v-else>
              <button @click="toggleSubMenu(item)" type="button" class="flex items-center p-2.5 w-full text-base font-medium text-slate-700 rounded-lg transition-colors duration-75 group hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white">
                <svg v-if="item.icon === 'cadastros'" class="w-5 h-5 text-slate-400 transition duration-75 group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd"></path></svg>
                <svg v-else-if="item.icon === 'papers'" class="w-5 h-5 text-slate-400 transition duration-75 group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 4h-2v9a2 2 0 002 2h.5a1.5 1.5 0 001.5-1.5V9a2 2 0 00-2-2z"/></svg>
                <svg v-else-if="item.icon === 'settings'" class="w-5 h-5 text-slate-400 transition duration-75 group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path></svg>

                <span class="flex-1 ml-3 text-left whitespace-nowrap">{{ item.name }}</span>
                <svg class="w-5 h-5 transition-transform text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-white" :class="[item.expanded ? 'rotate-180' : '']" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
              </button>
              <!-- Submenu transition -->
              <ul class="py-2 space-y-1" v-show="item.expanded">
                <li v-for="subItem in item.children" :key="subItem.name">
                  <NuxtLink :to="subItem.href" class="flex items-center py-2 px-4 pl-11 w-full text-sm font-medium text-slate-600 rounded-lg transition-colors duration-75 group hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white">
                    <span class="w-1.5 h-1.5 mr-3 bg-slate-300 rounded-full group-hover:bg-indigo-500 dark:bg-slate-600 dark:group-hover:bg-indigo-400"></span>
                    {{ subItem.name }}
                  </NuxtLink>
                </li>
              </ul>
            </template>
          </li>
        </ul>
      </div>
    </aside>

    <!-- Overlay no Mobile -->
    <div v-show="isSidebarOpen" @click="toggleSidebar" class="bg-slate-900/50 backdrop-blur-sm dark:bg-slate-900/80 fixed inset-0 z-30 md:hidden transition-opacity"></div>

    <!-- Conteúdo Principal -->
    <main class="p-4 md:ml-64 h-auto pt-20">
      <slot />
    </main>

    <!-- Notificações globais -->
    <ToastContainer />
  </div>
</template>
