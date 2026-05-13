<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

definePageMeta({
  layout: 'empty'
})

const router = useRouter()

// Controla o passo atual (1 = Dados do Usuário, 2 = Dados da Empresa, 3 = Termos)
const currentStep = ref(1)

// Dados consolidados do formulário
const formData = ref({
  // Step 1: Usuário
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  // Step 2: Empresa
  companyName: '',
  cnpj: '',
  companyPhone: '',
  // Step 3: Aceite
  terms: false
})

const nextStep = () => {
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const handleRegister = () => {
  // Lógica de registro final
  console.log('Registro submetido:', formData.value)
  // Simula sucesso e redireciona (ou mostra mensagem)
  router.push('/login')
}
</script>

<template>
  <div class="w-full max-w-lg bg-white rounded-2xl shadow-xl dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-8 sm:p-10">
    <!-- Header Logo -->
    <div class="flex items-center justify-center mb-6">
      <div class="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
      </div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white ml-3">
        Admin App
      </h1>
    </div>

    <!-- Título Principal -->
    <div class="text-center mb-8">
      <h2 class="text-xl font-bold text-slate-900 dark:text-white">Criar nova conta</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Junte-se a nós e comece a gerenciar seu negócio hoje mesmo.</p>
    </div>

    <!-- Stepper Visual -->
    <ol class="flex items-center w-full mb-8 text-sm font-medium text-center text-slate-500 dark:text-slate-400 sm:text-base">
      <li class="flex md:w-full items-center text-indigo-600 dark:text-indigo-500 sm:after:content-[''] after:w-full after:h-1 after:border-b after:border-slate-200 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10 dark:after:border-slate-700"
          :class="{'after:border-indigo-600 dark:after:border-indigo-500': currentStep > 1}">
        <span class="flex items-center after:content-['/'] sm:after:hidden after:mx-2 after:text-slate-200 dark:after:text-slate-500">
          <svg v-if="currentStep > 1" class="w-4 h-4 mr-2 sm:w-5 sm:h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
          </svg>
          <span v-else class="mr-2 w-5 h-5 flex justify-center items-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold ring-2 ring-indigo-600 dark:bg-indigo-900 dark:text-indigo-400">1</span>
          Usuário
        </span>
      </li>
      <li class="flex md:w-full items-center sm:after:content-[''] after:w-full after:h-1 after:border-b after:border-slate-200 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10 dark:after:border-slate-700"
          :class="[
            currentStep >= 2 ? 'text-indigo-600 dark:text-indigo-500' : '',
            currentStep > 2 ? 'after:border-indigo-600 dark:after:border-indigo-500' : ''
          ]">
        <span class="flex items-center after:content-['/'] sm:after:hidden after:mx-2 after:text-slate-200 dark:after:text-slate-500">
          <svg v-if="currentStep > 2" class="w-4 h-4 mr-2 sm:w-5 sm:h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
          </svg>
          <span v-else class="mr-2 w-5 h-5 flex justify-center items-center rounded-full text-xs font-bold"
                :class="currentStep === 2 ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-600 dark:bg-indigo-900 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'">2</span>
          Empresa
        </span>
      </li>
      <li class="flex items-center" :class="currentStep === 3 ? 'text-indigo-600 dark:text-indigo-500' : ''">
        <span class="mr-2 w-5 h-5 flex justify-center items-center rounded-full text-xs font-bold"
              :class="currentStep === 3 ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-600 dark:bg-indigo-900 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'">3</span>
        Aceite
      </li>
    </ol>

    <!-- Formulário Principal -->
    <form @submit.prevent="currentStep === 3 ? handleRegister() : nextStep()" class="space-y-5">

      <!-- STEP 1: Dados do Usuário -->
      <div v-show="currentStep === 1" class="space-y-5 animate-fade-in">
        <div>
          <label for="name" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Nome completo</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            </div>
            <input v-model="formData.name" type="text" id="name" class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full pl-10 p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors" placeholder="João da Silva" :required="currentStep === 1">
          </div>
        </div>

        <div>
          <label for="email" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Seu e-mail</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            </div>
            <input v-model="formData.email" type="email" id="email" class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full pl-10 p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors" placeholder="nome@empresa.com" :required="currentStep === 1">
          </div>
        </div>

        <div>
          <label for="password" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Senha</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <input v-model="formData.password" type="password" id="password" placeholder="••••••••" class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full pl-10 p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors" :required="currentStep === 1">
          </div>
        </div>

        <div>
          <label for="confirmPassword" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Confirmar Senha</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <input v-model="formData.confirmPassword" type="password" id="confirmPassword" placeholder="••••••••" class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full pl-10 p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors" :required="currentStep === 1">
          </div>
        </div>
      </div>

      <!-- STEP 2: Dados da Empresa -->
      <div v-show="currentStep === 2" class="space-y-5 animate-fade-in">
        <div>
          <label for="companyName" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Razão Social / Nome Fantasia</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            </div>
            <input v-model="formData.companyName" type="text" id="companyName" class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full pl-10 p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors" placeholder="Minha Empresa LTDA" :required="currentStep === 2">
          </div>
        </div>

        <div>
          <label for="cnpj" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">CNPJ</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
            </div>
            <input v-model="formData.cnpj" type="text" id="cnpj" class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full pl-10 p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors" placeholder="00.000.000/0001-00" :required="currentStep === 2">
          </div>
        </div>

        <div>
          <label for="companyPhone" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Telefone da Empresa</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
            </div>
            <input v-model="formData.companyPhone" type="text" id="companyPhone" class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full pl-10 p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors" placeholder="(00) 0000-0000" :required="currentStep === 2">
          </div>
        </div>
      </div>

      <!-- STEP 3: Aceite de Termos -->
      <div v-show="currentStep === 3" class="space-y-5 animate-fade-in text-center py-4">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 mb-4 dark:bg-indigo-900/30 dark:text-indigo-400">
           <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h3 class="text-lg font-medium text-slate-900 dark:text-white">Quase lá, {{ formData.name || 'usuário' }}!</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 px-4">
          Para concluir a criação da sua conta e da empresa <strong>{{ formData.companyName || 'sua empresa' }}</strong>, por favor, leia e aceite nossos termos de uso.
        </p>

        <div class="flex items-center justify-center pt-4">
          <div class="flex items-center h-5">
            <input v-model="formData.terms" id="terms" type="checkbox" class="w-5 h-5 border border-slate-300 rounded bg-slate-50 focus:ring-3 focus:ring-indigo-300 dark:bg-slate-700 dark:border-slate-600 dark:focus:ring-indigo-600 dark:ring-offset-slate-800 text-indigo-600" :required="currentStep === 3">
          </div>
          <div class="ml-3 text-sm text-left">
            <label for="terms" class="font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Eu li e aceito os <a class="text-indigo-600 hover:underline dark:text-indigo-400" href="#">Termos e Condições</a> e a <a class="text-indigo-600 hover:underline dark:text-indigo-400" href="#">Política de Privacidade</a>.
            </label>
          </div>
        </div>
      </div>

      <!-- Navegação dos Steps (Botões) -->
      <div class="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-700 mt-6">
        <!-- Voltar -->
        <button v-if="currentStep > 1" @click="prevStep" type="button" class="w-full text-slate-700 bg-slate-100 hover:bg-slate-200 focus:ring-4 focus:outline-none focus:ring-slate-300 font-medium rounded-lg text-sm px-5 py-3 text-center dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors">
          Voltar
        </button>

        <!-- Avançar ou Concluir -->
        <button type="submit" class="w-full text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-5 py-3 text-center dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:focus:ring-indigo-800 transition-colors shadow-md shadow-indigo-500/20">
          {{ currentStep === 3 ? 'Finalizar Cadastro' : 'Avançar' }}
        </button>
      </div>

      <!-- Link para Login (apenas no step 1 para não poluir os outros) -->
      <p v-if="currentStep === 1" class="text-sm font-light text-center text-slate-500 dark:text-slate-400 pt-4">
        Já tem uma conta?
        <NuxtLink to="/login" class="font-medium text-indigo-600 hover:underline dark:text-indigo-400">Faça login aqui</NuxtLink>
      </p>
    </form>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
