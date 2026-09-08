import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow, deleteRows } from '../../../../lib/sheets';
import { findUsuario, tienePermisoInformesRRSS } from '../../../../lib/auth';
import { registrarAccion } from '../../../../lib/auditoria';

// Objetivos del mes — a propósito muy simple: una lista de líneas de texto con un check de
// cumplido, nada de metas numéricas complejas ni seguimiento automático.

// GET /api/informes-rrss/objetivos?mes=2026-08&solicitanteEmail=...
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get('mes');
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (!mes) return NextResponse.json({ error: 'Falta el mes' }, { status: 400 });

  try {
    const todos = await readSheet('RRSSObjetivos');
    const objetivos = todos.filter((o) => o.Mes === mes);
    return NextResponse.json({ objetivos });
  } catch (err) {
    console.error('Error cargando objetivos RRSS:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando los objetivos.' }, { status: 500 });
  }
}

// POST /api/informes-rrss/objetivos -> agrega un objetivo nuevo
// body: { mes, texto, solicitanteEmail, solicitanteNombre }
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No tenés permisos para realizar esta acción.' }, { status: 403 });
  }
  const texto = (body.texto || '').trim();
  if (!body.mes || !texto) return NextResponse.json({ error: 'Falta el mes o el texto del objetivo.' }, { status: 400 });

  try {
    await appendRow('RRSSObjetivos', [body.mes, texto, 'FALSE', body.solicitanteEmail, body.solicitanteNombre, new Date().toISOString()]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error creando objetivo RRSS:', err);
    return NextResponse.json({ error: 'No se pudo guardar. Probá de nuevo.' }, { status: 500 });
  }
}

// PATCH /api/informes-rrss/objetivos -> marcar/desmarcar cumplido
// body: { rowIndex, cumplido, solicitanteEmail, solicitanteNombre }
export async function PATCH(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No tenés permisos para realizar esta acción.' }, { status: 403 });
  }
  if (!body.rowIndex) return NextResponse.json({ error: 'Falta indicar qué objetivo.' }, { status: 400 });

  try {
    const todos = await readSheet('RRSSObjetivos');
    const fila = todos.find((o) => o._rowIndex === body.rowIndex);
    if (!fila) return NextResponse.json({ error: 'No se encontró ese objetivo.' }, { status: 404 });

    await updateRow('RRSSObjetivos', fila._rowIndex, [
      fila.Mes, fila.Texto, body.cumplido ? 'TRUE' : 'FALSE', fila.ActualizadoPorEmail, fila.ActualizadoPorNombre, fila.FechaActualizacion
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error actualizando objetivo RRSS:', err);
    return NextResponse.json({ error: 'No se pudo guardar. Probá de nuevo.' }, { status: 500 });
  }
}

// DELETE /api/informes-rrss/objetivos -> { rowIndex, solicitanteEmail, solicitanteNombre }
export async function DELETE(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No tenés permisos para realizar esta acción.' }, { status: 403 });
  }
  if (!body.rowIndex) return NextResponse.json({ error: 'Falta indicar qué eliminar.' }, { status: 400 });

  try {
    await deleteRows('RRSSObjetivos', [body.rowIndex]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error eliminando objetivo RRSS:', err);
    return NextResponse.json({ error: 'No se pudo eliminar. Probá de nuevo.' }, { status: 500 });
  }
}
