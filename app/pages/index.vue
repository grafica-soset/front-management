<script setup lang="ts">
/**
 * Dashboard inicial. Atalhos para os principais cadastros do sistema.
 */
const cards = [
  {
    title: 'Usuários',
    description: 'Acessos ao sistema (administradores, gerentes, vendedores).',
    to: '/users',
    icon: 'lucide:users',
  },
  {
    title: 'Clientes',
    description: 'Cadastro de clientes (PF e PJ) com dados fiscais.',
    to: '/customers',
    icon: 'lucide:building-2',
  },
  {
    title: 'Máquinas',
    description: 'Equipamentos de produção e suas especificações técnicas.',
    to: '/machines',
    icon: 'lucide:printer',
  },
  {
    title: 'Papéis / Insumos',
    description: 'Catálogo de papéis utilizados na produção.',
    to: '/papers',
    icon: 'lucide:layers',
  },
  {
    title: 'Tipos de papel',
    description: 'Categorias usadas na composição dos SKUs de papel.',
    to: '/paper-types',
    icon: 'lucide:tags',
  },
]
</script>

<template>
  <section class="flex flex-col gap-6">
    <header>
      <h1 class="text-2xl font-semibold text-slate-800">Bem-vindo ao Soset</h1>
      <p class="text-sm text-slate-500">
        Sistema administrativo para a indústria gráfica.
      </p>
    </header>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <NuxtLink
        v-for="card in cards"
        :key="card.to"
        :to="card.to"
        class="card flex items-start gap-3 p-5 transition hover:border-brand-400 hover:shadow"
      >
        <span class="flex size-10 items-center justify-center rounded-md bg-brand-50 text-brand-700">
          <Icon :name="card.icon" class="size-5" />
        </span>
        <div>
          <h2 class="text-base font-semibold text-slate-800">{{ card.title }}</h2>
          <p class="text-sm text-slate-500">{{ card.description }}</p>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
