import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow, deleteRows } from '../../../../lib/sheets';
import { findUsuario, tienePermisoInformesRRSS } from '../../../../lib/auth';
import { registrarAccion } from '../../../../lib/auditoria';

// GET /api/informes-rrss/piezas?mes=2026-08&solicitanteEmail=...
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get('mes');
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (!mes) return NextResponse.json({ error: 'Falta el mes' }, { status: 400 });

  try {
    const todas = await readSheet('RRSSPiezas');
    const piezas = todas.filter((p) => p.Mes === mes).sort((a, b) => new Date(b.FechaCreacion) - new Date(a.FechaCreacion));
    return NextResponse.json({ piezas });
  } catch (err) {
    console.error('Error cargando piezas RRSS:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando el contenido.' }, { status: 500 });
  }
}

// POST /api/informes-rrss/piezas -> crea una pieza de contenido nueva
// body: { mes, plataforma, tipo, titulo, views, likes, comments, saves, shares, guion, notaIA,
//         solicitanteEmail, solicitanteNombre }
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const titulo = (body.titulo || '').trim();
  if (!body.mes || !titulo) return NextResponse.json({ error: 'Falta el mes o el título' }, { status: 400 });

  await appendRow('RRSSPiezas', [
    body.mes, body.plataforma || '', body.tipo || '', titulo,
    body.views || '', body.likes || '', body.comments || '', body.saves || '', body.shares || '',
    body.guion || '', body.notaIA || '',
    body.solicitanteEmail, body.solicitanteNombre, new Date().toISOString()
  ]);

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Creó una pieza de contenido RRSS', `${titulo} — ${body.mes}`, ''
  );

  return NextResponse.json({ ok: true });
}

// PATCH /api/informes-rrss/piezas -> editar una pieza existente (por _rowIndex)
export async function PATCH(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const todas = await readSheet('RRSSPiezas');
  const fila = todas.find((p) => p._rowIndex === body.rowIndex);
  if (!fila) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await updateRow('RRSSPiezas', fila._rowIndex, [
    fila.Mes, body.plataforma ?? fila.Plataforma, body.tipo ?? fila.Tipo, body.titulo ?? fila.Titulo,
    body.views ?? fila.Views, body.likes ?? fila.Likes, body.comments ?? fila.Comments,
    body.saves ?? fila.Saves, body.shares ?? fila.Shares,
    body.guion ?? fila.Guion, body.notaIA ?? fila.NotaIA,
    fila.CreadoPorEmail, fila.CreadoPorNombre, fila.FechaCreacion
  ]);

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Editó una pieza de contenido RRSS', body.titulo || fila.Titulo, ''
  );

  return NextResponse.json({ ok: true });
}

// DELETE /api/informes-rrss/piezas -> { rowIndex, titulo, solicitanteEmail, solicitanteNombre }
export async function DELETE(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (!body.rowIndex) return NextResponse.json({ error: 'Falta indicar qué eliminar' }, { status: 400 });

  await deleteRows('RRSSPiezas', [body.rowIndex]);
  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Eliminó una pieza de contenido RRSS', body.titulo || '', ''
  );

  return NextResponse.json({ ok: true });
}
