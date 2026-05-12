<script setup lang="ts">
import { ref, computed } from 'vue'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import Modal from '@/components/ui/Modal.vue'
import ProductForm from '@/components/forms/ProductForm.vue'

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
        <h1 class="text-2xl font-semibold text-gray-900 sm:text-3xl dark:text-white mt-2">Lista de Produtos</h1>
      </div>
      <div>
        <NuxtLink to="/sample/add" class="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 sm:w-auto dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
          <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"></path></svg>
          Adicionar Produto
        </NuxtLink>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 relative shadow-sm sm:rounded-lg border border-gray-200 dark:border-gray-700">
      <!-- Filtros e Busca -->
      <div class="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 p-4 border-b dark:border-gray-700">
        <div class="w-full md:w-1/2">
          <form class="flex items-center">
            <label for="simple-search" class="sr-only">Buscar</label>
            <div class="relative w-full">
              <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg aria-hidden="true" class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path></svg>
              </div>
              <input v-model="searchQuery" type="text" id="simple-search" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Buscar por nome ou marca..." required>
            </div>
          </form>
        </div>
        <div class="w-full md:w-auto flex flex-col md:flex-row space-y-2 md:space-y-0 items-stretch md:items-center justify-end md:space-x-3 flex-shrink-0">
          <div class="flex items-center space-x-3 w-full md:w-auto">
            <select v-model="statusFilter" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
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
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" class="px-4 py-3">Nome do Produto</th>
              <th scope="col" class="px-4 py-3">Categoria</th>
              <th scope="col" class="px-4 py-3">Marca</th>
              <th scope="col" class="px-4 py-3">Preço</th>
              <th scope="col" class="px-4 py-3">Status</th>
              <th scope="col" class="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in filteredProducts" :key="product.id" class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
              <th scope="row" class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white">{{ product.name }}</th>
              <td class="px-4 py-3">{{ product.category }}</td>
              <td class="px-4 py-3">{{ product.brand }}</td>
              <td class="px-4 py-3">{{ product.price }}</td>
              <td class="px-4 py-3">
                <span
                  class="text-xs font-medium mr-2 px-2.5 py-0.5 rounded"
                  :class="{
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300': product.status === 'Ativo',
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300': product.status === 'Inativo',
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300': product.status === 'Esgotado'
                  }"
                >
                  {{ product.status }}
                </span>
              </td>
              <td class="px-4 py-3 flex items-center justify-end space-x-2">
                <button @click="openEditModal(product)" type="button" class="text-blue-600 hover:text-blue-900 dark:text-blue-500 dark:hover:text-blue-400 font-medium">Editar</button>
                <button type="button" class="text-red-600 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400 font-medium">Excluir</button>
              </td>
            </tr>
            <tr v-if="filteredProducts.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                Nenhum produto encontrado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginação -->
      <nav class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4 border-t dark:border-gray-700" aria-label="Table navigation">
        <span class="text-sm font-normal text-gray-500 dark:text-gray-400">
          Exibindo <span class="font-semibold text-gray-900 dark:text-white">1-10</span> de <span class="font-semibold text-gray-900 dark:text-white">1000</span>
        </span>
        <ul class="inline-flex items-stretch -space-x-px">
          <li>
            <a href="#" class="flex items-center justify-center h-full py-1.5 px-3 ml-0 text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
              <span class="sr-only">Anterior</span>
              <svg class="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
            </a>
          </li>
          <li>
            <a href="#" class="flex items-center justify-center text-sm py-2 px-3 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">1</a>
          </li>
          <li>
            <a href="#" class="flex items-center justify-center text-sm py-2 px-3 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">2</a>
          </li>
          <li>
            <a href="#" aria-current="page" class="flex items-center justify-center text-sm z-10 py-2 px-3 leading-tight text-blue-600 bg-blue-50 border border-blue-300 hover:bg-blue-100 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white">3</a>
          </li>
          <li>
            <a href="#" class="flex items-center justify-center text-sm py-2 px-3 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">...</a>
          </li>
          <li>
            <a href="#" class="flex items-center justify-center text-sm py-2 px-3 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">100</a>
          </li>
          <li>
            <a href="#" class="flex items-center justify-center h-full py-1.5 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
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
