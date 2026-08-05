import { NextResponse } from 'next/server';
import { readSheet } from '../../../lib/sheets';
import { findUsuario, tienePermisoReportes } from '../../../lib/auth';
import { CURSOS, EQUIPO_VENTAS, RESULTADOS_FINALES } from '../../../lib/constants';

function mesAnteriorDe(mes) {
  const [y, m] = mes.split('-').map(Number);
  const fecha = new Date(y, m - 2, 1); // m es 1-indexado; restamos 1 mes más
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

function diasDelMes(mes) {
  const [y, m] = mes.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function numeroValido(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Calcula el bloque de métricas para un mes puntual: KPIs, series por día, rankings, embudo.
// Recibe los leads/seguimiento YA filtrados a ese mes para no leer el Sheet de nuevo por cada mes.
function calcularBloque(mes, leadsDelMes, seguimientoDeEsosLeads) {
  const compras = leadsDelMes.filter((l) => l.Estado === 'Comprado');
  // Un solo registro con MontoTotal invalido (ej: guardado como texto "NaN" por un bug viejo)
  // no debe arruinar la suma de TODO el mes — se lo trata como $0 para ese registro puntual.
  const montoTotal = compras.reduce((acc, c) => acc + numeroValido(c.MontoTotal), 0);
  const conversion = leadsDelMes.length ? (compras.length / leadsDelMes.length) * 100 : 0;
  const ticketPromedio = compras.length ? montoTotal / compras.length : 0;

  const totalDias = diasDelMes(mes);
  const ventaPromedioPorDia = compras.length / totalDias;

  // Series por día (evolución)
  const porDia = {};
  for (let d = 1; d <= totalDias; d++) porDia[d] = { ventas: 0, monto: 0 };
  compras.forEach((c) => {
    if (!c.FechaVenta) return;
    const dia = new Date(c.FechaVenta).getDate();
    if (porDia[dia]) { porDia[dia].ventas += 1; porDia[dia].monto += numeroValido(c.MontoTotal); }
  });
  const serieDiaria = Object.entries(porDia).map(([dia, v]) => ({ dia: Number(dia), ventas: v.ventas, monto: v.monto }));
  const mejorDia = serieDiaria.reduce((mejor, d) => (d.monto > (mejor?.monto || 0) ? d : mejor), null);

  // Rankings — helper genérico
  function rankear(campo, splitComa = false) {
    const conteo = {};
    compras.forEach((c) => {
      const valores = splitComa
        ? (c[campo] || '').split(',').map((v) => v.trim()).filter(Boolean)
        : [c[campo] || 'Sin dato'];
      valores.forEach((v) => {
        if (!conteo[v]) conteo[v] = { cantidad: 0, monto: 0 };
        conteo[v].cantidad += 1;
        conteo[v].monto += numeroValido(c.MontoTotal) / valores.length;
      });
    });
    return Object.entries(conteo)
      .map(([nombre, v]) => ({ nombre, cantidad: v.cantidad, monto: Math.round(v.monto), porcentaje: compras.length ? (v.cantidad / compras.length) * 100 : 0 }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  const rankingVendedores = rankear('VendidoPorNombre');
  const rankingCursos = rankear('Curso');
  const rankingOrigenes = rankear('Origen');
  const rankingDocentes = rankear('Docentes', true);
  const rankingEdiciones = rankear('Edicion');
  const rankingMedioPago = rankear('MedioPago');
  const rankingModalidad = rankear('Modalidad');

  // Embudo comercial: Lead -> Contactado -> Interesado -> Venta
  const idsConLead = new Set(leadsDelMes.map((l) => l.ID));
  const idsContactados = new Set(seguimientoDeEsosLeads.filter((s) => s.Contactado === 'TRUE').map((s) => s.LeadID));
  const idsInteresados = new Set(
    seguimientoDeEsosLeads.filter((s) => s.Resultado === 'Interesado' || RESULTADOS_FINALES.includes(s.Resultado)).map((s) => s.LeadID)
  );
  const embudo = [
    { etapa: 'Lead', cantidad: idsConLead.size },
    { etapa: 'Contactado', cantidad: idsContactados.size },
    { etapa: 'Interesado', cantidad: idsInteresados.size },
    { etapa: 'Venta', cantidad: compras.length }
  ];

  // Vendedores sin ventas / cursos sin ventas (para alertas, se resuelve en el llamador con el mes actual)
  const vendedoresConVenta = new Set(rankingVendedores.map((v) => v.nombre));
  const cursosConVenta = new Set(rankingCursos.map((c) => c.nombre));

  return {
    totalLeads: leadsDelMes.length, totalCompras: compras.length, montoTotal, conversion, ticketPromedio,
    ventaPromedioPorDia, mejorDia, serieDiaria,
    rankingVendedores, rankingCursos, rankingOrigenes, rankingDocentes, rankingEdiciones, rankingMedioPago, rankingModalidad,
    embudo, vendedoresConVenta: [...vendedoresConVenta], cursosConVenta: [...cursosConVenta]
  };
}

// GET /api/reportes?mes=2026-07&solicitanteEmail=...
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoReportes(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const mes = searchParams.get('mes');
  const mesAnterior = mesAnteriorDe(mes);

  const [leads, seguimiento] = await Promise.all([readSheet('Leads'), readSheet('Seguimiento')]);

  const leadsDelMes = leads.filter((l) => (l.FechaIngreso || '').slice(0, 7) === mes);
  const leadsMesAnterior = leads.filter((l) => (l.FechaIngreso || '').slice(0, 7) === mesAnterior);

  const idsDelMes = new Set(leadsDelMes.map((l) => l.ID));
  const idsMesAnterior = new Set(leadsMesAnterior.map((l) => l.ID));
  const seguimientoDelMes = seguimiento.filter((s) => idsDelMes.has(s.LeadID));
  const seguimientoMesAnterior = seguimiento.filter((s) => idsMesAnterior.has(s.LeadID));

  const actual = calcularBloque(mes, leadsDelMes, seguimientoDelMes);
  const anterior = calcularBloque(mesAnterior, leadsMesAnterior, seguimientoMesAnterior);

  // Alertas automáticas
  const alertas = [];
  if (anterior.conversion > 0 && actual.conversion < anterior.conversion * 0.8) {
    alertas.push(`Conversión de ${actual.conversion.toFixed(1)}% — bajó respecto al mes anterior (${anterior.conversion.toFixed(1)}%)`);
  }
  if (anterior.montoTotal > 0 && actual.montoTotal < anterior.montoTotal * 0.7) {
    const caida = Math.round((1 - actual.montoTotal / anterior.montoTotal) * 100);
    alertas.push(`Caída de facturación del ${caida}% respecto al mes anterior`);
  }
  const diasSinVentas = actual.serieDiaria.filter((d) => new Date().getDate() > d.dia || mes < new Date().toISOString().slice(0, 7)).filter((d) => d.ventas === 0).length;
  if (diasSinVentas >= 5) alertas.push(`${diasSinVentas} día(s) sin ventas este mes`);
  CURSOS.forEach((c) => {
    if (!actual.cursosConVenta.includes(c) && actual.totalCompras > 0) alertas.push(`"${c}" sin ventas este mes`);
  });
  EQUIPO_VENTAS.forEach((v) => {
    if (!actual.vendedoresConVenta.includes(v) && actual.totalCompras > 0) alertas.push(`${v} sin ventas registradas este mes`);
  });

  const compras = leadsDelMes.filter((l) => l.Estado === 'Comprado').map((c) => ({
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
    vendidoPor: c.VendidoPorNombre || '',
    pais: c.Pais || '',
    estado: c.Estado
  }));

  return NextResponse.json({
    mes, mesAnterior,
    ...actual,
    comparativa: {
      leads: { actual: actual.totalLeads, anterior: anterior.totalLeads },
      ventas: { actual: actual.totalCompras, anterior: anterior.totalCompras },
      conversion: { actual: actual.conversion, anterior: anterior.conversion },
      facturacion: { actual: actual.montoTotal, anterior: anterior.montoTotal },
      ticketPromedio: { actual: actual.ticketPromedio, anterior: anterior.ticketPromedio }
    },
    alertas,
    compras
  });
}
