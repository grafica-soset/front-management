/**
 * Tipo de matriz fotográfica de uma chapa gráfica (atividade 027).
 * Usado tanto no insumo do tipo Chapa quanto nas impressoras (quais matrizes elas aceitam).
 *
 * `NYLON_SCREEN` é a Tela de Nylon com gravação fotográfica (atividade 032 — ajuste 0003):
 * continua sendo cadastrada como CHAPA, mas é exclusiva da máquina serigráfica.
 */
export type PlateType = 'FOTOLITO' | 'LASER_FILM' | 'CTP' | 'NYLON_SCREEN'
