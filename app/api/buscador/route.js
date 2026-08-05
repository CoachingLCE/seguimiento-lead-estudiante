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
  if (!q || q.length < 2) return NextResponse.json({ resultados: [] });

  const [leads, seguimiento, inscritos] = await Promise.all([
    readSheet('Leads'), readSheet('Seguimiento'), readSheet('Inscritos')
  ]);

  const resultados = leads
    .map((l) => {
      const segsLead = seguimiento.filter((s) => s.LeadID === l.ID);
      const inscrito = inscritos.find((i) => i.LeadId === l.ID) || null;
      const ultimoContacto = segsLead
        .filter((s) => s.Contactado === 'TRUE')
        .sort((a, b) => new Date(b.FechaContacto) - new Date(a.FechaContacto))[0];
      const responsableFila = [...segsLead]
        .sort((a, b) => new Date(b.FechaVence) - new Date(a.FechaVence))
        .find((s) => s.AsignadoANombre);
      const lotes = [...new Set(segsLead.map((s) => s.Lote))].join(', ');
      const estadoTexto = inscrito ? 'Estudiante' : l.Estado === 'Comprado' ? 'Comprado' : 'Lead';

      // Campo por campo, para poder decir en qué sección encontró la coincidencia.
      const camposConLabel = [
        ['Nombre y apellido', `${l.Nombre} ${l.Apellido}`],
        ['Email', l.EmailEstudiante],
        ['WhatsApp', l.WhatsApp],
        ['Instagram', l.InstagramUsuario],
        ['Curso', l.Curso],
        ['Edición', inscrito?.Edicion],
        ['Estado', estadoTexto],
        ['Responsable', responsableFila?.AsignadoANombre],
        ['Observaciones', l.NotasInternas],
        ['Última interacción', ultimoContacto?.Resultado],
        ['Lote', lotes],
        ['País', l.Pais],
        ['Origen', l.Origen]
      ];
      const coincidencias = camposConLabel.filter(([, v]) => (v || '').toLowerCase().includes(q)).map(([label]) => label);

      return { l, inscrito, ultimoContacto, responsableFila, estadoTexto, coincidencias };
    })
    .filter((r) => r.coincidencias.length > 0)
    .slice(0, 30)
    .map((r) => ({
      id: r.l.ID,
      nombre: `${r.l.Nombre} ${r.l.Apellido}`,
      curso: r.l.Curso || 'sin curso',
      edicion: r.inscrito?.Edicion || '',
      estado: r.estadoTexto,
      responsable: r.responsableFila?.AsignadoANombre || '',
      whatsapp: r.l.WhatsApp || '',
      email: r.l.EmailEstudiante || '',
      pais: r.l.Pais || '',
      ultimoContacto: r.ultimoContacto ? { resultado: r.ultimoContacto.Resultado, fecha: r.ultimoContacto.FechaContacto } : null,
      coincidencias: r.coincidencias
    }));

  return NextResponse.json({ resultados });
}
