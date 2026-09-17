import { readSheet } from './sheets';

// Junta, de todos los lotes de Seguimiento, cada lead al que se le marcó "Ficha enviada" como
// resultado y que todavía no compró — con la fecha y quién la mandó. Si un mismo lead tiene más
// de una fila con ese resultado (ej: se le volvió a mandar en otro lote), se listan todas, más
// reciente primero. Usado por /api/fichas-enviadas (la pantalla) y por el resumen semanal por mail.
export async function obtenerFichasEnviadas() {
  const [seguimiento, leads] = await Promise.all([readSheet('Seguimiento'), readSheet('Leads')]);
  const leadsPorId = {};
  leads.forEach((l) => { leadsPorId[l.ID] = l; });

  return seguimiento
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
        enviadaPor: s.ContactadoPorNombre || s.AsignadoANombre || '',
        comprado: lead?.Estado === 'Comprado'
      };
    })
    .filter((f) => f.fecha && !f.comprado) // si ya compró, no tiene sentido seguir mostrándola
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}
