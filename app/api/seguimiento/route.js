import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow } from '../../../lib/sheets';
import { findUsuario, tienePermisoOperativo } from '../../../lib/auth';
import { registrarAccion } from '../../../lib/auditoria';
import { HORAS_LOTE_1, DIAS_LOTE_2, DIAS_LOTE_3, DIAS_LOTE_4, DIAS_LOTE_5, DIAS_LOTE_6, RESULTADOS_FINALES } from '../../../lib/constants';
import { cicloDe } from '../../../lib/seguimientoCiclos';

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
// 6) nuevo ciclo:         { accion: 'nuevo_ciclo', leadId, solicitanteEmail, solicitanteNombre, nombreLead?, cursoLead? }
//    — "Nuevo seguimiento comercial": para un lead que ya recorrió todo su camino de Seguimiento
//    (quedó resuelto o se le acabaron los lotes) y volvió a escribir. Crea un Lote 1/3/4/5/6 nuevo,
//    en un "Ciclo" más alto que el anterior, sin tocar ni borrar las filas del ciclo viejo — quedan
//    como historial en la ficha del lead. Solo Admin/Coordinador. Ver lib/seguimientoCiclos.js.
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
      '', '', '', '', ''
    ]);
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      'Registró una baja de la cursada', body.motivo || '', body.leadId
    );
    return NextResponse.json({ ok: true });
  }

  if (body.accion === 'nuevo_ciclo') {
    const solicitante = await findUsuario(body.solicitanteEmail);
    const puedeIniciar =
      solicitante && (solicitante.roles.includes('Admin') || solicitante.roles.includes('Coordinador'));
    if (!puedeIniciar) {
      return NextResponse.json({ error: 'No autorizado para iniciar un nuevo seguimiento comercial' }, { status: 403 });
    }
    const todasLasFilas = await readSheet('Seguimiento');
    const filasDelLead = todasLasFilas.filter((s) => s.LeadID === body.leadId && s.Lote !== 'baja');
    const cicloActual = filasDelLead.reduce((max, s) => Math.max(max, cicloDe(s)), 1);
    const nuevoCiclo = cicloActual + 1;

    const ahora = new Date();
    function inicioDelDiaMasHoras(horas) {
      const f = new Date(ahora.getTime() + horas * 60 * 60 * 1000);
      f.setHours(0, 0, 0, 0);
      return f.toISOString();
    }
    const vence1 = inicioDelDiaMasHoras(HORAS_LOTE_1);
    const vence3 = inicioDelDiaMasHoras(DIAS_LOTE_3 * 24);
    const vence4 = inicioDelDiaMasHoras(DIAS_LOTE_4 * 24);
    const vence5 = inicioDelDiaMasHoras(DIAS_LOTE_5 * 24);
    const vence6 = inicioDelDiaMasHoras(DIAS_LOTE_6 * 24);
    // Igual que al crear un lead: Lote 2 no se pre-crea, se genera solo cuando el Lote 1 de este
    // ciclo se marque contactado sin un resultado definitivo (ver más abajo).
    await appendRow('Seguimiento', [
      body.leadId, '1', vence1, body.solicitanteEmail, body.solicitanteNombre, 'FALSE', '', '', '', '', '', '', '', '', String(nuevoCiclo)
    ]);
    await appendRow('Seguimiento', [body.leadId, '3', vence3, '', '', 'FALSE', '', '', '', '', '', '', '', '', String(nuevoCiclo)]);
    await appendRow('Seguimiento', [body.leadId, '4', vence4, '', '', 'FALSE', '', '', '', '', '', '', '', '', String(nuevoCiclo)]);
    await appendRow('Seguimiento', [body.leadId, '5', vence5, '', '', 'FALSE', '', '', '', '', '', '', '', '', String(nuevoCiclo)]);
    await appendRow('Seguimiento', [body.leadId, '6', vence6, '', '', 'FALSE', '', '', '', '', '', '', '', '', String(nuevoCiclo)]);

    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      `Inició un nuevo seguimiento comercial (ciclo ${nuevoCiclo})`,
      `${body.nombreLead || ''}${body.cursoLead ? ` (${body.cursoLead})` : ''}`.trim() || `Ciclo anterior: ${cicloActual}`,
      body.leadId
    );
    return NextResponse.json({ ok: true, ciclo: nuevoCiclo });
  }

  const seguimiento = await readSheet('Seguimiento');
  // Si el pedido indica un ciclo puntual (lo normal: el front manda el Ciclo de la fila sobre la
  // que está actuando), hay que matchearlo también — no solo LeadID+Lote — porque un lead con más
  // de un "Nuevo seguimiento comercial" puede tener varias filas con el mismo número de Lote, una
  // por ciclo. Si no viene ciclo (clientes viejos en caché), se cae al comportamiento anterior:
  // toma la primera fila que matchee por LeadID+Lote.
  const cicloPedido = body.ciclo !== undefined && body.ciclo !== null && body.ciclo !== ''
    ? cicloDe({ Ciclo: body.ciclo }) : null;
  const fila = seguimiento.find((s) =>
    s.LeadID === body.leadId && s.Lote === String(body.lote) && (cicloPedido === null || cicloDe(s) === cicloPedido)
  );
  if (!fila) {
    return NextResponse.json({ error: 'Registro de seguimiento no encontrado' }, { status: 404 });
  }

  if (body.accion === 'programar') {
    await updateRow('Seguimiento', fila._rowIndex, [
      fila.LeadID, fila.Lote, fila.FechaVence, fila.AsignadoAEmail, fila.AsignadoANombre,
      fila.Contactado, fila.Resultado, fila.FechaContacto, fila.Observaciones, fila.ProximaAccion,
      body.fechaProgramada || '', fila.ContactadoPorNombre, fila.MensajeReactivacionEnviado || '', fila.ConfirmoRecepcionBaja || '', fila.Ciclo || ''
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
      fila.ContactadoPorNombre, fila.MensajeReactivacionEnviado || '', fila.ConfirmoRecepcionBaja || '', fila.Ciclo || ''
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
      'FALSE', '', '', '', '', '', fila.ContactadoPorNombre, fila.MensajeReactivacionEnviado || '', fila.ConfirmoRecepcionBaja || '', fila.Ciclo || ''
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
      body.solicitanteNombre || fila.AsignadoANombre, fila.MensajeReactivacionEnviado || '', fila.ConfirmoRecepcionBaja || '', fila.Ciclo || ''
    ]);

    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      `Registró contacto en Lote ${fila.Lote}`,
      `${body.resultado}${body.nombreLead ? ` — ${body.nombreLead}` : ''}${body.cursoLead ? ` (${body.cursoLead})` : ''}`,
      fila.LeadID
    );

    // Si fue el Lote 1 y el resultado no es definitivo, se genera el Lote 2 dinámicamente
    // (vence a los 10 días desde este contacto, no desde el ingreso del lead). Tiene que ser del
    // MISMO ciclo que esta fila de Lote 1 — si no, un lead que ya tuvo un "Nuevo seguimiento
    // comercial" antes (con su propio Lote 2 del ciclo viejo) nunca generaría el Lote 2 del ciclo
    // nuevo, porque "yaExisteLote2" lo encontraría en el ciclo equivocado.
    if (fila.Lote === '1' && !RESULTADOS_FINALES.includes(body.resultado)) {
      const yaExisteLote2 = seguimiento.some((s) => s.LeadID === fila.LeadID && s.Lote === '2' && cicloDe(s) === cicloDe(fila));
      if (!yaExisteLote2) {
        const vence2Fecha = new Date(ahora.getTime() + DIAS_LOTE_2 * 24 * 60 * 60 * 1000);
        vence2Fecha.setHours(0, 0, 0, 0);
        const vence2 = vence2Fecha.toISOString();
        await appendRow('Seguimiento', [
          fila.LeadID, '2', vence2, fila.AsignadoAEmail, fila.AsignadoANombre, 'FALSE', '', '', '', '', '', '', '', '', fila.Ciclo || ''
        ]);
      }
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
}
