import type { GrainDirection } from '@/types/GrainDirection'

/** Lado da folha em que a fibra corre, em texto curto. */
export const grainDirectionLabel = (grain: GrainDirection | null | undefined): string => {
  if (grain === 'WIDTH') return 'Largura'
  if (grain === 'HEIGHT') return 'Comprimento'
  return '—'
}
