/**
 * Catálogo de rótulos das Tarefas de Acabamento (atividade 029).
 */
import type { FinishingTaskType } from '@/types/FinishingTask'

export const FINISHING_TASK_TYPES: FinishingTaskType[] = ['FOLD_TURNING', 'PACKAGING']

export const FINISHING_TASK_TYPE_LABELS: Record<FinishingTaskType, string> = {
  FOLD_TURNING: 'Viragem de Dobras',
  PACKAGING: 'Empacotar',
}

/** Descrição curta de cada tipo, exibida no formulário. */
export const FINISHING_TASK_TYPE_HINTS: Record<FinishingTaskType, string> = {
  FOLD_TURNING: 'Vira as dobras após a dobradeira. Cobrança por unidade.',
  PACKAGING: 'Agrupa em pacotes por peso. O orçamento calcula a quantidade de pacotes.',
}
