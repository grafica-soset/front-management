/**
 * Catálogo de rótulos das Tarefas de Acabamento (atividade 029).
 */
import type { FinishingTaskType } from '@/types/FinishingTask'

export const FINISHING_TASK_TYPES: FinishingTaskType[] = [
  'FOLD_TURNING',
  'PACKAGING',
  'SPIRAL_BINDING',
  'BLOCK_GLUING',
  'BAG_APPLICATION',
  'ENVELOPE_SEALING',
  'COLLATION',
  'MANUAL_COUNTING',
]

export const FINISHING_TASK_TYPE_LABELS: Record<FinishingTaskType, string> = {
  FOLD_TURNING: 'Viragem de Dobras',
  PACKAGING: 'Empacotar',
  SPIRAL_BINDING: 'Aplicação de Espiral',
  BLOCK_GLUING: 'Colagem de Blocos/Talões',
  BAG_APPLICATION: 'Aplicação de Bolsa',
  ENVELOPE_SEALING: 'Fechamento de Envelope',
  COLLATION: 'Intercalação de Vias',
  MANUAL_COUNTING: 'Contagem Manual de Vias',
}

/** Descrição curta de cada tipo, exibida no formulário. */
export const FINISHING_TASK_TYPE_HINTS: Record<FinishingTaskType, string> = {
  FOLD_TURNING: 'Vira as dobras após a dobradeira. Cobrança por unidade.',
  PACKAGING: 'Agrupa em pacotes por peso. O orçamento calcula a quantidade de pacotes.',
  SPIRAL_BINDING: 'Passa o espiral pelos furos, medido pelo comprimento (o tempo interpola entre mín. e máx.).',
  BLOCK_GLUING: 'Empilha os blocos/talões e aplica a cola.',
  BAG_APPLICATION: 'Viragem da dobra + cola + fechamento da bolsa, por unidade.',
  ENVELOPE_SEALING: 'Viragem da dobra + cola + fechamento do envelope, por unidade.',
  COLLATION: 'Organiza as vias (jogos) na ordem. Configure o tempo por jogo para cada quantidade de vias.',
  MANUAL_COUNTING: 'Conta as folhas à mão. Informe uma referência (quanto tempo leva para contar X folhas); o orçamento extrapola para a quantidade do pedido.',
}
