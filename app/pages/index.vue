<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <!-- Card 1 -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-4 dark:bg-gray-800 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-normal text-gray-500 dark:text-gray-400">Vendas Hoje</h3>
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900">
            <svg class="w-4 h-4 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
        </div>
        <div class="mt-2">
          <p class="text-2xl font-bold leading-none text-gray-900 sm:text-3xl dark:text-white">R$ 5.430</p>
          <div class="flex items-center mt-2 text-sm text-green-600 dark:text-green-400">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            <span>+12.5% em relação a ontem</span>
          </div>
        </div>
      </div>

      <!-- Card 2 -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-4 dark:bg-gray-800 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-normal text-gray-500 dark:text-gray-400">Novos Usuários</h3>
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900">
            <svg class="w-4 h-4 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          </div>
        </div>
        <div class="mt-2">
          <p class="text-2xl font-bold leading-none text-gray-900 sm:text-3xl dark:text-white">124</p>
          <div class="flex items-center mt-2 text-sm text-green-600 dark:text-green-400">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            <span>+3.2% nesta semana</span>
          </div>
        </div>
      </div>

      <!-- Card 3 -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-4 dark:bg-gray-800 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-normal text-gray-500 dark:text-gray-400">Pedidos Pendentes</h3>
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900">
            <svg class="w-4 h-4 text-yellow-600 dark:text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
          </div>
        </div>
        <div class="mt-2">
          <p class="text-2xl font-bold leading-none text-gray-900 sm:text-3xl dark:text-white">45</p>
          <div class="flex items-center mt-2 text-sm text-red-600 dark:text-red-400">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"></path></svg>
            <span>-2.5% em relação a ontem</span>
          </div>
        </div>
      </div>

      <!-- Card 4 -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-4 dark:bg-gray-800 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-normal text-gray-500 dark:text-gray-400">Taxa de Conversão</h3>
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900">
            <svg class="w-4 h-4 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
          </div>
        </div>
        <div class="mt-2">
          <p class="text-2xl font-bold leading-none text-gray-900 sm:text-3xl dark:text-white">4.8%</p>
          <div class="flex items-center mt-2 text-sm text-green-600 dark:text-green-400">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            <span>+1.1% neste mês</span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Tabela de Últimos Pedidos -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Últimos Pedidos</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" class="px-4 py-3">Cliente</th>
                <th scope="col" class="px-4 py-3">Data</th>
                <th scope="col" class="px-4 py-3">Valor</th>
                <th scope="col" class="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <th scope="row" class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                  Maria Silva
                </th>
                <td class="px-4 py-3">14 Ago 2023</td>
                <td class="px-4 py-3">R$ 345,00</td>
                <td class="px-4 py-3">
                  <span class="bg-green-100 text-green-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">Concluído</span>
                </td>
              </tr>
              <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <th scope="row" class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                  João Santos
                </th>
                <td class="px-4 py-3">14 Ago 2023</td>
                <td class="px-4 py-3">R$ 1.250,00</td>
                <td class="px-4 py-3">
                  <span class="bg-yellow-100 text-yellow-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">Pendente</span>
                </td>
              </tr>
              <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <th scope="row" class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                  Ana Costa
                </th>
                <td class="px-4 py-3">13 Ago 2023</td>
                <td class="px-4 py-3">R$ 89,90</td>
                <td class="px-4 py-3">
                  <span class="bg-green-100 text-green-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">Concluído</span>
                </td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-600">
                <th scope="row" class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                  Pedro Oliveira
                </th>
                <td class="px-4 py-3">13 Ago 2023</td>
                <td class="px-4 py-3">R$ 450,00</td>
                <td class="px-4 py-3">
                  <span class="bg-red-100 text-red-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300">Cancelado</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Outro componente (ex: Atividades Recentes) -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Atividades Recentes</h3>
        </div>
        <div class="p-4">
          <ol class="relative border-l border-gray-200 dark:border-gray-700">
            <li class="mb-6 ml-4">
              <div class="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -left-1.5 border border-white dark:border-gray-800 dark:bg-gray-700"></div>
              <time class="mb-1 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">Há 2 horas</time>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Novo produto adicionado</h3>
              <p class="mb-4 text-sm font-normal text-gray-500 dark:text-gray-400">O produto "Camiseta Básica" foi adicionado ao catálogo por admin.</p>
            </li>
            <li class="mb-6 ml-4">
              <div class="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -left-1.5 border border-white dark:border-gray-800 dark:bg-gray-700"></div>
              <time class="mb-1 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">Há 5 horas</time>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Atualização de sistema</h3>
              <p class="text-sm font-normal text-gray-500 dark:text-gray-400">O sistema foi atualizado para a versão 1.2.4 com correções de segurança.</p>
            </li>
            <li class="ml-4">
              <div class="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -left-1.5 border border-white dark:border-gray-800 dark:bg-gray-700"></div>
              <time class="mb-1 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">Ontem</time>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Backup automático</h3>
              <p class="text-sm font-normal text-gray-500 dark:text-gray-400">O backup diário do banco de dados foi concluído com sucesso.</p>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>
