import { NextResponse } from 'next/server';
import { readSheet } from '../../../../lib/sheets';
import { findUsuario, tienePermisoReportes } from '../../../../lib/auth';

// GET /api/reportes/meses-disponibles?solicitanteEmail=...
// Devuelve solo los meses (YYYY-MM) que tienen al menos un lead cargado, más recientes primero —
// así el desplegable de Reportes no muestra meses vacíos de antes de que empezáramos a usar la app.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoReportes(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const leads = await readSheet('Leads');
  const mesesConDatos = [...new Set(
    leads.map((l) => (l.FechaIngreso || '').slice(0, 7)).filter(Boolean)
  )].sort((a, b) => b.localeCompare(a));

  // Si por algún motivo no hay ningún lead todavía, al menos se muestra el mes actual.
  if (mesesConDatos.length === 0) {
    mesesConDatos.push(new Date().toISOString().slice(0, 7));
  }

  return NextResponse.json({ meses: mesesConDatos });
}
