<script setup lang="ts">
import { ref, computed } from 'vue'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import Modal from '@/components/ui/Modal.vue'
import ProductForm from '@/components/forms/ProductForm.vue'

definePageMeta({
  middleware: 'auth',
})

const breadcrumbItems = [
  { name: 'Cadastros' },
  { name: 'Produtos' }
]

// Dados mocados para exemplo
const products = ref([
  { id: 1, name: 'Apple MacBook Pro 17"', category: 'Eletrônicos', brand: 'Apple', price: 'R$ 14.999', status: 'Ativo' },
  { id: 2, name: 'Microsoft Magic Mouse', category: 'Acessórios', brand: 'Microsoft', price: 'R$ 499', status: 'Ativo' },
  { id: 3, name: 'Apple Watch Series 7', category: 'Eletrônicos', brand: 'Apple', price: 'R$ 3.599', status: 'Inativo' },
  { id: 4, name: 'Camiseta Básica Preta', category: 'Roupas', brand: 'NuxtWear', price: 'R$ 89', status: 'Ativo' },
  { id: 5, name: 'Monitor Dell 27"', category: 'Eletrônicos', brand: 'Dell', price: 'R$ 2.100', status: 'Ativo' },
  { id: 6, name: 'Teclado Mecânico Keychron', category: 'Acessórios', brand: 'Keychron', price: 'R$ 750', status: 'Esgotado' },
])

const searchQuery = ref('')
const statusFilter = ref('')

const isEditModalOpen = ref(false)
const selectedProduct = ref(null)

const filteredProducts = computed(() => {
  return products.value.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          product.brand.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesStatus = statusFilter.value ? product.status === statusFilter.value : true
    return matchesSearch && matchesStatus
  })
})

const openEditModal = (product: any) => {
  selectedProduct.value = product
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
  selectedProduct.value = null
}

const handleFormSubmit = (data: any) => {
  // Lógica para salvar a edição do produto
  console.log('Produto editado:', data)
  closeEditModal()
}
</script>

<template>
  <div class="space-y-4">
    <!-- Cabeçalho da Página com Breadcrumb -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
      <div class="mb-4 md:mb-0">
        <Breadcrumb :items="breadcrumbItems" />
        <h1 class="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white mt-2">Lista de Produtos</h1>
      </div>
      <div>
        <NuxtLink to="/sample/add" class="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 sm:w-auto dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:focus:ring-indigo-800 transition-colors shadow-sm">
          <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"></path></svg>
          Adicionar Produto
        </NuxtLink>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-800 relative shadow-sm sm:rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <!-- Filtros e Busca -->
      <div class="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 p-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
        <div class="w-full md:w-1/2">
          <form class="flex items-center">
            <label for="simple-search" class="sr-only">Buscar</label>
            <div class="relative w-full">
              <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg aria-hidden="true" class="w-5 h-5 text-slate-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path></svg>
              </div>
              <input v-model="searchQuery" type="text" id="simple-search" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 p-2 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-indigo-500 dark:focus:border-indigo-500 transition-colors shadow-sm" placeholder="Buscar por nome ou marca..." required>
            </div>
          </form>
        </div>
        <div class="w-full md:w-auto flex flex-col md:flex-row space-y-2 md:space-y-0 items-stretch md:items-center justify-end md:space-x-3 flex-shrink-0">
          <div class="flex items-center space-x-3 w-full md:w-auto">
            <select v-model="statusFilter" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-indigo-500 dark:focus:border-indigo-500 transition-colors shadow-sm">
              <option value="">Todos os status</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
              <option value="Esgotado">Esgotado</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Tabela -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead class="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th scope="col" class="px-5 py-4 font-semibold">Nome do Produto</th>
              <th scope="col" class="px-5 py-4 font-semibold">Categoria</th>
              <th scope="col" class="px-5 py-4 font-semibold">Marca</th>
              <th scope="col" class="px-5 py-4 font-semibold">Preço</th>
              <th scope="col" class="px-5 py-4 font-semibold">Status</th>
              <th scope="col" class="px-5 py-4 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
            <tr v-for="product in filteredProducts" :key="product.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
              <th scope="row" class="px-5 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">{{ product.name }}</th>
              <td class="px-5 py-4 text-slate-600 dark:text-slate-300">{{ product.category }}</td>
              <td class="px-5 py-4 text-slate-600 dark:text-slate-300">{{ product.brand }}</td>
              <td class="px-5 py-4 font-medium text-slate-900 dark:text-slate-200">{{ product.price }}</td>
              <td class="px-5 py-4">
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  :class="{
                    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400': product.status === 'Ativo',
                    'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400': product.status === 'Inativo',
                    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400': product.status === 'Esgotado'
                  }"
                >
                  <span class="w-1.5 h-1.5 rounded-full mr-1.5"
                    :class="{
                      'bg-emerald-600 dark:bg-emerald-400': product.status === 'Ativo',
                      'bg-rose-600 dark:bg-rose-400': product.status === 'Inativo',
                      'bg-amber-600 dark:bg-amber-400': product.status === 'Esgotado'
                    }"
                  ></span>
                  {{ product.status }}
                </span>
              </td>
              <td class="px-5 py-4 flex items-center justify-end space-x-3">
                <button @click="openEditModal(product)" type="button" class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors">Editar</button>
                <button type="button" class="text-rose-600 hover:text-rose-900 dark:text-rose-500 dark:hover:text-rose-400 font-medium transition-colors">Excluir</button>
              </td>
            </tr>
            <tr v-if="filteredProducts.length === 0">
              <td colspan="6" class="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
                <div class="flex flex-col items-center justify-center">
                  <svg class="w-10 h-10 mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                  <p>Nenhum produto encontrado com os filtros atuais.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginação -->
      <nav class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/30" aria-label="Table navigation">
        <span class="text-sm font-normal text-slate-500 dark:text-slate-400">
          Exibindo <span class="font-semibold text-slate-900 dark:text-white">1-10</span> de <span class="font-semibold text-slate-900 dark:text-white">1000</span>
        </span>
        <ul class="inline-flex items-stretch -space-x-px">
          <li>
            <a href="#" class="flex items-center justify-center h-full py-1.5 px-3 ml-0 text-slate-500 bg-white rounded-l-lg border border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white transition-colors">
              <span class="sr-only">Anterior</span>
              <svg class="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
            </a>
          </li>
          <li>
            <a href="#" class="flex items-center justify-center text-sm py-2 px-3 leading-tight text-slate-500 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white transition-colors">1</a>
          </li>
          <li>
            <a href="#" class="flex items-center justify-center text-sm py-2 px-3 leading-tight text-slate-500 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white transition-colors">2</a>
          </li>
          <li>
            <a href="#" aria-current="page" class="flex items-center justify-center text-sm z-10 py-2 px-3 leading-tight text-indigo-600 bg-indigo-50 border border-indigo-300 hover:bg-indigo-100 hover:text-indigo-700 dark:border-slate-600 dark:bg-slate-700 dark:text-white transition-colors">3</a>
          </li>
          <li>
            <a href="#" class="flex items-center justify-center text-sm py-2 px-3 leading-tight text-slate-500 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white transition-colors">...</a>
          </li>
          <li>
            <a href="#" class="flex items-center justify-center text-sm py-2 px-3 leading-tight text-slate-500 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white transition-colors">100</a>
          </li>
          <li>
            <a href="#" class="flex items-center justify-center h-full py-1.5 px-3 leading-tight text-slate-500 bg-white rounded-r-lg border border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white transition-colors">
              <span class="sr-only">Próximo</span>
              <svg class="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
            </a>
          </li>
        </ul>
      </nav>
    </div>

    <!-- Modal de Edição -->
    <Modal
      :isOpen="isEditModalOpen"
      title="Editar Produto"
      @close="closeEditModal"
    >
      <ProductForm
        @cancel="closeEditModal"
        @submit="handleFormSubmit"
      />
    </Modal>
  </div>
</template>
