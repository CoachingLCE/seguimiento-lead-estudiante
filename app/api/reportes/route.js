import { NextResponse } from 'next/server';
import { readSheet } from '../../../lib/sheets';
import { findUsuario, tienePermisoReportes } from '../../../lib/auth';

// GET /api/reportes?mes=2026-07&solicitanteEmail=... -> resumen del mes + detalle de compras
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoReportes(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const mes = searchParams.get('mes'); // formato 'YYYY-MM'

  const leads = await readSheet('Leads');
  const delMes = mes
    ? leads.filter((l) => (l.FechaIngreso || '').slice(0, 7) === mes)
    : leads;

  const compras = delMes.filter((l) => l.Estado === 'Comprado');
  const montoTotal = compras.reduce((acc, c) => acc + Number(c.MontoTotal || 0), 0);
  const conversion = delMes.length ? Math.round((compras.length / delMes.length) * 100) : 0;

  return NextResponse.json({
    totalLeads: delMes.length,
    totalCompras: compras.length,
    montoTotal,
    conversion,
    compras: compras.map((c) => ({
      id: c.ID,
      lead: `${c.Nombre} ${c.Apellido}`,
      curso: c.Curso || 'sin curso',
      edicion: c.Edicion || '',
      docentes: c.Docentes || '',
      origen: c.Origen,
      fechaVenta: c.FechaVenta,
      medioPago: c.MedioPago,
      modalidad: c.Modalidad,
      montoTotal: c.MontoTotal,
      cargadoPor: c.CargadoPorNombre,
      vendidoPor: c.VendidoPorNombre || ''
    }))
  });
}
