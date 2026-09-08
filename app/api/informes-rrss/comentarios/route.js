import { NextResponse } from 'next/server';
import { readSheet, appendRow } from '../../../../lib/sheets';
import { findUsuario, tienePermisoInformesRRSS } from '../../../../lib/auth';
import { registrarAccion } from '../../../../lib/auditoria';

// GET /api/informes-rrss/comentarios?mes=2026-08&solicitanteEmail=...
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get('mes');
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (!mes) return NextResponse.json({ error: 'Falta el mes' }, { status: 400 });

  try {
    const todos = await readSheet('RRSSComentarios');
    const comentarios = todos.filter((c) => c.Mes === mes).sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));
    return NextResponse.json({ comentarios });
  } catch (err) {
    console.error('Error cargando comentarios RRSS:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando los comentarios.' }, { status: 500 });
  }
}

// POST /api/informes-rrss/comentarios -> agrega un comentario (y lo deja en Auditoría)
// body: { mes, texto, solicitanteEmail, solicitanteNombre }
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No tenés permisos para realizar esta acción.' }, { status: 403 });
  }
  const texto = (body.texto || '').trim();
  if (!body.mes || !texto) return NextResponse.json({ error: 'Falta el mes o el texto.' }, { status: 400 });

  try {
    await appendRow('RRSSComentarios', [body.mes, body.solicitanteEmail, body.solicitanteNombre, texto, new Date().toISOString()]);

    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      'Comentó en Informes RRSS', `${body.mes} — ${texto.slice(0, 80)}${texto.length > 80 ? '…' : ''}`, ''
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error guardando comentario RRSS:', err);
    return NextResponse.json({ error: 'No se pudo enviar el comentario. Probá de nuevo.' }, { status: 500 });
  }
}
