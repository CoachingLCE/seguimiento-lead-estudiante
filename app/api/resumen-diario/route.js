import { NextResponse } from 'next/server';
import { readSheet } from '../../../lib/sheets';
import { findUsuario, tienePermisoResumenDiario } from '../../../lib/auth';

function esMismoDia(fechaISO, fechaStr) {
  if (!fechaISO) return false;
  return new Date(fechaISO).toISOString().slice(0, 10) === fechaStr;
}

// GET /api/resumen-diario?fecha=YYYY-MM-DD&solicitanteEmail=...
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  const autorizado = tienePermisoResumenDiario(solicitante);
  if (!autorizado) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const fecha = searchParams.get('fecha') || new Date().toISOString().slice(0, 10);

  const [leads, seguimiento, inscritos] = await Promise.all([
    readSheet('Leads'),
    readSheet('Seguimiento'),
    readSheet('Inscritos')
  ]);

  const leadsDelDia = leads
    .filter((l) => esMismoDia(l.FechaIngreso, fecha))
    .map((l) => ({
      nombre: `${l.Nombre} ${l.Apellido}`,
      curso: l.Curso,
      origen: l.Origen,
      cargadoPor: l.CargadoPorNombre,
      estado: l.Estado
    }));

  const contactosDelDia = seguimiento
    .filter((s) => s.Contactado === 'TRUE' && esMismoDia(s.FechaContacto, fecha))
    .map((s) => {
      const lead = leads.find((l) => l.ID === s.LeadID);
      return {
        lead: lead ? `${lead.Nombre} ${lead.Apellido}` : s.LeadID,
        lote: s.Lote,
        resultado: s.Resultado,
        contactadoPor: s.AsignadoANombre
      };
    });

  const inscritosDelDia = inscritos
    .filter((i) => esMismoDia(i.FechaInscripcion, fecha))
    .map((i) => ({
      estudiante: i.NombreEstudiante,
      curso: i.Curso,
      edicion: i.Edicion,
      altaPlataforma: i.AltaPlataforma === 'TRUE',
      bienvenidaEnviada: i.BienvenidaEnviada === 'TRUE',
      cargadoPor: i.CargadoPorNombre
    }));

  return NextResponse.json({ fecha, leadsDelDia, contactosDelDia, inscritosDelDia });
}
