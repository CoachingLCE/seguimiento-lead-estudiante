import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow, deleteRows } from '../../../lib/sheets';
import { findUsuario, tienePermisoMensajesVer, tienePermisoMensajesEscribir } from '../../../lib/auth';
import { registrarAccion } from '../../../lib/auditoria';

// GET /api/mensajes-frecuentes?solicitanteEmail=...
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoMensajesVer(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const mensajes = await readSheet('MensajesFrecuentes');
    // Más nuevo primero
    mensajes.sort((a, b) => new Date(b.FechaCreacion) - new Date(a.FechaCreacion));
    return NextResponse.json({ mensajes });
  } catch (err) {
    console.error('Error cargando mensajes frecuentes:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando los mensajes.' }, { status: 500 });
  }
}

// POST /api/mensajes-frecuentes -> crear un mensaje nuevo
// body: { titulo, mensaje, solicitanteEmail, solicitanteNombre }
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoMensajesEscribir(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const titulo = (body.titulo || '').trim();
  const mensaje = (body.mensaje || '').trim();
  if (!titulo || !mensaje) return NextResponse.json({ error: 'Falta el título o el mensaje' }, { status: 400 });

  await appendRow('MensajesFrecuentes', [
    titulo, mensaje, body.solicitanteEmail, body.solicitanteNombre, new Date().toISOString()
  ]);

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Creó un mensaje frecuente', titulo, ''
  );

  return NextResponse.json({ ok: true });
}

// PATCH /api/mensajes-frecuentes -> editar un mensaje existente (por _rowIndex)
// body: { rowIndex, titulo, mensaje, solicitanteEmail, solicitanteNombre }
export async function PATCH(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoMensajesEscribir(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const mensajes = await readSheet('MensajesFrecuentes');
  const fila = mensajes.find((m) => m._rowIndex === body.rowIndex);
  if (!fila) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await updateRow('MensajesFrecuentes', fila._rowIndex, [
    body.titulo ?? fila.Titulo, body.mensaje ?? fila.Mensaje,
    fila.CreadoPorEmail, fila.CreadoPorNombre, fila.FechaCreacion
  ]);

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Editó un mensaje frecuente', body.titulo || fila.Titulo, ''
  );

  return NextResponse.json({ ok: true });
}

// DELETE /api/mensajes-frecuentes -> { rowIndex, solicitanteEmail, solicitanteNombre }
export async function DELETE(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoMensajesEscribir(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  if (!body.rowIndex) return NextResponse.json({ error: 'Falta indicar qué eliminar' }, { status: 400 });

  await deleteRows('MensajesFrecuentes', [body.rowIndex]);
  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Eliminó un mensaje frecuente', body.titulo || '', ''
  );

  return NextResponse.json({ ok: true });
}
