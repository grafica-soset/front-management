<script setup lang="ts">
import { useSessionStore } from '~/stores/session'

interface Props {
  sidebarOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'toggle-sidebar': []
}>()

const session = useSessionStore()
const router = useRouter()

const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

const handleLogout = () => {
  session.logout()
  userMenuOpen.value = false
  router.push('/')
}

const handleClickOutside = (event: MouseEvent) => {
  if (!userMenuRef.value) return
  if (!userMenuRef.value.contains(event.target as Node)) {
    userMenuOpen.value = false
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('click', handleClickOutside)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('click', handleClickOutside)
  }
})
</script>

<template>
  <header class="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
    <button
      type="button"
      class="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 md:hidden"
      :aria-label="sidebarOpen ? 'Fechar menu' : 'Abrir menu'"
      @click="emit('toggle-sidebar')"
    >
      <Icon :name="sidebarOpen ? 'lucide:x' : 'lucide:menu'" class="size-5" />
    </button>

    <div class="flex flex-1 items-center px-2">
      <h1 class="text-sm font-medium text-slate-600 md:hidden">Soset</h1>
    </div>

    <div ref="userMenuRef" class="relative">
      <button
        type="button"
        class="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-700 transition hover:bg-slate-100"
        @click.stop="userMenuOpen = !userMenuOpen"
      >
        <span class="flex size-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <Icon name="lucide:user" class="size-4" />
        </span>
        <span class="hidden text-left sm:block">
          <span class="block leading-tight font-medium text-slate-800">
            {{ session.displayName }}
          </span>
          <span v-if="session.user?.role" class="block text-xs text-slate-500">
            {{ session.user.role }}
          </span>
        </span>
        <Icon name="lucide:chevron-down" class="size-4 text-slate-400" />
      </button>

      <Transition
        enter-active-class="transition duration-150"
        enter-from-class="-translate-y-1 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-100"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="-translate-y-1 opacity-0"
      >
        <div
          v-if="userMenuOpen"
          class="card absolute right-0 z-20 mt-2 w-48 overflow-hidden p-1"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            @click="handleLogout"
          >
            <Icon name="lucide:log-out" class="size-4" />
            Sair
          </button>
        </div>
      </Transition>
    </div>
  </header>
</template>
