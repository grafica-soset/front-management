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
    { name: 'Usuários', href: '#', icon: 'users' },
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
