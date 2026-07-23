import { NextResponse } from 'next/server';
import { readSheet } from '../../../lib/sheets';
import { findUsuario, tienePermisoBuscador } from '../../../lib/auth';

// GET /api/buscador?q=...&solicitanteEmail=...           -> resultados de búsqueda
// GET /api/buscador?leadId=...&solicitanteEmail=...       -> ficha completa de un alumno
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoBuscador(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const leadId = searchParams.get('leadId');

  if (leadId) {
    const [leads, seguimiento, inscritos, auditoria] = await Promise.all([
      readSheet('Leads'), readSheet('Seguimiento'), readSheet('Inscritos'), readSheet('Auditoria')
    ]);
    const lead = leads.find((l) => l.ID === leadId);
    if (!lead) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    const seguimientoLead = seguimiento.filter((s) => s.LeadID === leadId);
    const inscrito = inscritos.find((i) => i.LeadId === leadId) || null;
    const historial = auditoria
      .filter((a) => a.LeadIdRelacionado === leadId)
      .sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));

    return NextResponse.json({ lead, seguimiento: seguimientoLead, inscrito, historial });
  }

  const q = (searchParams.get('q') || '').trim().toLowerCase();
  if (!q) return NextResponse.json({ resultados: [] });

  const leads = await readSheet('Leads');
  const resultados = leads
    .filter((l) => {
      const campos = [l.ID, l.Nombre, l.Apellido, l.WhatsApp, l.EmailEstudiante]
        .join(' ')
        .toLowerCase();
      return campos.includes(q);
    })
    .map((l) => ({
      id: l.ID,
      nombre: `${l.Nombre} ${l.Apellido}`,
      curso: l.Curso || 'sin curso',
      estado: l.Estado
    }));

  return NextResponse.json({ resultados });
}
