Este documento contém as diretrizes, padrões e arquitetura para o desenvolvimento do sistema Soset, um sistema administrativo voltado para a indústria gráfica.

## 1. Visão Geral do Projeto
* **Nome:** Soset
* **Domínio:** Administrativo para Indústria Gráfica (Gestão de ordens de serviço, clientes, orçamentos, produção).
* **Framework:** Nuxt 4 (Estrutura de diretórios app/).
* **Linguagem:** TypeScript (Modo Estrito).
* **Estilização:** Tailwind CSS.
* **Estado:** Pinia com persistência.

## 2. Pilha Tecnológica (Tech Stack)
* **Framework:** Nuxt 4 (Vue 3, Composition API, `<script setup>`).
* **CSS:** Tailwind CSS para estilização utilitária e responsividade.
* **Gerenciamento de Estado:** Pinia.
* **Persistência de Dados:** pinia-plugin-persistedstate.
* **Ícones:** Nuxt Icon ou Lucide Vue.

## 3. Padrões de Código e Nomenclatura
* **Idioma:** Código (variáveis, funções, classes) em inglês. Comentários e documentação em português.
* **Componentes:** PascalCase (ex: `BaseInput.vue`, `ClientForm.vue`).
* **Composables/Stores:** camelCase (ex: `useSessionStore.ts`, `useOrder.ts`).
* **Páginas:** kebab-case (ex: `ordens-servico/index.vue`).
* **Tipagem:** Preferencialmente Interfaces sobre Types. Não usar `any`.

## 4. Arquitetura de Componentes e UI

**Layout Responsivo**
* O design deve ser Mobile-First.
* Utilizar os breakpoints do Tailwind (sm, md, lg, xl).
* O layout administrativo deve conter uma Sidebar retrátil e um Topbar de contexto.

**Formulários Reutilizáveis (Regra Crítica)**
* Todos os formulários devem ser componentes independentes.
* Não injetar lógica de API diretamente dentro dos campos.
* O formulário deve receber os dados iniciais via props e emitir os dados validados via `@submit` ou `@save`.
* Para edição de dados abrir sempre um modal com o formulario
* Para cadastro, podemos utilizar uma página com o forumário, ex: URL /customers/new


## 5. Gerenciamento de Estado (Pinia)
* **Store de Cliente/Sessão:** Criar uma store `useAuthStore` ou `useSessionStore`.
* **Persistência:** Ativar o plugin de persistência para manter os dados do usuário logado e preferências de navegação após o refresh.
* **Configuração de Cookies:** Para Nuxt SSR, configurar a persistência para usar Cookies em vez de LocalStorage na autenticação.

## 6. Estrutura de Diretórios (Nuxt 4)
```text
soset/
├── app/
│   ├── components/       # Componentes UI (BaseInput, BaseButton)
│   │   └── forms/        # Componentes de Formulários específicos
│   ├── composables/      # Lógica compartilhada
│   ├── layouts/          # Layouts (default.vue, auth.vue)
│   ├── pages/            # Rotas da aplicação
│   ├── stores/           # Pinia Stores (auth.ts, settings.ts)
│   └── assets/           # CSS (tailwind.css) e Imagens
├── server/               # API routes e Middlewares (Server-side)
├── public/               # Arquivos estáticos
└── nuxt.config.ts        # Configurações do framework
```

## 7. Regras de Desenvolvimento com IA
* **Modularidade:** Sempre que criar um formulário novo, verifique se os inputs básicos já existem em `components/ui` ou `components/base`.
* **Tipagem:** Ao criar uma Store, defina rigorosamente o State e as Actions.
* **Tailwind:** Evite CSS arbitrário. Use as classes padrão do Tailwind. Se uma classe for muito repetida, use `@apply` no arquivo CSS principal.
* **Clean Code:** Funções devem ser pequenas e focadas em uma única responsabilidade.

## 8. Workflow de Criação de Formulário
1. Criar o schema de validação (Zod/Yup).
2. Criar o componente do formulário em `app/components/forms/`.
3. Definir props para dados de edição e emits para salvamento.
4. Integrar o componente na página desejada.
