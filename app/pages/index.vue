<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <!-- Card 1 -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow dark:bg-slate-800 dark:border-slate-700">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-slate-500 dark:text-slate-400">Vendas Hoje</h3>
          <div class="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
        </div>
        <div class="mt-4">
          <p class="text-2xl font-bold leading-none text-slate-900 sm:text-3xl dark:text-white">R$ 5.430</p>
          <div class="flex items-center mt-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            <span>+12.5% em relação a ontem</span>
          </div>
        </div>
      </div>

      <!-- Card 2 -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow dark:bg-slate-800 dark:border-slate-700">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-slate-500 dark:text-slate-400">Novos Usuários</h3>
          <div class="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          </div>
        </div>
        <div class="mt-4">
          <p class="text-2xl font-bold leading-none text-slate-900 sm:text-3xl dark:text-white">124</p>
          <div class="flex items-center mt-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            <span>+3.2% nesta semana</span>
          </div>
        </div>
      </div>

      <!-- Card 3 -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow dark:bg-slate-800 dark:border-slate-700">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-slate-500 dark:text-slate-400">Pedidos Pendentes</h3>
          <div class="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
          </div>
        </div>
        <div class="mt-4">
          <p class="text-2xl font-bold leading-none text-slate-900 sm:text-3xl dark:text-white">45</p>
          <div class="flex items-center mt-2 text-sm text-rose-600 dark:text-rose-400 font-medium">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"></path></svg>
            <span>-2.5% em relação a ontem</span>
          </div>
        </div>
      </div>

      <!-- Card 4 -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow dark:bg-slate-800 dark:border-slate-700">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-slate-500 dark:text-slate-400">Taxa de Conversão</h3>
          <div class="flex items-center justify-center w-10 h-10 rounded-full bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
          </div>
        </div>
        <div class="mt-4">
          <p class="text-2xl font-bold leading-none text-slate-900 sm:text-3xl dark:text-white">4.8%</p>
          <div class="flex items-center mt-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            <span>+1.1% neste mês</span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Tabela de Últimos Pedidos -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
        <div class="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">Últimos Pedidos</h3>
          <button class="text-sm text-indigo-600 hover:text-indigo-700 font-medium dark:text-indigo-400 dark:hover:text-indigo-300">Ver todos</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead class="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50 dark:text-slate-300">
              <tr>
                <th scope="col" class="px-5 py-4 font-semibold">Cliente</th>
                <th scope="col" class="px-5 py-4 font-semibold">Data</th>
                <th scope="col" class="px-5 py-4 font-semibold">Valor</th>
                <th scope="col" class="px-5 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
              <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                <th scope="row" class="px-5 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white flex items-center">
                  <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs mr-3 dark:bg-indigo-900/40 dark:text-indigo-400">MS</div>
                  Maria Silva
                </th>
                <td class="px-5 py-4 text-slate-600 dark:text-slate-300">14 Ago 2023</td>
                <td class="px-5 py-4 font-medium text-slate-900 dark:text-slate-200">R$ 345,00</td>
                <td class="px-5 py-4">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 mr-1.5"></span>
                    Concluído
                  </span>
                </td>
              </tr>
              <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                <th scope="row" class="px-5 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white flex items-center">
                  <div class="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs mr-3 dark:bg-amber-900/40 dark:text-amber-400">JS</div>
                  João Santos
                </th>
                <td class="px-5 py-4 text-slate-600 dark:text-slate-300">14 Ago 2023</td>
                <td class="px-5 py-4 font-medium text-slate-900 dark:text-slate-200">R$ 1.250,00</td>
                <td class="px-5 py-4">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mr-1.5"></span>
                    Pendente
                  </span>
                </td>
              </tr>
              <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                <th scope="row" class="px-5 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white flex items-center">
                  <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs mr-3 dark:bg-emerald-900/40 dark:text-emerald-400">AC</div>
                  Ana Costa
                </th>
                <td class="px-5 py-4 text-slate-600 dark:text-slate-300">13 Ago 2023</td>
                <td class="px-5 py-4 font-medium text-slate-900 dark:text-slate-200">R$ 89,90</td>
                <td class="px-5 py-4">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 mr-1.5"></span>
                    Concluído
                  </span>
                </td>
              </tr>
              <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                <th scope="row" class="px-5 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white flex items-center">
                  <div class="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs mr-3 dark:bg-rose-900/40 dark:text-rose-400">PO</div>
                  Pedro Oliveira
                </th>
                <td class="px-5 py-4 text-slate-600 dark:text-slate-300">13 Ago 2023</td>
                <td class="px-5 py-4 font-medium text-slate-900 dark:text-slate-200">R$ 450,00</td>
                <td class="px-5 py-4">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400 mr-1.5"></span>
                    Cancelado
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Outro componente (ex: Atividades Recentes) -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <div class="p-5 border-b border-slate-200 dark:border-slate-700">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">Atividades Recentes</h3>
        </div>
        <div class="p-6">
          <ol class="relative border-l-2 border-slate-100 dark:border-slate-700">
            <li class="mb-8 ml-6">
              <span class="absolute flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-full -left-4 ring-4 ring-white dark:ring-slate-800 dark:bg-indigo-900/50">
                <svg class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20"><path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z"/></svg>
              </span>
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Novo produto adicionado</h3>
                <time class="text-xs font-normal text-slate-400 sm:order-last">Há 2 horas</time>
              </div>
              <p class="text-sm font-normal text-slate-500 dark:text-slate-400">O produto <span class="font-medium text-slate-700 dark:text-slate-300">"Camiseta Básica"</span> foi adicionado ao catálogo por admin.</p>
            </li>
            <li class="mb-8 ml-6">
              <span class="absolute flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-full -left-4 ring-4 ring-white dark:ring-slate-800 dark:bg-emerald-900/50">
                <svg class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5.917 5.724 10.5 15 1.5"/></svg>
              </span>
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Atualização de sistema</h3>
                <time class="text-xs font-normal text-slate-400 sm:order-last">Há 5 horas</time>
              </div>
              <p class="text-sm font-normal text-slate-500 dark:text-slate-400">O sistema foi atualizado para a versão 1.2.4 com correções de segurança.</p>
            </li>
            <li class="ml-6">
              <span class="absolute flex items-center justify-center w-8 h-8 bg-sky-100 rounded-full -left-4 ring-4 ring-white dark:ring-slate-800 dark:bg-sky-900/50">
                <svg class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 20"><path d="M16 1h-3.278A1.992 1.992 0 0 0 11 0H7a1.993 1.993 0 0 0-1.722 1H2a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2Zm-3 14H5a1 1 0 0 1 0-2h8a1 1 0 0 1 0 2Zm0-4H5a1 1 0 0 1 0-2h8a1 1 0 1 1 0 2Zm0-5H5a1 1 0 0 1 0-2h2V2h4v2h2a1 1 0 1 1 0 2Z"/></svg>
              </span>
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Backup automático</h3>
                <time class="text-xs font-normal text-slate-400 sm:order-last">Ontem</time>
              </div>
              <p class="text-sm font-normal text-slate-500 dark:text-slate-400">O backup diário do banco de dados foi concluído com sucesso.</p>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>
