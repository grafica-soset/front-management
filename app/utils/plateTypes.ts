/**
 * Catálogo dos tipos de matriz fotográfica (chapa) — atividade 027.
 * Compartilhado pelo insumo Chapa e pela máquina Offset (Matriz Fotográfica aceita).
 */
import type { PlateType } from '@/types/PlateType'

export const PLATE_TYPES: PlateType[] = ['FOTOLITO', 'LASER_FILM', 'CTP']

export const PLATE_TYPE_LABELS: Record<PlateType, string> = {
  FOTOLITO: 'Chapa Fotolito',
  LASER_FILM: 'Chapa Laser Film',
  CTP: 'Chapa CTP',
}
