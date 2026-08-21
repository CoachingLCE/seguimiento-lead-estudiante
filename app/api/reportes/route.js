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

// Proyecta cuándo va a entrar cada cuota, asumiendo que se pagan cada 30 días exactos desde la
// venta (no hay fecha real de pago de cada cuota registrada, así que esto es una ESTIMACIÓN,
// no un dato confirmado). Para "Totalidad" es un solo ingreso, el día de la venta.
// Devuelve la serie por día para el mes pedido, sumando cualquier cuota (de ventas de este mes
// o de meses anteriores) que caiga dentro de este mes.
// Actividad por persona del mes seleccionado: leads que cargó, contactos que hizo por cada
// lote, y ventas que cerró — a diferencia de "Ventas por vendedor" (que solo mira ventas), esto
// da una foto completa de la productividad comercial de cada persona.
function calcularActividadPorPersona(mes, todosLosLeads, todoElSeguimiento, rangoDesde, rangoHasta) {
  let inicioMes, finMes;
  if (rangoDesde && rangoHasta) {
    // Filtro por un rango de fechas puntual (ej: "hoy", "ayer", "semana pasada", "mes pasado")
    // en vez de todo el mes seleccionado arriba.
    const [ai, mi, di] = rangoDesde.split('-').map(Number);
    const [af, mf, df] = rangoHasta.split('-').map(Number);
    inicioMes = new Date(ai, mi - 1, di);
    finMes = new Date(af, mf - 1, df + 1); // +1 para incluir el día "hasta" completo
  } else {
    const [anio, mesNum] = mes.split('-').map(Number);
    inicioMes = new Date(anio, mesNum - 1, 1);
    finMes = new Date(anio, mesNum, 1);
  }
  const dentroDelMes = (fechaStr) => {
    if (!fechaStr) return false;
    const f = new Date(fechaStr);
    return f >= inicioMes && f < finMes;
  };

  const porPersona = {};
  function asegurar(nombre) {
    if (!porPersona[nombre]) {
      porPersona[nombre] = {
        nombre, leadsCargados: 0,
        contactosLote1: 0, contactosLote2: 0, contactosLote3: 0, contactosLote4: 0, contactosLote5: 0, contactosLote6: 0,
        ventasCerradas: 0
      };
    }
    return porPersona[nombre];
  }

  todosLosLeads.forEach((l) => {
    if (l.Origen === 'Carga manual (baja)') return; // no son cargas reales
    if (l.CargadoPorNombre && dentroDelMes(l.FechaIngreso)) {
      asegurar(l.CargadoPorNombre).leadsCargados += 1;
    }
    if (l.VendidoPorNombre && l.Estado === 'Comprado' && dentroDelMes(l.FechaVenta)) {
      asegurar(l.VendidoPorNombre).ventasCerradas += 1;
    }
  });

  todoElSeguimiento.forEach((s) => {
    // Solo cuenta si quedó registrado quién REALMENTE hizo el contacto (columna ContactadoPorNombre,
    // agregada recién). Los contactos de antes de esa columna no se cuentan para nadie — no hay
    // forma confiable de saber quién los hizo de verdad, mejor no contarlos que atribuirlos mal.
    const responsableReal = s.ContactadoPorNombre;
    if (s.Contactado !== 'TRUE' || !responsableReal) return;
    if (!dentroDelMes(s.FechaContacto)) return;
    const p = asegurar(responsableReal);
    const campo = `contactosLote${s.Lote}`;
    if (p[campo] !== undefined) p[campo] += 1;
  });

  return Object.values(porPersona)
    .map((p) => ({
      ...p,
      totalContactos: p.contactosLote1 + p.contactosLote2 + p.contactosLote3 + p.contactosLote4 + p.contactosLote5 + p.contactosLote6
    }))
    .sort((a, b) => (b.leadsCargados + b.totalContactos + b.ventasCerradas) - (a.leadsCargados + a.totalContactos + a.ventasCerradas));
}

function calcularIngresosPorDia(mes, todosLosLeads) {
  const totalDias = diasDelMes(mes);
  const [anio, mesNum] = mes.split('-').map(Number);
  const inicioMes = new Date(anio, mesNum - 1, 1);
  const finMes = new Date(anio, mesNum, 1);

  const porDia = {};
  for (let d = 1; d <= totalDias; d++) porDia[d] = 0;

  const comprados = todosLosLeads.filter((l) => l.Estado === 'Comprado' && l.FechaVenta && l.Origen !== 'Carga manual (baja)');
  comprados.forEach((l) => {
    const fechaVenta = new Date(l.FechaVenta);
    let cuotas;
    if (l.Modalidad === 'Totalidad' || !l.CantCuotas || Number(l.CantCuotas) <= 1) {
      cuotas = [numeroValido(l.MontoTotal)];
    } else {
      const detalle = (l.DetalleCuotas || '').split(',').map((v) => Number(v.trim())).filter((v) => v > 0);
      // Por si CantCuotas tiene un valor invalido/negativo/absurdo guardado por error — nunca debe
      // romper todo el reporte por un solo registro con un dato raro.
      const cantidadSegura = Math.min(Math.max(0, Math.floor(numeroValido(l.CantCuotas))), 60);
      cuotas = detalle.length > 0
        ? detalle
        : Array(cantidadSegura).fill(numeroValido(l.ValorCuota));
    }
    cuotas.forEach((monto, i) => {
      const fechaCuota = new Date(fechaVenta.getTime() + i * 30 * 24 * 60 * 60 * 1000);
      if (fechaCuota >= inicioMes && fechaCuota < finMes) {
        porDia[fechaCuota.getDate()] += monto;
      }
    });
  });

  return Object.entries(porDia).map(([dia, monto]) => ({ dia: Number(dia), monto }));
}

// Calcula el bloque de métricas para un mes puntual: KPIs, series por día, rankings, embudo.
// Recibe los leads/seguimiento YA filtrados a ese mes para no leer el Sheet de nuevo por cada mes.
function calcularBloque(mes, leadsDelMes, seguimientoDeEsosLeads) {
  // Los registros creados automáticamente al cargar una baja de alguien que no existía en el
  // sistema (Origen "Carga manual (baja)") no son ventas reales — no deben contarse como compra
  // en ningún cálculo comercial (ni en el detalle, ni en los totales/rankings).
  const compras = leadsDelMes.filter((l) => l.Estado === 'Comprado' && l.Origen !== 'Carga manual (baja)');
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

  // Leads por curso: a diferencia de rankingCursos (que solo cuenta VENTAS), esto cuenta TODOS
  // los leads que entraron este mes, hayan comprado o no — para saber qué formaciones generan más interés.
  const conteoLeadsPorCurso = {};
  leadsDelMes.filter((l) => l.Origen !== 'Carga manual (baja)').forEach((l) => {
    const c = l.Curso || 'Sin curso definido';
    conteoLeadsPorCurso[c] = (conteoLeadsPorCurso[c] || 0) + 1;
  });
  const leadsPorCurso = Object.entries(conteoLeadsPorCurso)
    .map(([nombre, cantidad]) => ({ nombre, cantidad, porcentaje: leadsDelMes.length ? (cantidad / leadsDelMes.length) * 100 : 0 }))
    .sort((a, b) => b.cantidad - a.cantidad);

  // Leads por origen: a diferencia de rankingOrigenes (que solo cuenta VENTAS), esto cuenta TODOS
  // los leads que entraron este mes, hayan comprado o no — para saber qué canales generan más interés.
  const conteoLeadsPorOrigen = {};
  const leadsRealesDelMes = leadsDelMes.filter((l) => l.Origen !== 'Carga manual (baja)');
  leadsRealesDelMes.forEach((l) => {
    const o = l.Origen || 'Sin origen definido';
    conteoLeadsPorOrigen[o] = (conteoLeadsPorOrigen[o] || 0) + 1;
  });
  const leadsPorOrigen = Object.entries(conteoLeadsPorOrigen)
    .map(([nombre, cantidad]) => ({ nombre, cantidad, porcentaje: leadsRealesDelMes.length ? (cantidad / leadsRealesDelMes.length) * 100 : 0 }))
    .sort((a, b) => b.cantidad - a.cantidad);

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
    totalLeads: leadsDelMes.filter((l) => l.Origen !== 'Carga manual (baja)').length, totalCompras: compras.length, montoTotal, conversion, ticketPromedio,
    ventaPromedioPorDia, mejorDia, serieDiaria,
    rankingVendedores, rankingCursos, rankingOrigenes, rankingDocentes, rankingEdiciones, rankingMedioPago, rankingModalidad,
    leadsPorCurso,
    leadsPorOrigen,
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

  try {
    const [leads, seguimiento] = await Promise.all([readSheet('Leads'), readSheet('Seguimiento')]);

  const leadsDelMes = leads.filter((l) => (l.FechaIngreso || '').slice(0, 7) === mes);
  const leadsMesAnterior = leads.filter((l) => (l.FechaIngreso || '').slice(0, 7) === mesAnterior);

  const idsDelMes = new Set(leadsDelMes.map((l) => l.ID));
  const idsMesAnterior = new Set(leadsMesAnterior.map((l) => l.ID));
  const seguimientoDelMes = seguimiento.filter((s) => idsDelMes.has(s.LeadID));
  const seguimientoMesAnterior = seguimiento.filter((s) => idsMesAnterior.has(s.LeadID));

  const actual = calcularBloque(mes, leadsDelMes, seguimientoDelMes);
  const anterior = calcularBloque(mesAnterior, leadsMesAnterior, seguimientoMesAnterior);
  const ingresosPorDia = calcularIngresosPorDia(mes, leads);
  const ingresosTotalesDelMes = ingresosPorDia.reduce((acc, d) => acc + d.monto, 0);
  const diaFiltroActividad = searchParams.get('dia') || '';
  const desdeActividad = searchParams.get('desde') || diaFiltroActividad || '';
  const hastaActividad = searchParams.get('hasta') || diaFiltroActividad || '';
  const actividadPorPersona = calcularActividadPorPersona(mes, leads, seguimiento, desdeActividad, hastaActividad);

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

  const compras = leadsDelMes.filter((l) => l.Estado === 'Comprado' && l.Origen !== 'Carga manual (baja)').map((c) => ({
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
    ingresosPorDia, ingresosTotalesDelMes,
    actividadPorPersona,
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
  } catch (err) {
    console.error('Error generando reportes:', err);
    return NextResponse.json({ error: 'Ocurrió un error generando el reporte. Probá de nuevo o avisale a Diego.' }, { status: 500 });
  }
}
