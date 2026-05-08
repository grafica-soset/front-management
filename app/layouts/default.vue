<script setup lang="ts">
/**
 * Layout administrativo padrão. Combina sidebar retrátil + topbar + slot
 * principal. Mobile-first: a sidebar começa fechada em telas pequenas e
 * fixa em md+.
 */

const sidebarOpen = ref(false)

const route = useRoute()
watch(() => route.fullPath, () => {
  sidebarOpen.value = false
})
</script>

<template>
  <div class="flex min-h-screen bg-slate-50">
    <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <div class="flex min-h-screen flex-1 flex-col md:pl-64">
      <AppTopbar
        :sidebar-open="sidebarOpen"
        @toggle-sidebar="sidebarOpen = !sidebarOpen"
      />
      <main class="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <slot />
      </main>
    </div>
  </div>
</template>
