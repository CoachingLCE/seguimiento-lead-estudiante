import { NextResponse } from 'next/server';
import { readSheet, updateRow } from '../../../lib/sheets';
import { registrarAccion } from '../../../lib/auditoria';

// POST /api/ventas -> marca un lead como vendido
// body: { leadId, medioPago, modalidad: 'totalidad'|'cuotas', cantCuotas, valorCuota, detalleCuotas,
//         montoTotal, emailEstudiante, edicion, docentes, vendidoPor, solicitanteEmail, solicitanteNombre }
export async function POST(request) {
  const body = await request.json();
  const leads = await readSheet('Leads');
  const lead = leads.find((l) => l.ID === body.leadId);
  if (!lead) {
    return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
  }

  const esCuotasVariables = Boolean(body.detalleCuotas);
  const montoTotal = esCuotasVariables
    ? Number(body.montoTotal)
    : body.modalidad === 'cuotas'
      ? Number(body.cantCuotas) * Number(body.valorCuota)
      : Number(body.montoTotal);

  const modalidadTexto = esCuotasVariables
    ? `${body.cantCuotas} cuotas variables ($${body.detalleCuotas})`
    : body.modalidad === 'cuotas'
      ? `${body.cantCuotas} cuotas de $${body.valorCuota}`
      : 'Totalidad';

  // Mismo orden de columnas que en app/api/leads/route.js
  await updateRow('Leads', lead._rowIndex, [
    lead.ID,
    lead.Nombre,
    lead.Apellido,
    lead.WhatsApp,
    lead.Curso,
    lead.CursosAdicionales,
    lead.Origen,
    lead.FechaIngreso,
    lead.CargadoPorEmail,
    lead.CargadoPorNombre,
    'Comprado',
    new Date().toISOString(),
    body.medioPago,
    modalidadTexto,
    body.modalidad === 'cuotas' ? body.cantCuotas : '',
    esCuotasVariables ? '' : (body.modalidad === 'cuotas' ? body.valorCuota : ''),
    montoTotal,
    body.edicion || '',
    body.emailEstudiante || '',
    lead.NotasInternas,
    lead.InstagramUsuario,
    body.docentes || '',
    body.detalleCuotas || '',
    body.vendidoPor || ''
  ]);

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Registró una venta',
    `${lead.Nombre} ${lead.Apellido} — ${lead.Curso || 'sin curso'} — $${montoTotal}${body.vendidoPor ? ` — cerrada por ${body.vendidoPor}` : ''}`,
    lead.ID
  );

  return NextResponse.json({ ok: true });
}
