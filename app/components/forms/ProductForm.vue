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
        <label for="product-name" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Nome do Produto <span class="text-rose-500">*</span></label>
        <input type="text" id="product-name" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white shadow-sm transition-colors" placeholder="Ex: Camiseta Básica" required>
      </div>

      <!-- Categoria -->
      <div>
        <label for="category" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Categoria</label>
        <select id="category" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white shadow-sm transition-colors">
          <option selected>Selecione uma categoria</option>
          <option value="CL">Roupas</option>
          <option value="EL">Eletrônicos</option>
          <option value="AC">Acessórios</option>
          <option value="HO">Casa</option>
        </select>
      </div>

      <!-- Marca -->
      <div>
        <label for="brand" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Marca <span class="text-rose-500">*</span></label>
        <input type="text" id="brand" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white shadow-sm transition-colors" placeholder="Ex: NuxtWear" required>
      </div>

      <!-- Preço -->
      <div>
        <label for="price" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Preço <span class="text-rose-500">*</span></label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <span class="text-slate-500 dark:text-slate-400 sm:text-sm">R$</span>
          </div>
          <input type="number" id="price" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 pl-9 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white shadow-sm transition-colors" placeholder="99.00" required>
        </div>
      </div>

      <!-- Descrição -->
      <div class="sm:col-span-2">
        <label for="description" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Descrição</label>
        <textarea id="description" rows="4" class="block p-2.5 w-full text-sm text-slate-900 bg-white rounded-lg border border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white shadow-sm transition-colors" placeholder="Escreva a descrição do produto aqui..."></textarea>
      </div>

      <!-- Upload de Imagem -->
      <div class="sm:col-span-2">
        <label class="block mb-2 text-sm font-medium text-slate-900 dark:text-white" for="file_input">Imagem do Produto</label>
        <input class="block w-full text-sm text-slate-900 border border-slate-300 rounded-lg cursor-pointer bg-slate-50 dark:text-slate-400 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-slate-600 dark:file:text-indigo-400" aria-describedby="file_input_help" id="file_input" type="file">
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400" id="file_input_help">PNG, JPG ou GIF (MAX. 800x400px).</p>
      </div>
    </div>

    <!-- Botões de Ação -->
    <div class="flex items-center space-x-4 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
      <button type="submit" class="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:focus:ring-indigo-800 transition-colors shadow-sm">
        Salvar Produto
      </button>
      <button @click="handleCancel" type="button" class="text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 focus:ring-4 focus:ring-slate-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-slate-800 dark:text-white dark:border-slate-600 dark:hover:bg-slate-700 dark:hover:border-slate-500 dark:focus:ring-slate-700 transition-colors shadow-sm">
        Cancelar
      </button>
    </div>
  </form>
</template>
