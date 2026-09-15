import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow, deleteRows } from '../../../../lib/sheets';
import { findUsuario, tienePermisoInformesRRSS } from '../../../../lib/auth';
import { registrarAccion } from '../../../../lib/auditoria';

function nuevoPiezaId() {
  return `PZ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Encuentra una pieza por su PiezaID (ideal) o, si es una pieza vieja sin ID todavía, por su
// _rowIndex (compatibilidad hacia atrás con lo que ya estaba cargado antes de este cambio).
function encontrarPieza(todas, { piezaId, rowIndex }) {
  if (piezaId) return todas.find((p) => p.PiezaID === piezaId);
  if (rowIndex) return todas.find((p) => p._rowIndex === rowIndex);
  return null;
}

const CAMPOS_ENTERO_PIEZA = ['views', 'likes', 'comments', 'saves', 'shares', 'leads'];
function validarPieza(body) {
  for (const campo of CAMPOS_ENTERO_PIEZA) {
    const v = body[campo];
    if (v === '' || v === undefined || v === null) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      return `El campo "${campo}" tiene que ser un número entero de 0 para arriba.`;
    }
  }
  return null;
}

// GET /api/informes-rrss/piezas?mes=2026-08&solicitanteEmail=...
// GET /api/informes-rrss/piezas?desde=2026-01&hasta=2026-12&solicitanteEmail=... (rango, para el
// Informe anual y el ranking de rendimiento por tipo de contenido en todo el año)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get('mes');
  const desde = searchParams.get('desde');
  const hasta = searchParams.get('hasta');
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (!mes && !(desde && hasta)) return NextResponse.json({ error: 'Falta el mes (o el rango desde/hasta)' }, { status: 400 });

  try {
    const todas = await readSheet('RRSSPiezas');
    const piezas = (mes ? todas.filter((p) => p.Mes === mes) : todas.filter((p) => p.Mes >= desde && p.Mes <= hasta))
      .sort((a, b) => new Date(b.FechaCreacion) - new Date(a.FechaCreacion));
    return NextResponse.json({ piezas });
  } catch (err) {
    console.error('Error cargando piezas RRSS:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando el contenido.' }, { status: 500 });
  }
}

// POST /api/informes-rrss/piezas -> crea una pieza de contenido nueva (con PiezaID propio)
// body: { mes, plataforma, tipo, titulo, views, likes, comments, saves, shares, guion, notaIA,
//         solicitanteEmail, solicitanteNombre }
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No tenés permisos para realizar esta acción.' }, { status: 403 });
  }
  const titulo = (body.titulo || '').trim();
  if (!body.mes || !titulo) return NextResponse.json({ error: 'Falta el mes o el título.' }, { status: 400 });

  const errorValidacion = validarPieza(body);
  if (errorValidacion) return NextResponse.json({ error: errorValidacion }, { status: 400 });

  try {
    const piezaId = nuevoPiezaId();
    await appendRow('RRSSPiezas', [
      body.mes, body.plataforma || '', body.tipo || '', titulo,
      body.views ?? '', body.likes ?? '', body.comments ?? '', body.saves ?? '', body.shares ?? '',
      body.guion ?? '', body.notaIA ?? '',
      body.solicitanteEmail, body.solicitanteNombre, new Date().toISOString(), piezaId,
      body.leads ?? ''
    ]);

    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      'Creó una pieza de contenido RRSS', `${titulo} — ${body.mes}`, ''
    );

    return NextResponse.json({ ok: true, piezaId });
  } catch (err) {
    console.error('Error creando pieza RRSS:', err);
    return NextResponse.json({ error: 'No se pudo guardar. Probá de nuevo.' }, { status: 500 });
  }
}

// PATCH /api/informes-rrss/piezas -> editar una pieza existente (por piezaId, o rowIndex si es vieja)
export async function PATCH(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No tenés permisos para realizar esta acción.' }, { status: 403 });
  }
  const titulo = (body.titulo || '').trim();
  if (!titulo) return NextResponse.json({ error: 'Falta el título.' }, { status: 400 });

  const errorValidacion = validarPieza(body);
  if (errorValidacion) return NextResponse.json({ error: errorValidacion }, { status: 400 });

  try {
    const todas = await readSheet('RRSSPiezas');
    const fila = encontrarPieza(todas, body);
    if (!fila) return NextResponse.json({ error: 'No se encontró esa pieza — puede que ya haya sido eliminada.' }, { status: 404 });

    await updateRow('RRSSPiezas', fila._rowIndex, [
      fila.Mes, body.plataforma ?? fila.Plataforma, body.tipo ?? fila.Tipo, titulo,
      body.views ?? fila.Views, body.likes ?? fila.Likes, body.comments ?? fila.Comments,
      body.saves ?? fila.Saves, body.shares ?? fila.Shares,
      body.guion ?? fila.Guion, body.notaIA ?? fila.NotaIA,
      fila.CreadoPorEmail, fila.CreadoPorNombre, fila.FechaCreacion,
      fila.PiezaID || nuevoPiezaId(), // si era una pieza vieja sin ID, se le asigna uno recién ahora
      body.leads ?? fila.Leads ?? ''
    ]);

    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      'Editó una pieza de contenido RRSS', titulo, ''
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error editando pieza RRSS:', err);
    return NextResponse.json({ error: 'No se pudo guardar. Probá de nuevo.' }, { status: 500 });
  }
}

// DELETE /api/informes-rrss/piezas -> { piezaId (o rowIndex), titulo, solicitanteEmail, solicitanteNombre }
export async function DELETE(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No tenés permisos para realizar esta acción.' }, { status: 403 });
  }
  if (!body.piezaId && !body.rowIndex) return NextResponse.json({ error: 'Falta indicar qué eliminar.' }, { status: 400 });

  try {
    const todas = await readSheet('RRSSPiezas');
    const fila = encontrarPieza(todas, body);
    if (!fila) return NextResponse.json({ error: 'No se encontró esa pieza — puede que ya haya sido eliminada.' }, { status: 404 });

    await deleteRows('RRSSPiezas', [fila._rowIndex]);
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      'Eliminó una pieza de contenido RRSS', body.titulo || fila.Titulo || '', ''
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error eliminando pieza RRSS:', err);
    return NextResponse.json({ error: 'No se pudo eliminar. Probá de nuevo.' }, { status: 500 });
  }
}
