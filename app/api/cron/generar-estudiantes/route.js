import { NextResponse } from 'next/server';
import { readSheet, appendRow } from '../../../../lib/sheets';
import { registrarAccion } from '../../../../lib/auditoria';

// GET /api/cron/generar-estudiantes
// Corre 1 vez por día (ver vercel.json). Busca ventas confirmadas del día de ayer o antes (por
// fecha calendario, no por 24hs exactas — así una venta hecha a la tarde no tiene que esperar
// un día extra solo porque no pasaron 24hs reales justo a la hora en que corre el proceso) que
// todavía no tengan su fila en "Inscritos", y la crea.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [leads, inscritos] = await Promise.all([readSheet('Leads'), readSheet('Inscritos')]);
  const idsYaGenerados = new Set(inscritos.map((i) => i.LeadId));

  const ventasParaGenerar = leads.filter((l) => {
    if (l.Estado !== 'Comprado' || !l.FechaVenta || idsYaGenerados.has(l.ID)) return false;
    const fechaVenta = new Date(l.FechaVenta);
    fechaVenta.setHours(0, 0, 0, 0);
    return fechaVenta < hoy; // venta de ayer o antes (por día calendario, no por 24hs exactas)
  });

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
      `${venta.Nombre} ${venta.Apellido} — ${venta.Curso || 'sin curso'} (venta de ayer o antes)`,
      venta.ID
    );
  }

  return NextResponse.json({ ok: true, generados: ventasParaGenerar.length });
}
