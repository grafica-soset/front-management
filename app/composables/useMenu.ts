import { ref } from 'vue'

export interface MenuItem {
  name: string
  href?: string
  icon?: string
  current?: boolean
  expanded?: boolean
  children?: { name: string; href: string }[]
}

export default function useMenu() {
  const navigation = ref<MenuItem[]>([
    {
      name: 'Dashboard',
      href: '/',
      icon: 'dashboard',
      current: true
    },
    {
      name: 'Cadastros',
      icon: 'cadastros',
      expanded: true,
      children: [
        { name: 'Produtos', href: '/sample' }, // Adicionado link para a listagem
        { name: 'Adicionar Produto', href: '/sample/add' },
        { name: 'Categorias', href: '#' },
        { name: 'Fornecedores', href: '#' }
      ]
    },
    {
      name: 'Papéis',
      icon: 'papers',
      expanded: false,
      children: [
        { name: 'Cadastro de Papéis', href: '/papeis' },
        { name: 'Catálogo', href: '/papeis/catalogo' },
        { name: 'Meus papéis', href: '/papeis/meus-papeis' },
      ],
    },
    {
      name: 'Máquinas',
      icon: 'machines',
      expanded: false,
      children: [
        { name: 'Impressão', href: '/maquinas/impressao' },
        { name: 'Corte', href: '/maquinas/corte' },
        { name: 'Acabamento', href: '/maquinas/acabamento' },
        { name: 'Pré-impressão', href: '/maquinas/pre-impressao' },
      ],
    },
    { name: 'Usuários', href: '/usuarios', icon: 'users' },
    {
      name: 'Configurações',
      icon: 'settings',
      expanded: false,
      children: [
        { name: 'Empresa', href: '/settings/company' },
      ],
    },
  ])

  const toggleSubMenu = (item: MenuItem) => {
    if (item.children) {
      item.expanded = !item.expanded
    }
  }

  return {
    navigation,
    toggleSubMenu
  }
}
