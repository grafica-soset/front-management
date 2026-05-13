<script setup lang="ts">
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import ProductForm from '@/components/forms/ProductForm.vue'
import { useRouter } from 'vue-router'

definePageMeta({
  middleware: 'auth',
})

const router = useRouter()

const breadcrumbItems = [
  { name: 'Cadastros' }, // Pode ter href se existir uma página listando os cadastros
  { name: 'Produtos', href: '/sample' },
  { name: 'Adicionar Produto' }
]

const handleFormCancel = () => {
  // Ao cancelar na página dedicada, pode voltar para a listagem
  router.push('/sample')
}

const handleFormSubmit = (data: any) => {
  // Lógica para salvar os dados...
  console.log('Dados submetidos:', data)
  router.push('/sample')
}
</script>

<template>
  <div class="space-y-4">
    <!-- Cabeçalho da Página com Breadcrumb -->
    <div class="flex flex-col mb-6">
      <Breadcrumb :items="breadcrumbItems" />
      <h1 class="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white mt-2">Adicionar Novo Produto</h1>
      <p class="mt-1 text-sm font-normal text-slate-500 dark:text-slate-400">
        Preencha os campos abaixo para cadastrar um novo produto no catálogo. Campos com <span class="text-rose-500 font-medium">*</span> são obrigatórios.
      </p>
    </div>

    <!-- Formulário -->
    <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 dark:bg-slate-800 dark:border-slate-700">
      <ProductForm
        @cancel="handleFormCancel"
        @submit="handleFormSubmit"
      />
    </div>
  </div>
</template>

<style scoped>
/* Estilos específicos para esta página, se necessário */
</style>
