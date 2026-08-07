import { ref } from 'vue'

/** Folha do menu: sempre leva a uma rota. */
export interface MenuLink {
  name: string
  href: string
}

/**
 * Item de submenu: ou é um link direto, ou um subgrupo que abre mais um nível
 * (ex.: Produção > Atividades > Corte).
 */
export interface MenuSubItem {
  name: string
  href?: string
  expanded?: boolean
  children?: MenuLink[]
}

export interface MenuItem {
  name: string
  href?: string
  icon?: string
  current?: boolean
  expanded?: boolean
  children?: MenuSubItem[]
}

export default function useMenu() {
  const navigation = ref<MenuItem[]>([
    {
      name: 'Dashboard',
      href: '/',
      icon: 'dashboard',
      current: true
    },
    // {
    //   name: 'Cadastros',
    //   icon: 'cadastros',
    //   expanded: true,
    //   children: [
    //     { name: 'Produtos', href: '/sample' }, // Adicionado link para a listagem
    //     { name: 'Adicionar Produto', href: '/sample/add' },
    //     { name: 'Categorias', href: '#' },
    //     { name: 'Fornecedores', href: '#' }
    //   ]
    // },
    {
      name: 'Papéis',
      icon: 'papers',
      expanded: false,
      children: [
        { name: 'Cadastro de Papéis', href: '/papeis' },
        { name: 'Formatos', href: '/formatos' },
        { name: 'Catálogo', href: '/papeis/catalogo' },
        { name: 'Meus papéis', href: '/papeis/meus-papeis' },
      ],
    },
    {
      name: 'Insumos',
      icon: 'papers',
      expanded: false,
      children: [
        { name: 'Cadastro de Insumos', href: '/insumos' },
        { name: 'Grupos de Insumo', href: '/insumos/grupos' },
      ],
    },
    {
      name: 'Produção',
      icon: 'cadastros',
      expanded: false,
      children: [
        {
          // Um item por TIPO de atividade: é o filtro pronto, sem o usuário ter que procurar
          // na grid (a página lê o ?type=).
          name: 'Atividades',
          expanded: false,
          children: [
            { name: 'Todas', href: '/atividades' },
            { name: 'Manual', href: '/atividades?type=MANUAL' },
            { name: 'Impressão', href: '/atividades?type=PRINTING' },
            { name: 'Corte', href: '/atividades?type=CUTTING' },
            { name: 'Acabamento', href: '/atividades?type=FINISHING' },
            { name: 'Empacotamento', href: '/atividades?type=PACKAGING' },
          ],
        },
        { name: 'Modelos de Produto', href: '/modelos' },
      ],
    },
    {
      name: 'Configuração de Acabamentos',
      icon: 'cadastros',
      expanded: false,
      children: [
        { name: 'Viragem de Dobras', href: '/acabamentos?type=FOLD_TURNING' },
        { name: 'Empacotar', href: '/acabamentos?type=PACKAGING' },
        { name: 'Aplicação de Espiral', href: '/acabamentos?type=SPIRAL_BINDING' },
        { name: 'Colagem de Blocos/Talões', href: '/acabamentos?type=BLOCK_GLUING' },
        { name: 'Aplicação de Bolsa', href: '/acabamentos?type=BAG_APPLICATION' },
        { name: 'Fechamento de Envelope', href: '/acabamentos?type=ENVELOPE_SEALING' },
        { name: 'Intercalação de Vias', href: '/acabamentos?type=COLLATION' },
        { name: 'Contagem Manual de Vias', href: '/acabamentos?type=MANUAL_COUNTING' },
      ],
    },
    {
      name: 'Máquinas',
      icon: 'machines',
      expanded: false,
      children: [
        { name: 'Impressão Offset', href: '/maquinas' },
        { name: 'Guilhotina', href: '/maquinas/corte' },
        { name: 'Corte e Vinco', href: '/maquinas/corte-vinco' },
        { name: 'Impressora Serigráfica', href: '/maquinas/serigrafia' },
        { name: 'Furadeira', href: '/maquinas/furadeira' },
        { name: 'Plastificadora', href: '/maquinas/plastificadora' },
        { name: 'Dobradeira', href: '/maquinas/dobradeira' },
        { name: 'Picotadeira', href: '/maquinas/picotadeira' },
        { name: 'Grampeadeira', href: '/maquinas/grampeadeira' },
        { name: 'Impressora Digital', href: '/maquinas/digital' },
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
