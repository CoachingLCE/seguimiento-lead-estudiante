import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow } from '../../../lib/sheets';
import { findUsuario, tienePermisoOperativo } from '../../../lib/auth';
import { registrarAccion } from '../../../lib/auditoria';
import { DIAS_LOTE_2, RESULTADOS_FINALES } from '../../../lib/constants';

// GET /api/seguimiento?solicitanteEmail=... -> todas las filas de seguimiento (se cruza con Leads en el front)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoOperativo(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const seguimiento = await readSheet('Seguimiento');
  return NextResponse.json({ seguimiento });
}

// PATCH /api/seguimiento -> acciones posibles según body.accion
// 1) registrar contacto:  { accion: 'contactar', leadId, lote, resultado, observaciones, proximaAccion, fechaProgramada?, solicitanteEmail, solicitanteNombre }
// 2) reasignar lote:      { accion: 'reasignar', leadId, lote, nuevoEmail, nuevoNombre, solicitanteEmail, solicitanteNombre }
// 3) deshacer resultado:  { accion: 'deshacer', leadId, lote, solicitanteEmail, solicitanteNombre } — solo Admin/Coordinador
// 4) programar contacto:  { accion: 'programar', leadId, lote, fechaProgramada, solicitanteEmail, solicitanteNombre }
//    — fija "contactame el [fecha]" en una fila que sigue pendiente, sin marcarla como contactada.
// 5) dar de baja:         { accion: 'dar_baja', leadId, fechaBaja, motivo?, solicitanteEmail, solicitanteNombre }
//    — crea una fila nueva de seguimiento (Lote "baja") que vence a los 90 días de la fecha de baja.
// fechaProgramada: si alguien dijo "contactame el [fecha]", ese lead reaparece en el
// "Lote Programado" en Seguimiento apenas llega esa fecha, sin importar en qué lote numérico esté.
export async function PATCH(request) {
  const body = await request.json();

  // Dar de baja: crea una fila NUEVA de seguimiento (Lote "baja"), no actualiza una existente.
  // A los 90 días de la baja, ese lead aparece en el "LOTE BAJAS" para volver a contactarlo.
  if (body.accion === 'dar_baja') {
    const fechaBaja = new Date(body.fechaBaja || new Date().toISOString());
    const vence = new Date(fechaBaja.getTime() + 90 * 24 * 60 * 60 * 1000);
    vence.setHours(0, 0, 0, 0);
    await appendRow('Seguimiento', [
      body.leadId, 'baja', vence.toISOString(), '', '', 'FALSE', '',
      '', `Baja registrada el ${fechaBaja.toLocaleDateString('es-AR')}${body.motivo ? ` — Motivo: ${body.motivo}` : ''}`,
      '', '', ''
    ]);
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      'Registró una baja de la cursada', body.motivo || '', body.leadId
    );
    return NextResponse.json({ ok: true });
  }

  const seguimiento = await readSheet('Seguimiento');
  const fila = seguimiento.find((s) => s.LeadID === body.leadId && s.Lote === String(body.lote));
  if (!fila) {
    return NextResponse.json({ error: 'Registro de seguimiento no encontrado' }, { status: 404 });
  }

  if (body.accion === 'programar') {
    await updateRow('Seguimiento', fila._rowIndex, [
      fila.LeadID, fila.Lote, fila.FechaVence, fila.AsignadoAEmail, fila.AsignadoANombre,
      fila.Contactado, fila.Resultado, fila.FechaContacto, fila.Observaciones, fila.ProximaAccion,
      body.fechaProgramada || '', fila.ContactadoPorNombre
    ]);
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      `Programó contacto para el ${body.fechaProgramada}`,
      `Lote ${fila.Lote}${body.nombreLead ? ` — ${body.nombreLead}` : ''}${body.cursoLead ? ` (${body.cursoLead})` : ''}`,
      fila.LeadID
    );
    return NextResponse.json({ ok: true });
  }

  if (body.accion === 'reasignar') {
    const solicitante = await findUsuario(body.solicitanteEmail);
    const puedeReasignar =
      solicitante && (solicitante.roles.includes('Admin') || solicitante.roles.includes('Coordinador'));
    if (!puedeReasignar) {
      return NextResponse.json({ error: 'No autorizado para reasignar' }, { status: 403 });
    }
    await updateRow('Seguimiento', fila._rowIndex, [
      fila.LeadID, fila.Lote, fila.FechaVence, body.nuevoEmail, body.nuevoNombre,
      fila.Contactado, fila.Resultado, fila.FechaContacto, fila.Observaciones, fila.ProximaAccion, fila.FechaProgramada,
      fila.ContactadoPorNombre
    ]);
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      `Reasignó Lote ${fila.Lote}`,
      `A ${body.nuevoNombre}${body.nombreLead ? ` — ${body.nombreLead}` : ''}${body.cursoLead ? ` (${body.cursoLead})` : ''}`,
      fila.LeadID
    );
    return NextResponse.json({ ok: true });
  }

  if (body.accion === 'deshacer') {
    const solicitante = await findUsuario(body.solicitanteEmail);
    const puedeDeshacer =
      solicitante && (solicitante.roles.includes('Admin') || solicitante.roles.includes('Coordinador'));
    if (!puedeDeshacer) {
      return NextResponse.json({ error: 'No autorizado para deshacer un resultado' }, { status: 403 });
    }
    const resultadoAnterior = fila.Resultado;
    await updateRow('Seguimiento', fila._rowIndex, [
      fila.LeadID, fila.Lote, fila.FechaVence, fila.AsignadoAEmail, fila.AsignadoANombre,
      'FALSE', '', '', '', '', '', ''
    ]);
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      `Deshizo un resultado en Lote ${fila.Lote}`,
      `Resultado anterior: "${resultadoAnterior}"${body.nombreLead ? ` — ${body.nombreLead}` : ''}${body.cursoLead ? ` (${body.cursoLead})` : ''}`,
      fila.LeadID
    );
    return NextResponse.json({ ok: true });
  }

  if (body.accion === 'contactar') {
    const ahora = new Date();
    await updateRow('Seguimiento', fila._rowIndex, [
      fila.LeadID, fila.Lote, fila.FechaVence, fila.AsignadoAEmail, fila.AsignadoANombre,
      'TRUE', body.resultado, ahora.toISOString(),
      body.observaciones || '', body.proximaAccion || '', body.fechaProgramada || '',
      body.solicitanteNombre || fila.AsignadoANombre
    ]);

    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      `Registró contacto en Lote ${fila.Lote}`,
      `${body.resultado}${body.nombreLead ? ` — ${body.nombreLead}` : ''}${body.cursoLead ? ` (${body.cursoLead})` : ''}`,
      fila.LeadID
    );

    // Si fue el Lote 1 y el resultado no es definitivo, se genera el Lote 2 dinámicamente
    // (vence a los 10 días desde este contacto, no desde el ingreso del lead)
    if (fila.Lote === '1' && !RESULTADOS_FINALES.includes(body.resultado)) {
      const yaExisteLote2 = seguimiento.some((s) => s.LeadID === fila.LeadID && s.Lote === '2');
      if (!yaExisteLote2) {
        const vence2Fecha = new Date(ahora.getTime() + DIAS_LOTE_2 * 24 * 60 * 60 * 1000);
        vence2Fecha.setHours(0, 0, 0, 0);
        const vence2 = vence2Fecha.toISOString();
        await appendRow('Seguimiento', [
          fila.LeadID, '2', vence2, fila.AsignadoAEmail, fila.AsignadoANombre, 'FALSE', '', '', '', '', '', ''
        ]);
      }
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
}
