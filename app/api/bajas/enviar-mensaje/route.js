import { NextResponse } from 'next/server';
import { readSheet, updateRow } from '../../../../lib/sheets';
import { findUsuario, tienePermisoBajas } from '../../../../lib/auth';
import { enviarMailReactivacionBaja } from '../../../../lib/mailer';
import { registrarAccion } from '../../../../lib/auditoria';

// POST /api/bajas/enviar-mensaje -> { leadId, solicitanteEmail, solicitanteNombre }
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoBajas(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const [leads, seguimiento] = await Promise.all([readSheet('Leads'), readSheet('Seguimiento')]);
  const lead = leads.find((l) => l.ID === body.leadId);
  if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
  if (!lead.EmailEstudiante) return NextResponse.json({ error: 'Este lead no tiene un email cargado' }, { status: 400 });

  const filaBaja = seguimiento.find((s) => s.LeadID === body.leadId && s.Lote === 'baja');
  if (!filaBaja) return NextResponse.json({ error: 'No se encontró la baja de este lead' }, { status: 404 });

  try {
    await enviarMailReactivacionBaja(lead.EmailEstudiante, `${lead.Nombre} ${lead.Apellido}`, lead.Curso, lead.ID);
  } catch (err) {
    console.error('Error enviando mail de reactivación:', err);
    return NextResponse.json({ error: 'No se pudo enviar el mail' }, { status: 500 });
  }

  const ahora = new Date().toISOString();
  await updateRow('Seguimiento', filaBaja._rowIndex, [
    filaBaja.LeadID, filaBaja.Lote, filaBaja.FechaVence, filaBaja.AsignadoAEmail, filaBaja.AsignadoANombre,
    filaBaja.Contactado, filaBaja.Resultado, filaBaja.FechaContacto, filaBaja.Observaciones, filaBaja.ProximaAccion,
    filaBaja.FechaProgramada, filaBaja.ContactadoPorNombre, ahora, filaBaja.ConfirmoRecepcionBaja || ''
  ]);

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Envió mensaje 1 de reactivación de baja', `${lead.Nombre} ${lead.Apellido} — ${lead.Curso}`, lead.ID
  );

  return NextResponse.json({ ok: true });
}
