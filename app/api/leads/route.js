import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow } from '../../../lib/sheets';
import { findUsuario, tienePermisoOperativo } from '../../../lib/auth';
import { registrarAccion } from '../../../lib/auditoria';
import { HORAS_LOTE_1, DIAS_LOTE_3, DIAS_LOTE_4, DIAS_LOTE_5 } from '../../../lib/constants';

// GET /api/leads?solicitanteEmail=... -> todos los leads (para dashboard/seguimiento/reportes)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoOperativo(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const leads = await readSheet('Leads');
  return NextResponse.json({ leads });
}

// POST /api/leads -> crea un lead nuevo. El curso puede venir vacío (se completa después).
// body: { nombre, apellido, whatsapp, curso, cursosAdicionales, origen, cargadoPorEmail, cargadoPorNombre }
export async function POST(request) {
  const body = await request.json();
  const ahora = new Date();
  const fechaIngreso = ahora.toISOString();
  const leadId = `L-${ahora.getTime()}`;

  // Columnas Leads: ID, Nombre, Apellido, WhatsApp, Curso, CursosAdicionales, Origen, FechaIngreso,
  // CargadoPorEmail, CargadoPorNombre, Estado, FechaVenta, MedioPago, Modalidad, CantCuotas, ValorCuota,
  // MontoTotal, Edicion, EmailEstudiante, NotasInternas, InstagramUsuario, Docentes
  await appendRow('Leads', [
    leadId,
    body.nombre,
    body.apellido,
    body.whatsapp,
    body.curso || '',
    body.cursosAdicionales || '',
    body.origen,
    fechaIngreso,
    body.cargadoPorEmail,
    body.cargadoPorNombre,
    'Lead',
    '', '', '', '', '', '', '', '', '',
    body.instagram || '',
    ''
  ]);

  // Seguimiento: se crean de una las 3 etapas con tiempo (Lote 1, 2, 3). Lote 0 no se guarda como fila:
  // es simplemente "todos los leads", se calcula al vuelo desde la hoja Leads.
  // Columnas Seguimiento: LeadID, Lote, FechaVence, AsignadoAEmail, AsignadoANombre, Contactado, Resultado,
  // FechaContacto, Observaciones, ProximaAccion
  const vence1 = new Date(ahora.getTime() + HORAS_LOTE_1 * 60 * 60 * 1000).toISOString();
  const vence3 = new Date(ahora.getTime() + DIAS_LOTE_3 * 24 * 60 * 60 * 1000).toISOString();
  const vence4 = new Date(ahora.getTime() + DIAS_LOTE_4 * 24 * 60 * 60 * 1000).toISOString();
  const vence5 = new Date(ahora.getTime() + DIAS_LOTE_5 * 24 * 60 * 60 * 1000).toISOString();

  await appendRow('Seguimiento', [
    leadId, '1', vence1, body.cargadoPorEmail, body.cargadoPorNombre, 'FALSE', '', '', '', ''
  ]);
  // Lote 2 no se crea todavía: se genera dinámicamente cuando el Lote 1 se marca contactado sin conversión
  // (ver PATCH en /api/seguimiento). Lotes 3, 4 y 5 sí se pre-crean, "Sin asignación" (AsignadoA vacío).
  await appendRow('Seguimiento', [
    leadId, '3', vence3, '', '', 'FALSE', '', '', '', ''
  ]);
  await appendRow('Seguimiento', [
    leadId, '4', vence4, '', '', 'FALSE', '', '', '', ''
  ]);
  await appendRow('Seguimiento', [
    leadId, '5', vence5, '', '', 'FALSE', '', '', '', ''
  ]);

  await registrarAccion(
    body.cargadoPorEmail, body.cargadoPorNombre,
    'Creó un lead',
    `${body.nombre} ${body.apellido}${body.curso ? ' — ' + body.curso : ' (sin curso definido)'}`,
    leadId
  );

  return NextResponse.json({ ok: true, leadId });
}

// PATCH /api/leads -> editar curso / cursos adicionales de un lead ya cargado (ej: cuando no se sabía al principio)
// body: { leadId, curso, cursosAdicionales, solicitanteEmail, solicitanteNombre }
export async function PATCH(request) {
  const body = await request.json();
  const leads = await readSheet('Leads');
  const lead = leads.find((l) => l.ID === body.leadId);
  if (!lead) {
    return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
  }

  await updateRow('Leads', lead._rowIndex, [
    lead.ID, lead.Nombre, lead.Apellido, lead.WhatsApp,
    body.curso !== undefined ? body.curso : lead.Curso,
    body.cursosAdicionales !== undefined ? body.cursosAdicionales : lead.CursosAdicionales,
    lead.Origen, lead.FechaIngreso, lead.CargadoPorEmail, lead.CargadoPorNombre,
    lead.Estado, lead.FechaVenta, lead.MedioPago, lead.Modalidad, lead.CantCuotas, lead.ValorCuota,
    lead.MontoTotal, lead.Edicion, lead.EmailEstudiante,
    body.notasInternas !== undefined ? body.notasInternas : lead.NotasInternas,
    lead.InstagramUsuario,
    lead.Docentes
  ]);

  if (body.curso !== undefined || body.cursosAdicionales !== undefined) {
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      'Editó el curso de un lead',
      `${lead.Nombre} ${lead.Apellido} → ${body.curso || '(sin definir)'}`,
      lead.ID
    );
  }
  if (body.notasInternas !== undefined) {
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      'Editó las notas internas', `${lead.Nombre} ${lead.Apellido}`, lead.ID
    );
  }

  return NextResponse.json({ ok: true });
}
