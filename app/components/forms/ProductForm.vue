<script setup lang="ts">
// Eventos emitidos pelo componente (para avisar o pai que deve fechar o modal, por exemplo)
const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'submit', data: any): void // Ajustar 'any' para o tipo correto depois
}>()

const handleSubmit = () => {
  // Lógica de submit
  emit('submit', {})
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <!-- Nome do Produto -->
      <div>
        <label for="product-name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nome do Produto <span class="text-red-500">*</span></label>
        <input type="text" id="product-name" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="Ex: Camiseta Básica" required>
      </div>

      <!-- Categoria -->
      <div>
        <label for="category" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Categoria</label>
        <select id="category" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
          <option selected>Selecione uma categoria</option>
          <option value="CL">Roupas</option>
          <option value="EL">Eletrônicos</option>
          <option value="AC">Acessórios</option>
          <option value="HO">Casa</option>
        </select>
      </div>

      <!-- Marca -->
      <div>
        <label for="brand" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marca <span class="text-red-500">*</span></label>
        <input type="text" id="brand" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="Ex: NuxtWear" required>
      </div>

      <!-- Preço -->
      <div>
        <label for="price" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Preço <span class="text-red-500">*</span></label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <span class="text-gray-500 dark:text-gray-400 sm:text-sm">R$</span>
          </div>
          <input type="number" id="price" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pl-9 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="99.00" required>
        </div>
      </div>

      <!-- Descrição -->
      <div class="sm:col-span-2">
        <label for="description" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Descrição</label>
        <textarea id="description" rows="4" class="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="Escreva a descrição do produto aqui..."></textarea>
      </div>

      <!-- Upload de Imagem -->
      <div class="sm:col-span-2">
        <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white" for="file_input">Imagem do Produto</label>
        <input class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400" aria-describedby="file_input_help" id="file_input" type="file">
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-300" id="file_input_help">PNG, JPG ou GIF (MAX. 800x400px).</p>
      </div>
    </div>

    <!-- Botões de Ação -->
    <div class="flex items-center space-x-4 mt-6">
      <button type="submit" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
        Salvar Produto
      </button>
      <button @click="handleCancel" type="button" class="text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">
        Cancelar
      </button>
    </div>
  </form>
</template>
