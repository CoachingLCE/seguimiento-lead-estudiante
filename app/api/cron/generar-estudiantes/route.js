import { NextResponse } from 'next/server';
import { readSheet, appendRow } from '../../../../lib/sheets';
import { HORAS_PARA_ALTA_ESTUDIANTE } from '../../../../lib/constants';
import { registrarAccion } from '../../../../lib/auditoria';

// GET /api/cron/generar-estudiantes
// Corre 1 vez por día (ver vercel.json). Busca ventas confirmadas con 24hs+ de antigüedad
// que todavía no tengan su fila en "Inscritos", y la crea.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const ahora = Date.now();
  const UMBRAL_MS = HORAS_PARA_ALTA_ESTUDIANTE * 60 * 60 * 1000;

  const [leads, inscritos] = await Promise.all([readSheet('Leads'), readSheet('Inscritos')]);
  const idsYaGenerados = new Set(inscritos.map((i) => i.LeadId));

  const ventasParaGenerar = leads.filter(
    (l) =>
      l.Estado === 'Comprado' &&
      l.FechaVenta &&
      ahora - new Date(l.FechaVenta).getTime() >= UMBRAL_MS &&
      !idsYaGenerados.has(l.ID)
  );

  for (const venta of ventasParaGenerar) {
    const id = `EST-${venta.ID}`;
    // Columnas Inscritos: ID, LeadId, NombreEstudiante, EmailEstudiante, Curso, Edicion, FechaInscripcion,
    // AltaPlataforma, AltaPorEmail, AltaPorNombre, FechaAlta, BienvenidaEnviada, BienvenidaPorEmail,
    // BienvenidaPorNombre, FechaBienvenida, AbonoTotalidad, Docentes, ConfirmoRecepcion, GrupoWhatsApp
    await appendRow('Inscritos', [
      id,
      venta.ID,
      `${venta.Nombre} ${venta.Apellido}`,
      venta.EmailEstudiante || '',
      venta.Curso || '',
      venta.Edicion || '',
      venta.FechaVenta,
      'FALSE', '', '', '',
      'FALSE', '', '', '',
      'FALSE',
      venta.Docentes || '',
      'FALSE', 'FALSE'
    ]);

    await registrarAccion(
      'sistema', 'Sistema (automático)',
      'Alumno creado automáticamente',
      `${venta.Nombre} ${venta.Apellido} — ${venta.Curso || 'sin curso'} (24hs después de la venta)`,
      venta.ID
    );
  }

  return NextResponse.json({ ok: true, generados: ventasParaGenerar.length });
}
