import { NextResponse } from 'next/server';
import { readSheet, updateRow } from '../../../lib/sheets';
import { findUsuario, tienePermisoDiplomas } from '../../../lib/auth';
import { registrarAccion } from '../../../lib/auditoria';

// GET /api/diplomas?solicitanteEmail=... -> lista de inscritos con su estado de diploma
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoDiplomas(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const inscritos = await readSheet('Inscritos');
  return NextResponse.json({ inscritos });
}

// PATCH /api/diplomas -> togglea "abonó la totalidad" (solo Admin)
// body: { id, nuevoValor, solicitanteEmail, solicitanteNombre }
export async function PATCH(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoDiplomas(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const inscritos = await readSheet('Inscritos');
  const fila = inscritos.find((i) => i.ID === body.id);
  if (!fila) {
    return NextResponse.json({ error: 'Inscrito no encontrado' }, { status: 404 });
  }

  await updateRow('Inscritos', fila._rowIndex, [
    fila.ID, fila.LeadId, fila.NombreEstudiante, fila.EmailEstudiante, fila.Curso, fila.Edicion,
    fila.FechaInscripcion, fila.AltaPlataforma, fila.AltaPorEmail, fila.AltaPorNombre, fila.FechaAlta,
    fila.BienvenidaEnviada, fila.BienvenidaPorEmail, fila.BienvenidaPorNombre, fila.FechaBienvenida,
    body.nuevoValor ? 'TRUE' : 'FALSE',
    fila.Docentes
  ], 'A');

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    body.nuevoValor ? 'Marcó diploma (abonó la totalidad)' : 'Desmarcó diploma',
    fila.NombreEstudiante, fila.LeadId
  );

  return NextResponse.json({ ok: true });
}
