import { NextResponse } from 'next/server';
import { readSheet } from '../../../lib/sheets';
import { findUsuario, tienePermisoOperativo } from '../../../lib/auth';

// GET /api/fichas-enviadas?solicitanteEmail=...
// Junta, de todos los lotes de Seguimiento, cada lead al que se le marcó "Ficha enviada" como
// resultado — con la fecha y quién la mandó. Si un mismo lead tiene más de una fila con ese
// resultado (ej: se le volvió a mandar en otro lote), se listan todas, más reciente primero.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoOperativo(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const [seguimiento, leads] = await Promise.all([readSheet('Seguimiento'), readSheet('Leads')]);
    const leadsPorId = {};
    leads.forEach((l) => { leadsPorId[l.ID] = l; });

    const fichas = seguimiento
      .filter((s) => s.Resultado === 'Ficha enviada')
      .map((s) => {
        const lead = leadsPorId[s.LeadID];
        return {
          leadId: s.LeadID,
          nombre: lead ? `${lead.Nombre} ${lead.Apellido}` : '(lead no encontrado)',
          curso: lead?.Curso || '',
          pais: lead?.Pais || '',
          whatsapp: lead?.WhatsApp || '',
          lote: s.Lote,
          fecha: s.FechaContacto || '',
          enviadaPor: s.ContactadoPorNombre || s.AsignadoANombre || ''
        };
      })
      .filter((f) => f.fecha)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return NextResponse.json({ fichas });
  } catch (err) {
    console.error('Error cargando fichas enviadas:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando los datos.' }, { status: 500 });
  }
}
