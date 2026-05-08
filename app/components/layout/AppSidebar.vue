<script setup lang="ts">
/**
 * Sidebar retrátil com suporte a menus de 2 níveis.
 * - Em telas md+ ela fica fixa à esquerda; em mobile aparece como drawer.
 * - Pais com filhos abrem/fecham por clique. O grupo abre automaticamente
 *   quando a rota ativa pertence a um dos filhos.
 */

interface NavChild {
  label: string
  to: string
  icon?: string
}

interface NavItem {
  label: string
  icon?: string
  to?: string
  children?: NavChild[]
}

interface Props {
  open: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()

const nav: NavItem[] = [
  { label: 'Dashboard', icon: 'lucide:layout-dashboard', to: '/' },
  {
    label: 'Cadastros',
    icon: 'lucide:database',
    children: [
      { label: 'Usuários', to: '/users', icon: 'lucide:users' },
      { label: 'Clientes', to: '/customers', icon: 'lucide:building-2' },
      { label: 'Máquinas', to: '/machines', icon: 'lucide:printer' },
      { label: 'Papéis / Insumos', to: '/papers', icon: 'lucide:layers' },
      { label: 'Tipos de papel', to: '/paper-types', icon: 'lucide:tags' },
    ],
  },
]

const expanded = reactive<Record<string, boolean>>({})

const isChildActive = (children: NavChild[] | undefined) =>
  Boolean(children?.some((child) => route.path.startsWith(child.to)))

const isItemActive = (to: string) =>
  to === '/' ? route.path === '/' : route.path.startsWith(to)

const toggle = (label: string) => {
  expanded[label] = !expanded[label]
}

const isExpanded = (item: NavItem) =>
  expanded[item.label] ?? isChildActive(item.children)

const handleNavigate = () => emit('close')
</script>

<template>
  <!-- Backdrop (apenas mobile) -->
  <div
    v-if="open"
    class="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
    @click="emit('close')"
  />

  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:translate-x-0"
    :class="open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
  >
    <div class="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
      <div class="flex size-8 items-center justify-center rounded-md bg-brand-600 text-white">
        <Icon name="lucide:printer" class="size-4" />
      </div>
      <span class="text-base font-semibold text-slate-800">Soset</span>
    </div>

    <nav class="flex-1 overflow-y-auto px-2 py-3 text-sm">
      <ul class="space-y-1">
        <li v-for="item in nav" :key="item.label">
          <NuxtLink
            v-if="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-slate-700 transition hover:bg-slate-100"
            :class="isItemActive(item.to) && 'bg-brand-50 text-brand-700'"
            @click="handleNavigate"
          >
            <Icon v-if="item.icon" :name="item.icon" class="size-4" />
            {{ item.label }}
          </NuxtLink>

          <div v-else>
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-md px-3 py-2 text-slate-700 transition hover:bg-slate-100"
              :class="isChildActive(item.children) && 'text-brand-700'"
              @click="toggle(item.label)"
            >
              <span class="flex items-center gap-3">
                <Icon v-if="item.icon" :name="item.icon" class="size-4" />
                {{ item.label }}
              </span>
              <Icon
                name="lucide:chevron-down"
                class="size-4 transition-transform"
                :class="isExpanded(item) && 'rotate-180'"
              />
            </button>
            <ul
              v-show="isExpanded(item)"
              class="mt-1 space-y-1 border-l border-slate-200 pl-3"
            >
              <li v-for="child in item.children" :key="child.to">
                <NuxtLink
                  :to="child.to"
                  class="flex items-center gap-3 rounded-md px-3 py-2 text-slate-600 transition hover:bg-slate-100"
                  :class="isItemActive(child.to) && 'bg-brand-50 font-medium text-brand-700'"
                  @click="handleNavigate"
                >
                  <Icon v-if="child.icon" :name="child.icon" class="size-4" />
                  {{ child.label }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </li>
      </ul>
    </nav>

    <div class="border-t border-slate-200 p-3 text-xs text-slate-400">
      Soset · Indústria gráfica
    </div>
  </aside>
</template>
