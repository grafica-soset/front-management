/**
 * Catálogo dos tipos de matriz fotográfica (chapa) — atividade 027.
 * Compartilhado pelo insumo Chapa e pelas impressoras (Matriz Fotográfica aceita).
 *
 * A Tela de Nylon (atividade 032 — ajuste 0003) é a matriz da SERIGRAFIA: aparece no cadastro
 * de insumo como mais um tipo de chapa, mas só a máquina serigráfica pode aceitá-la — por isso
 * as listas por máquina abaixo (`OFFSET_PLATE_TYPES` × `SCREEN_PRINTING_PLATE_TYPES`).
 */
import type { PlateType } from '@/types/PlateType'

export const PLATE_TYPES: PlateType[] = ['FOTOLITO', 'LASER_FILM', 'CTP', 'NYLON_SCREEN']

export const PLATE_TYPE_LABELS: Record<PlateType, string> = {
  FOTOLITO: 'Chapa Fotolito',
  LASER_FILM: 'Chapa Laser Film',
  CTP: 'Chapa CTP',
  NYLON_SCREEN: 'Tela de Nylon',
}

/** Matrizes exclusivas da serigrafia (telas). */
export const SCREEN_PRINTING_PLATE_TYPES: PlateType[] = ['NYLON_SCREEN']

/** Matrizes das impressoras convencionais (Offset) — tudo que não é tela. */
export const OFFSET_PLATE_TYPES: PlateType[] = PLATE_TYPES.filter(
  (p) => !SCREEN_PRINTING_PLATE_TYPES.includes(p),
)
