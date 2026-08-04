import { NextResponse } from 'next/server';
import { readSheet, updateRow } from '../../../lib/sheets';
import { enviarMailBienvenidaEstudiante } from '../../../lib/mailer';
// NOTA: enviarMailAltaPlataforma existe en lib/mailer.js lista para usarse — Diego pidió
// no enviarla todavía (por ahora), solo dejar activo el mail de Bienvenida.
import { findUsuario, tienePermisoEstudiantes } from '../../../lib/auth';
import { registrarAccion } from '../../../lib/auditoria';

// GET /api/inscritos?solicitanteEmail=... -> lista completa de inscritos
// (se generan solos 24hs después de la venta — ver /api/cron/generar-estudiantes)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoEstudiantes(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const inscritos = await readSheet('Inscritos');
  return NextResponse.json({ inscritos });
}

// PATCH /api/inscritos -> dos acciones, ambas editables desde la tabla
// 1) togglear alta en plataforma: { accion: 'alta', id, nuevoValor, solicitanteEmail, solicitanteNombre }
// 2) enviar bienvenida:           { accion: 'bienvenida', id, email?, solicitanteEmail, solicitanteNombre }
export async function PATCH(request) {
  const body = await request.json();
  const inscritos = await readSheet('Inscritos');
  const fila = inscritos.find((i) => i.ID === body.id);
  if (!fila) {
    return NextResponse.json({ error: 'Inscrito no encontrado' }, { status: 404 });
  }

  if (body.accion === 'alta') {
    const ahora = new Date().toISOString();
    const nuevoValor = !!body.nuevoValor;
    await updateRow('Inscritos', fila._rowIndex, [
      fila.ID, fila.LeadId, fila.NombreEstudiante, fila.EmailEstudiante, fila.Curso, fila.Edicion,
      fila.FechaInscripcion,
      nuevoValor ? 'TRUE' : 'FALSE',
      nuevoValor ? body.solicitanteEmail : '',
      nuevoValor ? body.solicitanteNombre : '',
      nuevoValor ? ahora : '',
      fila.BienvenidaEnviada, fila.BienvenidaPorEmail, fila.BienvenidaPorNombre, fila.FechaBienvenida,
      fila.AbonoTotalidad,
      fila.Docentes
    ]);
    // Desactivado por ahora a pedido de Diego — descomentar cuando se quiera activar este mail.
    // if (nuevoValor && fila.EmailEstudiante) {
    //   try {
    //     await enviarMailAltaPlataforma(fila.EmailEstudiante, fila.NombreEstudiante, fila.Curso);
    //   } catch (err) {
    //     console.error('Error enviando mail de alta en plataforma:', err);
    //   }
    // }
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      nuevoValor ? 'Realizó el alta en plataforma' : 'Desmarcó el alta en plataforma',
      fila.NombreEstudiante, fila.LeadId
    );
    return NextResponse.json({ ok: true });
  }

  if (body.accion === 'bienvenida') {
    const email = body.email || fila.EmailEstudiante;
    if (!email) {
      return NextResponse.json({ error: 'Falta el email del estudiante' }, { status: 400 });
    }
    try {
      await enviarMailBienvenidaEstudiante(email, fila.NombreEstudiante);
    } catch (err) {
      return NextResponse.json({ error: 'No se pudo enviar el mail' }, { status: 500 });
    }
    const ahora = new Date().toISOString();
    await updateRow('Inscritos', fila._rowIndex, [
      fila.ID, fila.LeadId, fila.NombreEstudiante, email, fila.Curso, fila.Edicion,
      fila.FechaInscripcion, fila.AltaPlataforma, fila.AltaPorEmail, fila.AltaPorNombre, fila.FechaAlta,
      'TRUE', body.solicitanteEmail, body.solicitanteNombre, ahora, fila.AbonoTotalidad,
      fila.Docentes
    ]);
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      'Envió la bienvenida', fila.NombreEstudiante, fila.LeadId
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
}
