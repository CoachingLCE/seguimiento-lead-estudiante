import { NextResponse } from 'next/server';
import { readSheet, updateRow, deleteRows } from '../../../lib/sheets';
import { enviarMailBienvenidaEstudiante, enviarMailAltaPlataforma } from '../../../lib/mailer';
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
  const [inscritos, leads] = await Promise.all([readSheet('Inscritos'), readSheet('Leads')]);
  // Los registros creados automáticamente al cargar una baja de alguien que no existía en el
  // sistema (Origen "Carga manual (baja)") no son estudiantes reales — no deben aparecer acá.
  const idsCargaManualBaja = new Set(
    leads.filter((l) => l.Origen === 'Carga manual (baja)').map((l) => l.ID)
  );
  const inscritosFiltrados = inscritos.filter((i) => !idsCargaManualBaja.has(i.LeadId));
  return NextResponse.json({ inscritos: inscritosFiltrados });
}

// PATCH /api/inscritos -> acciones editables desde la tabla
// 1) togglear alta en plataforma: { accion: 'alta', id, nuevoValor, solicitanteEmail, solicitanteNombre }
// 2) enviar bienvenida:           { accion: 'bienvenida', id, email?, solicitanteEmail, solicitanteNombre }
// 3) checkbox simple (sin mail):  { accion: 'toggle', campo: 'ConfirmoRecepcion'|'GrupoWhatsApp', id, nuevoValor, solicitanteEmail, solicitanteNombre }
export async function PATCH(request) {
  const body = await request.json();
  const inscritos = await readSheet('Inscritos');
  const fila = inscritos.find((i) => i.ID === body.id);
  if (!fila) {
    return NextResponse.json({ error: 'Inscrito no encontrado' }, { status: 404 });
  }

  if (body.accion === 'toggle') {
    const CAMPOS_PERMITIDOS = { ConfirmoRecepcion: 'Confirmó recepción del mail de bienvenida', GrupoWhatsApp: 'Incorporación al grupo de WhatsApp' };
    if (!CAMPOS_PERMITIDOS[body.campo]) {
      return NextResponse.json({ error: 'Campo no permitido' }, { status: 400 });
    }
    const nuevoValor = !!body.nuevoValor;
    const actualizado = { ...fila, [body.campo]: nuevoValor ? 'TRUE' : 'FALSE' };
    await updateRow('Inscritos', fila._rowIndex, [
      actualizado.ID, actualizado.LeadId, actualizado.NombreEstudiante, actualizado.EmailEstudiante,
      actualizado.Curso, actualizado.Edicion, actualizado.FechaInscripcion,
      actualizado.AltaPlataforma, actualizado.AltaPorEmail, actualizado.AltaPorNombre, actualizado.FechaAlta,
      actualizado.BienvenidaEnviada, actualizado.BienvenidaPorEmail, actualizado.BienvenidaPorNombre, actualizado.FechaBienvenida,
      actualizado.AbonoTotalidad, actualizado.Docentes, actualizado.ConfirmoRecepcion, actualizado.GrupoWhatsApp
    ]);
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      `${nuevoValor ? 'Marcó' : 'Desmarcó'}: ${CAMPOS_PERMITIDOS[body.campo]}`, fila.NombreEstudiante, fila.LeadId
    );
    return NextResponse.json({ ok: true });
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
      fila.Docentes, fila.ConfirmoRecepcion, fila.GrupoWhatsApp
    ]);
    if (nuevoValor && fila.EmailEstudiante) {
      try {
        await enviarMailAltaPlataforma(fila.EmailEstudiante, fila.NombreEstudiante, fila.Curso, fila.Edicion, fila.ID);
      } catch (err) {
        // El alta ya quedó guardada — si falla el mail, no se rompe la acción principal.
        console.error('Error enviando mail de alta en plataforma:', err);
      }
    }
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
      await enviarMailBienvenidaEstudiante(email, fila.NombreEstudiante, fila.ID);
    } catch (err) {
      return NextResponse.json({ error: 'No se pudo enviar el mail' }, { status: 500 });
    }
    const ahora = new Date().toISOString();
    await updateRow('Inscritos', fila._rowIndex, [
      fila.ID, fila.LeadId, fila.NombreEstudiante, email, fila.Curso, fila.Edicion,
      fila.FechaInscripcion, fila.AltaPlataforma, fila.AltaPorEmail, fila.AltaPorNombre, fila.FechaAlta,
      'TRUE', body.solicitanteEmail, body.solicitanteNombre, ahora, fila.AbonoTotalidad,
      fila.Docentes, fila.ConfirmoRecepcion, fila.GrupoWhatsApp
    ]);
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      'Envió la bienvenida', fila.NombreEstudiante, fila.LeadId
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
}

// DELETE /api/inscritos -> elimina un estudiante por completo: la fila de Inscritos,
// el Lead/venta asociado, y su Seguimiento — todo junto, porque si solo se borra el
// Inscrito y el Lead sigue en Estado "Comprado", el cron lo vuelve a generar solo al otro día.
// Solo Admin. body: { inscritoId, solicitanteEmail, solicitanteNombre }
export async function DELETE(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!solicitante || !solicitante.roles.includes('Admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const [inscritos, leads, seguimiento] = await Promise.all([
    readSheet('Inscritos'), readSheet('Leads'), readSheet('Seguimiento')
  ]);
  const inscrito = inscritos.find((i) => i.ID === body.inscritoId);
  if (!inscrito) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
  }
  const lead = leads.find((l) => l.ID === inscrito.LeadId);
  const filasSeguimiento = seguimiento.filter((s) => s.LeadID === inscrito.LeadId);

  await deleteRows('Inscritos', [inscrito._rowIndex]);
  if (lead) await deleteRows('Leads', [lead._rowIndex]);
  if (filasSeguimiento.length > 0) await deleteRows('Seguimiento', filasSeguimiento.map((s) => s._rowIndex));

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Eliminó un estudiante (junto con su lead/venta)',
    `${inscrito.NombreEstudiante} — ${inscrito.Curso || 'sin curso'}`
  );

  return NextResponse.json({ ok: true });
}
