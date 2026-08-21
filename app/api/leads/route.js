import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow, deleteRows } from '../../../lib/sheets';
import { findUsuario, tienePermisoOperativo, tienePermisoCrearLeads, tienePermisoEditarLead, tienePermisoEditarVenta, tienePermisoEditarContactoEstudiante } from '../../../lib/auth';
import { registrarAccion } from '../../../lib/auditoria';
import { HORAS_LOTE_1, DIAS_LOTE_3, DIAS_LOTE_4, DIAS_LOTE_5, DIAS_LOTE_6 } from '../../../lib/constants';

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
  notasInternas: { columna: 'NotasInternas', label: 'Observaciones' },
  montoTotal: { columna: 'MontoTotal', label: 'Monto' },
  medioPago: { columna: 'MedioPago', label: 'Medio de pago' },
  modalidad: { columna: 'Modalidad', label: 'Modalidad' },
  edicion: { columna: 'Edicion', label: 'Edición' },
  docentes: { columna: 'Docentes', label: 'Docente(s)' },
  vendidoPor: { columna: 'VendidoPorNombre', label: 'Vendido por' }
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
    body.notasIniciales || '',
    body.instagram || '',
    '', '', '',
    body.pais || '',
    body.prioridad || ''
  ]);

  // Seguimiento: se crean de una las 3 etapas con tiempo (Lote 1, 2, 3). Lote 0 no se guarda como fila:
  // es simplemente "todos los leads", se calcula al vuelo desde la hoja Leads.
  // Columnas Seguimiento: LeadID, Lote, FechaVence, AsignadoAEmail, AsignadoANombre, Contactado, Resultado,
  // FechaContacto, Observaciones, ProximaAccion
  //
  // El vencimiento se redondea al INICIO del día correspondiente (00:00), en vez de la hora exacta
  // en que se cargó el lead. Así, todos los leads cargados el mismo día pasan de lote juntos desde
  // la mañana siguiente que corresponda, sin que unos aparezcan a la mañana y otros recién a la tarde.
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

  await appendRow('Seguimiento', [
    leadId, '1', vence1, body.cargadoPorEmail, body.cargadoPorNombre, 'FALSE', '', '', '', '', '', ''
  ]);
  // Lote 2 no se crea todavía: se genera dinámicamente cuando el Lote 1 se marca contactado sin conversión
  // (ver PATCH en /api/seguimiento). Lotes 3, 4 y 5 sí se pre-crean, "Sin asignación" (AsignadoA vacío).
  await appendRow('Seguimiento', [
    leadId, '3', vence3, '', '', 'FALSE', '', '', '', '', '', ''
  ]);
  await appendRow('Seguimiento', [
    leadId, '4', vence4, '', '', 'FALSE', '', '', '', '', '', ''
  ]);
  await appendRow('Seguimiento', [
    leadId, '5', vence5, '', '', 'FALSE', '', '', '', '', '', ''
  ]);
  await appendRow('Seguimiento', [
    leadId, '6', vence6, '', '', 'FALSE', '', '', '', '', '', ''
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

  // El rol Estudiantes no tiene permiso general para editar la ficha, pero sí puede corregir
  // Nombre/WhatsApp/Email de un alumno ya inscripto — mientras el pedido no incluya otros campos.
  const CAMPOS_SOLO_CONTACTO = ['nombre', 'whatsapp', 'email'];
  const CAMPOS_SIEMPRE_PERMITIDOS = ['leadId', 'solicitanteEmail', 'solicitanteNombre'];
  const soloPideCamposDeContacto = Object.keys(body).every(
    (k) => CAMPOS_SIEMPRE_PERMITIDOS.includes(k) || CAMPOS_SOLO_CONTACTO.includes(k)
  );
  const autorizado =
    tienePermisoEditarLead(solicitante, lead, filaLote1?.AsignadoAEmail) ||
    (soloPideCamposDeContacto && tienePermisoEditarContactoEstudiante(solicitante, lead));

  if (!autorizado) {
    return NextResponse.json({ error: 'No autorizado para editar este lead' }, { status: 403 });
  }

  const CAMPOS_DE_VENTA = ['montoTotal', 'medioPago', 'modalidad', 'edicion', 'docentes', 'vendidoPor'];
  const tocaCampoDeVenta = CAMPOS_DE_VENTA.some((c) => body[c] !== undefined);
  if (tocaCampoDeVenta && !tienePermisoEditarVenta(solicitante)) {
    return NextResponse.json({ error: 'No autorizado para editar datos de la venta' }, { status: 403 });
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

// DELETE /api/leads -> elimina uno o varios leads elegidos puntualmente (y su Seguimiento asociado).
// Solo Admin. Nunca borra un lead que ya tenga una venta confirmada (Estado === 'Comprado').
// body: { leadIds: ['L-...', 'L-...'], solicitanteEmail, solicitanteNombre }
export async function DELETE(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!solicitante || !solicitante.roles.includes('Admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const idsPedidos = new Set(body.leadIds || []);
  if (idsPedidos.size === 0) {
    return NextResponse.json({ error: 'No se especificaron leads' }, { status: 400 });
  }

  const [leads, seguimiento] = await Promise.all([readSheet('Leads'), readSheet('Seguimiento')]);
  const encontrados = leads.filter((l) => idsPedidos.has(l.ID));
  const aBorrar = encontrados.filter((l) => l.Estado !== 'Comprado');
  const protegidos = encontrados.filter((l) => l.Estado === 'Comprado');
  const idsABorrar = new Set(aBorrar.map((l) => l.ID));
  const filasSeguimientoABorrar = seguimiento.filter((s) => idsABorrar.has(s.LeadID));

  await deleteRows('Leads', aBorrar.map((l) => l._rowIndex));
  await deleteRows('Seguimiento', filasSeguimientoABorrar.map((s) => s._rowIndex));

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Eliminó lead(s) puntual(es)',
    `${aBorrar.map((l) => `${l.Nombre} ${l.Apellido}`).join(', ')}${protegidos.length > 0 ? ` — ${protegidos.length} protegido(s) por venta` : ''}`
  );

  return NextResponse.json({
    eliminados: aBorrar.length,
    seguimientoEliminado: filasSeguimientoABorrar.length,
    protegidos: protegidos.length
  });
}
