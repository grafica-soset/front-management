<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

definePageMeta({
  layout: 'empty'
})

const router = useRouter()

const formData = ref({
  email: '',
  password: '',
  remember: false
})

const handleLogin = () => {
  console.log('Login submetido:', formData.value)
  // Simula login bem sucedido
  router.push('/')
}
</script>

<template>
  <div class="w-full max-w-md bg-white rounded-2xl shadow-xl dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-8 sm:p-10">
    <div class="flex items-center justify-center mb-8">
      <div class="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
      </div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white ml-3">
        Admin App
      </h1>
    </div>

    <div class="text-center mb-8">
      <h2 class="text-xl font-bold text-slate-900 dark:text-white">Faça login em sua conta</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Bem-vindo de volta! Por favor, insira seus dados.</p>
    </div>

    <form @submit.prevent="handleLogin" class="space-y-5">
      <div>
        <label for="email" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Seu e-mail</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          </div>
          <input v-model="formData.email" type="email" name="email" id="email" class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full pl-10 p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors" placeholder="nome@empresa.com" required>
        </div>
      </div>

      <div>
        <label for="password" class="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Senha</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <input v-model="formData.password" type="password" name="password" id="password" placeholder="••••••••" class="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full pl-10 p-3 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white transition-colors" required>
        </div>
      </div>

      <div class="flex items-center justify-between pt-2">
        <div class="flex items-start">
          <div class="flex items-center h-5">
            <input v-model="formData.remember" id="remember" aria-describedby="remember" type="checkbox" class="w-4 h-4 border border-slate-300 rounded bg-slate-50 focus:ring-3 focus:ring-indigo-300 dark:bg-slate-700 dark:border-slate-600 dark:focus:ring-indigo-600 dark:ring-offset-slate-800 text-indigo-600">
          </div>
          <div class="ml-3 text-sm">
            <label for="remember" class="text-slate-500 dark:text-slate-300">Lembrar de mim</label>
          </div>
        </div>
        <a href="#" class="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">Esqueceu a senha?</a>
      </div>

      <button type="submit" class="w-full text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-5 py-3 text-center dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:focus:ring-indigo-800 transition-colors shadow-md shadow-indigo-500/20">
        Entrar
      </button>

      <p class="text-sm font-light text-center text-slate-500 dark:text-slate-400 pt-4">
        Ainda não tem uma conta?
        <NuxtLink to="/register" class="font-medium text-indigo-600 hover:underline dark:text-indigo-400">Cadastre-se</NuxtLink>
      </p>
    </form>
  </div>
</template>
