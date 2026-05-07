<script setup lang="ts">
interface MetricCard {
  label: string
  icon: string
  accent: string
}

const cards: MetricCard[] = [
  { label: 'Total de Ordens', icon: 'lucide:clipboard-list', accent: 'bg-brand-50 text-brand-600' },
  { label: 'Total de Clientes', icon: 'lucide:contact', accent: 'bg-emerald-50 text-emerald-600' },
  { label: 'Orçamentos abertos', icon: 'lucide:file-text', accent: 'bg-amber-50 text-amber-600' },
  { label: 'Em produção', icon: 'lucide:factory', accent: 'bg-violet-50 text-violet-600' },
]

const authStore = useAuthStore()
</script>

<template>
  <section class="flex flex-col gap-6">
    <header>
      <h1 class="text-2xl font-semibold text-slate-800">
        Bem-vindo, {{ authStore.displayName }}
      </h1>
      <p class="text-sm text-slate-500">
        Visão geral do sistema. Os indicadores serão preenchidos conforme os módulos forem integrados.
      </p>
    </header>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="card in cards"
        :key="card.label"
        class="card flex items-center justify-between p-5"
      >
        <div>
          <div class="text-sm text-slate-500">{{ card.label }}</div>
          <div class="mt-1 text-3xl font-semibold text-slate-800">—</div>
        </div>
        <div :class="['flex size-12 items-center justify-center rounded-lg', card.accent]">
          <Icon :name="card.icon" class="size-6" />
        </div>
      </div>
    </div>

    <div class="card p-6">
      <h2 class="text-base font-semibold text-slate-800">Próximos passos</h2>
      <ul class="mt-3 list-disc pl-5 text-sm text-slate-600">
        <li>Integrar autenticação real com o backend Quarkus.</li>
        <li>Construir os módulos de Clientes, Ordens de Serviço e Orçamentos.</li>
        <li>Adicionar relatórios e gráficos no dashboard.</li>
      </ul>
    </div>
  </section>
</template>
