import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow } from '../../../lib/sheets';
import { findUsuario, tienePermisoOperativo, tienePermisoCrearLeads, tienePermisoEditarLead } from '../../../lib/auth';
import { registrarAccion } from '../../../lib/auditoria';
import { HORAS_LOTE_1, DIAS_LOTE_3, DIAS_LOTE_4, DIAS_LOTE_5 } from '../../../lib/constants';

// Mapea el nombre de campo que manda el front al nombre real de columna en la hoja Leads,
// más una etiqueta legible para el historial de auditoría.
const CAMPOS_EDITABLES = {
  nombre: { columna: 'Nombre', label: 'Nombre' },
  curso: { columna: 'Curso', label: 'Curso' },
  cursosAdicionales: { columna: 'CursosAdicionales', label: 'Cursos adicionales' },
  origen: { columna: 'Origen', label: 'Cómo llegó' },
  whatsapp: { columna: 'WhatsApp', label: 'WhatsApp' },
  email: { columna: 'EmailEstudiante', label: 'Email' },
  instagram: { columna: 'InstagramUsuario', label: 'Instagram/Facebook' },
  pais: { columna: 'Pais', label: 'País' },
  prioridad: { columna: 'Prioridad', label: 'Prioridad' },
  notasInternas: { columna: 'NotasInternas', label: 'Observaciones' }
};

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
  const solicitante = await findUsuario(body.cargadoPorEmail);
  if (!tienePermisoCrearLeads(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const ahora = new Date();
  const fechaIngreso = ahora.toISOString();
  const leadId = `L-${ahora.getTime()}`;

  // Columnas Leads: ID, Nombre, Apellido, WhatsApp, Curso, CursosAdicionales, Origen, FechaIngreso,
  // CargadoPorEmail, CargadoPorNombre, Estado, FechaVenta, MedioPago, Modalidad, CantCuotas, ValorCuota,
  // MontoTotal, Edicion, EmailEstudiante, NotasInternas, InstagramUsuario, Docentes, DetalleCuotas,
  // VendidoPorNombre, Pais, Prioridad
  await appendRow('Leads', [
    leadId,
    body.nombre,
    body.apellido,
    body.whatsapp || '',
    body.curso || '',
    body.cursosAdicionales || '',
    body.origen,
    fechaIngreso,
    body.cargadoPorEmail,
    body.cargadoPorNombre,
    'Lead',
    '', '', '', '', '', '',
    '',
    body.email || '',
    '',
    body.instagram || '',
    '', '', '',
    body.pais || '',
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

// PATCH /api/leads -> editar campos de la ficha de un lead ya cargado.
// body: { leadId, solicitanteEmail, solicitanteNombre, ...cualquiera de CAMPOS_EDITABLES }
// Nota: "Estado" (Lead/Comprado) NO se edita acá — eso solo puede pasar a través de /api/ventas,
// para no romper la trazabilidad financiera de una venta.
export async function PATCH(request) {
  const body = await request.json();
  const [leads, seguimiento] = await Promise.all([readSheet('Leads'), readSheet('Seguimiento')]);
  const lead = leads.find((l) => l.ID === body.leadId);
  if (!lead) {
    return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
  }

  const solicitante = await findUsuario(body.solicitanteEmail);
  // El "responsable actual" para el chequeo de permisos es el de la fila de Lote 1 de este lead
  // (es la que se asigna a la creadora por defecto, y la primera que puede reasignarse a otra persona).
  const filaLote1 = seguimiento.find((s) => s.LeadID === lead.ID && s.Lote === '1');
  if (!tienePermisoEditarLead(solicitante, lead, filaLote1?.AsignadoAEmail)) {
    return NextResponse.json({ error: 'No autorizado para editar este lead' }, { status: 403 });
  }

  const valoresActuales = {
    ID: lead.ID, Nombre: lead.Nombre, Apellido: lead.Apellido, WhatsApp: lead.WhatsApp,
    Curso: lead.Curso, CursosAdicionales: lead.CursosAdicionales, Origen: lead.Origen,
    FechaIngreso: lead.FechaIngreso, CargadoPorEmail: lead.CargadoPorEmail, CargadoPorNombre: lead.CargadoPorNombre,
    Estado: lead.Estado, FechaVenta: lead.FechaVenta, MedioPago: lead.MedioPago, Modalidad: lead.Modalidad,
    CantCuotas: lead.CantCuotas, ValorCuota: lead.ValorCuota, MontoTotal: lead.MontoTotal, Edicion: lead.Edicion,
    EmailEstudiante: lead.EmailEstudiante, NotasInternas: lead.NotasInternas, InstagramUsuario: lead.InstagramUsuario,
    Docentes: lead.Docentes, DetalleCuotas: lead.DetalleCuotas, VendidoPorNombre: lead.VendidoPorNombre,
    Pais: lead.Pais, Prioridad: lead.Prioridad
  };

  const cambios = [];
  Object.entries(CAMPOS_EDITABLES).forEach(([campoBody, { columna, label }]) => {
    if (body[campoBody] !== undefined && body[campoBody] !== valoresActuales[columna]) {
      cambios.push(`${label}: "${valoresActuales[columna] || '(vacío)'}" → "${body[campoBody] || '(vacío)'}"`);
      valoresActuales[columna] = body[campoBody];
    }
  });

  if (cambios.length === 0) {
    return NextResponse.json({ ok: true, sinCambios: true });
  }

  await updateRow('Leads', lead._rowIndex, [
    valoresActuales.ID, valoresActuales.Nombre, valoresActuales.Apellido, valoresActuales.WhatsApp,
    valoresActuales.Curso, valoresActuales.CursosAdicionales, valoresActuales.Origen,
    valoresActuales.FechaIngreso, valoresActuales.CargadoPorEmail, valoresActuales.CargadoPorNombre,
    valoresActuales.Estado, valoresActuales.FechaVenta, valoresActuales.MedioPago, valoresActuales.Modalidad,
    valoresActuales.CantCuotas, valoresActuales.ValorCuota, valoresActuales.MontoTotal, valoresActuales.Edicion,
    valoresActuales.EmailEstudiante, valoresActuales.NotasInternas, valoresActuales.InstagramUsuario,
    valoresActuales.Docentes, valoresActuales.DetalleCuotas, valoresActuales.VendidoPorNombre,
    valoresActuales.Pais, valoresActuales.Prioridad
  ]);

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Editó la ficha de un lead',
    `${valoresActuales.Nombre} — ${cambios.join(' · ')}`,
    lead.ID
  );

  return NextResponse.json({ ok: true });
}
