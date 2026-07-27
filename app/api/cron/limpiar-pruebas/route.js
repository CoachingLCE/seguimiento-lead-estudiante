import { NextResponse } from 'next/server';
import { readSheet, deleteRows } from '../../../../lib/sheets';

const CUARENTAIOCHO_HORAS_MS = 48 * 60 * 60 * 1000;

function esDePrueba(valor) {
  return (valor || '').trim().toLowerCase() === 'prueba';
}

// GET /api/cron/limpiar-pruebas
// Vercel Cron llama a esta ruta con un header Authorization: Bearer <CRON_SECRET>
// (se agrega solo si existe la env var CRON_SECRET en el proyecto).
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const ahora = Date.now();

  const leads = await readSheet('Leads');
  const leadsPrueba = leads.filter(
    (l) => esDePrueba(l.Nombre) && ahora - new Date(l.FechaIngreso).getTime() > CUARENTAIOCHO_HORAS_MS
  );
  const idsLeadsPrueba = leadsPrueba.map((l) => l.ID);

  const seguimiento = await readSheet('Seguimiento');
  const seguimientoPrueba = seguimiento.filter((s) => idsLeadsPrueba.includes(s.LeadID));

  const inscritos = await readSheet('Inscritos');
  const inscritosPrueba = inscritos.filter(
    (i) =>
      esDePrueba(i.NombreEstudiante) &&
      ahora - new Date(i.FechaInscripcion).getTime() > CUARENTAIOCHO_HORAS_MS
  );

  await deleteRows('Leads', leadsPrueba.map((l) => l._rowIndex));
  await deleteRows('Seguimiento', seguimientoPrueba.map((s) => s._rowIndex));
  await deleteRows('Inscritos', inscritosPrueba.map((i) => i._rowIndex));

  return NextResponse.json({
    ok: true,
    borrados: {
      leads: leadsPrueba.length,
      seguimiento: seguimientoPrueba.length,
      inscritos: inscritosPrueba.length
    }
  });
}
