import { NextResponse } from 'next/server';
import { readSheet } from '../../../../lib/sheets';
import { findUsuario, tienePermisoReportes } from '../../../../lib/auth';

// GET /api/reportes/leads-por-curso?mes=2026-08&curso=...&solicitanteEmail=...
// Detalle de los leads detrás de una barra de "Leads por curso" — para poder ver quiénes son,
// sobre todo útil para "Sin curso definido" donde hace falta identificar a cada uno puntualmente.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get('mes');
  const curso = searchParams.get('curso') || '';
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoReportes(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (!mes) return NextResponse.json({ error: 'Falta el mes' }, { status: 400 });

  try {
    const leads = await readSheet('Leads');
    const leadsDelCurso = leads
      .filter((l) => (l.FechaIngreso || '').slice(0, 7) === mes && l.Origen !== 'Carga manual (baja)' && (l.Curso || 'Sin curso definido') === curso)
      .map((l) => ({
        id: l.ID, nombre: `${l.Nombre} ${l.Apellido}`, fechaIngreso: l.FechaIngreso,
        estado: l.Estado === 'Comprado' ? 'Comprado' : 'Lead', origen: l.Origen || '', whatsapp: l.WhatsApp || ''
      }))
      .sort((a, b) => new Date(b.fechaIngreso) - new Date(a.fechaIngreso));
    return NextResponse.json({ leads: leadsDelCurso });
  } catch (err) {
    console.error('Error cargando detalle de leads por curso:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando el detalle.' }, { status: 500 });
  }
}
