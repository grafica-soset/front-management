/**
 * Rótulos do cadastro de atividades (atividade 028).
 */
import type { ActivityType } from '@/types/Activity'

export const ACTIVITY_TYPES: ActivityType[] = ['MANUAL', 'AUTOMATED']

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  MANUAL: 'Manual',
  AUTOMATED: 'Automatizada',
}
