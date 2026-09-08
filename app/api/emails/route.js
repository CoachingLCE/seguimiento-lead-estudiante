import { NextResponse } from 'next/server';
import { readSheet } from '../../../lib/sheets';
import { findUsuario, tienePermisoEmails } from '../../../lib/auth';

// GET /api/emails?solicitanteEmail=... -> historial de mails automáticos enviados por el sistema
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoEmails(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const filas = await readSheet('Emails');
    const emails = filas
      .filter((f) => f.Fecha)
      .map((f) => ({ fecha: f.Fecha, tipo: f.Tipo, para: f.Para, asunto: f.Asunto, estado: f.Estado, detalle: f.Detalle }))
      .reverse();
    return NextResponse.json({ emails });
  } catch (err) {
    console.error('Error cargando el registro de emails:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando el registro.' }, { status: 500 });
  }
}
