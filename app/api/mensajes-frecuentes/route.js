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
    // Se ordena por "Orden" (lo que Macarena definió arrastrando) — los que todavía no tienen
    // un Orden asignado (mensajes viejos, antes de esta función) quedan al final, más nuevo primero.
    mensajes.sort((a, b) => {
      const ordenA = a.Orden !== '' && a.Orden != null ? Number(a.Orden) : null;
      const ordenB = b.Orden !== '' && b.Orden != null ? Number(b.Orden) : null;
      if (ordenA !== null && ordenB !== null) return ordenA - ordenB;
      if (ordenA !== null) return -1;
      if (ordenB !== null) return 1;
      return new Date(b.FechaCreacion) - new Date(a.FechaCreacion);
    });
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

  const existentes = await readSheet('MensajesFrecuentes');
  const maxOrden = existentes.reduce((acc, m) => Math.max(acc, Number(m.Orden) || 0), 0);

  await appendRow('MensajesFrecuentes', [
    titulo, mensaje, body.solicitanteEmail, body.solicitanteNombre, new Date().toISOString(), maxOrden + 1
  ]);

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Creó un mensaje frecuente', titulo, ''
  );

  return NextResponse.json({ ok: true });
}

// PATCH /api/mensajes-frecuentes -> dos usos:
// 1) Editar un mensaje existente: { rowIndex, titulo, mensaje, solicitanteEmail, solicitanteNombre }
// 2) Reordenar (arrastrar y soltar): { accion: 'reordenar', ordenes: [{rowIndex, orden}], solicitanteEmail, solicitanteNombre }
export async function PATCH(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoMensajesEscribir(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  if (body.accion === 'reordenar') {
    if (!Array.isArray(body.ordenes)) return NextResponse.json({ error: 'Falta el nuevo orden' }, { status: 400 });
    const mensajes = await readSheet('MensajesFrecuentes');
    for (const { rowIndex, orden } of body.ordenes) {
      const fila = mensajes.find((m) => m._rowIndex === rowIndex);
      if (!fila) continue;
      await updateRow('MensajesFrecuentes', fila._rowIndex, [
        fila.Titulo, fila.Mensaje, fila.CreadoPorEmail, fila.CreadoPorNombre, fila.FechaCreacion, orden
      ]);
    }
    return NextResponse.json({ ok: true });
  }

  const mensajes = await readSheet('MensajesFrecuentes');
  const fila = mensajes.find((m) => m._rowIndex === body.rowIndex);
  if (!fila) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await updateRow('MensajesFrecuentes', fila._rowIndex, [
    body.titulo ?? fila.Titulo, body.mensaje ?? fila.Mensaje,
    fila.CreadoPorEmail, fila.CreadoPorNombre, fila.FechaCreacion, fila.Orden
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
