import { NextResponse } from 'next/server';
import { readSheet } from '../../../lib/sheets';
import { findUsuario, tienePermisoComunidades } from '../../../lib/auth';

// GET /api/comunidades?solicitanteEmail=... -> ventas reales de "Comunidades", que no es una hoja
// aparte: es simplemente el valor que toma Curso en Leads para esas ventas (igual que cualquier
// otro curso). Se filtra directo de Leads, lo mismo que ya hace Reportes para "Leads por curso".
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoComunidades(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  try {
    const leads = await readSheet('Leads');
    const deComunidades = leads.filter((l) => (l.Curso || '') === 'Comunidades');
    const ventas = deComunidades
      .filter((l) => l.Estado === 'Comprado')
      .sort((a, b) => new Date(b.FechaVenta) - new Date(a.FechaVenta));
    const interesados = deComunidades.filter((l) => l.Estado !== 'Comprado');
    return NextResponse.json({ ventas, totalInteresados: interesados.length });
  } catch (err) {
    console.error('Error cargando ventas de Comunidades:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando los datos. Probá de nuevo.' }, { status: 500 });
  }
}
