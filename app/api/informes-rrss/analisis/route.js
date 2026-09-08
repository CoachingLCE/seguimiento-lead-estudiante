import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow } from '../../../../lib/sheets';
import { findUsuario, tienePermisoInformesRRSS } from '../../../../lib/auth';
import { registrarAccion } from '../../../../lib/auditoria';

// GET /api/informes-rrss/analisis?mes=2026-08&solicitanteEmail=...
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get('mes');
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (!mes) return NextResponse.json({ error: 'Falta el mes' }, { status: 400 });

  try {
    const todos = await readSheet('RRSSAnalisis');
    const fila = todos.find((a) => a.Mes === mes);
    const analisis = fila ? {
      resumen: fila.Resumen || '', causas: fila.Causas || '', propuestas: fila.Propuestas || '',
      actualizadoPorNombre: fila.ActualizadoPorNombre || '', fechaActualizacion: fila.FechaActualizacion || ''
    } : null;
    return NextResponse.json({ analisis });
  } catch (err) {
    console.error('Error cargando análisis RRSS:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando el análisis.' }, { status: 500 });
  }
}

// POST /api/informes-rrss/analisis -> crea o actualiza el análisis de un mes
// body: { mes, resumen, causas, propuestas, solicitanteEmail, solicitanteNombre }
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (!body.mes) return NextResponse.json({ error: 'Falta el mes' }, { status: 400 });

  const ahora = new Date().toISOString();
  const fila = [body.mes, body.resumen || '', body.causas || '', body.propuestas || '', body.solicitanteEmail, body.solicitanteNombre, ahora];

  const todos = await readSheet('RRSSAnalisis');
  const existente = todos.find((a) => a.Mes === body.mes);
  if (existente) {
    await updateRow('RRSSAnalisis', existente._rowIndex, fila);
  } else {
    await appendRow('RRSSAnalisis', fila);
  }

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Actualizó el análisis mensual de RRSS', body.mes, ''
  );

  return NextResponse.json({ ok: true });
}
