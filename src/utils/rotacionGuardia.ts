// Calibración oficial Seguridad VIP 3000 C.A. (Referencia: Viernes 20 de Noviembre de 2026)
// 1) Horario MIXTO (24x48):
//    - 2026-11-20 => GRUPO B
//    - 2026-11-21 => GRUPO C
//    - 2026-11-22 => GRUPO A
// 2) Horario 24X24 (Alternancia A / B):
//    - 2026-11-20 => GRUPO A
//    - 2026-11-21 => GRUPO B
//    - 2026-11-22 => GRUPO A
// 3) Horarios DIURNO y NOCTURNO (12h):
//    - Todos los días como un solo grupo operativo.

const ORDEN_GRUPOS_MIXTO: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
const ORDEN_GRUPOS_24X24: ('A' | 'B')[] = ['A', 'B'];

function calcularDiferenciaDiasDesdeReferencia(fechaYYYYMMDD: string): number {
  const refUTC = Date.UTC(2026, 10, 20); // 2026-11-20 (mes 10 en base 0)
  const partes = fechaYYYYMMDD.split('-').map(Number);
  if (partes.length !== 3 || partes.some(isNaN)) return 0;
  const targetUTC = Date.UTC(partes, partes - 1, partes);
  return Math.round((targetUTC - refUTC) / (1000 * 60 * 60 * 24));
}

export function obtenerGrupoMixtoPorFecha(fechaYYYYMMDD: string): 'A' | 'B' | 'C' {
  const diffDias = calcularDiferenciaDiasDesdeReferencia(fechaYYYYMMDD);
  const indice = (((1 + diffDias) % 3) + 3) % 3; // 1 = 'B' el 2026-11-20
  return ORDEN_GRUPOS_MIXTO[indice];
}

export function obtenerGrupo24x24PorFecha(fechaYYYYMMDD: string): 'A' | 'B' {
  const diffDias = calcularDiferenciaDiasDesdeReferencia(fechaYYYYMMDD);
  const indice = (((0 + diffDias) % 2) + 2) % 2; // 0 = 'A' el 2026-11-20
  return ORDEN_GRUPOS_24X24[indice];
}

export function leTocaGuardiaHoy(
  grupoOficial: string,
  turnoOficial: string | undefined,
  fechaYYYYMMDD: string
): boolean {
  const turnoNorm = (turnoOficial || 'MIXTO').toUpperCase();
  const grupoNorm = (grupoOficial || '').toUpperCase();

  if (turnoNorm === 'DIURNO' || turnoNorm === 'NOCTURNO') {
    return true;
  }

  if (turnoNorm === '24X24') {
    return grupoNorm === obtenerGrupo24x24PorFecha(fechaYYYYMMDD);
  }

  return grupoNorm === obtenerGrupoMixtoPorFecha(fechaYYYYMMDD);
}
