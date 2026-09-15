import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow } from '../../../../lib/sheets';
import { findUsuario, tienePermisoInformesRRSS } from '../../../../lib/auth';
import { registrarAccion } from '../../../../lib/auditoria';

// GET /api/informes-rrss/metricas?mes=2026-08&solicitanteEmail=...
// GET /api/informes-rrss/metricas?desde=2026-01&hasta=2026-12&solicitanteEmail=... (rango, para
// los gráficos de Evolución y el Informe anual — evita pedir mes por mes en paralelo)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get('mes');
  const desde = searchParams.get('desde');
  const hasta = searchParams.get('hasta');
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (!mes && !(desde && hasta)) return NextResponse.json({ error: 'Falta el mes (o el rango desde/hasta)' }, { status: 400 });

  try {
    const todas = await readSheet('RRSSMetricas');
    const metricas = mes
      ? todas.filter((m) => m.Mes === mes)
      : todas.filter((m) => m.Mes >= desde && m.Mes <= hasta); // "YYYY-MM" ordena bien como texto
    return NextResponse.json({ metricas });
  } catch (err) {
    console.error('Error cargando métricas RRSS:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando las métricas.' }, { status: 500 });
  }
}

// Campos enteros ≥ 0 — vacío es válido (todavía no se cargó ese dato).
const CAMPOS_ENTERO = ['followers', 'reach', 'impressions', 'profileVisits', 'saves', 'linkClicks', 'qualifiedLeads'];

function validarMetricas(body) {
  for (const campo of CAMPOS_ENTERO) {
    const v = body[campo];
    if (v === '' || v === undefined || v === null) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      return `El campo "${campo}" tiene que ser un número entero de 0 para arriba.`;
    }
  }
  if (body.engagementRate !== '' && body.engagementRate !== undefined && body.engagementRate !== null) {
    const n = Number(body.engagementRate);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return 'El engagement tiene que ser un número entre 0 y 100.';
    }
  }
  return null;
}

// POST /api/informes-rrss/metricas -> crea o actualiza las métricas de una plataforma en un mes.
// body: { mes, plataforma, followers, reach, impressions, profileVisits, engagementRate, saves,
//         linkClicks, qualifiedLeads, solicitanteEmail, solicitanteNombre }
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No tenés permisos para realizar esta acción.' }, { status: 403 });
  }
  if (!body.mes || !body.plataforma) return NextResponse.json({ error: 'Falta el mes o la plataforma.' }, { status: 400 });

  const errorValidacion = validarMetricas(body);
  if (errorValidacion) return NextResponse.json({ error: errorValidacion }, { status: 400 });

  const ahora = new Date().toISOString();
  // ?? en vez de || — así un 0 cargado a propósito (ej: 0 leads calificados) no se pierde como
  // si fuera un campo vacío.
  const fila = [
    body.mes, body.plataforma,
    body.followers ?? '', body.reach ?? '', body.impressions ?? '', body.profileVisits ?? '',
    body.engagementRate ?? '', body.saves ?? '', body.linkClicks ?? '', body.qualifiedLeads ?? '',
    body.solicitanteEmail, body.solicitanteNombre, ahora
  ];

  try {
    const todas = await readSheet('RRSSMetricas');
    const existente = todas.find((m) => m.Mes === body.mes && m.Plataforma === body.plataforma);
    if (existente) {
      await updateRow('RRSSMetricas', existente._rowIndex, fila);
    } else {
      await appendRow('RRSSMetricas', fila);
    }

    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      'Actualizó métricas de RRSS', `${body.plataforma} — ${body.mes}`, ''
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error guardando métricas RRSS:', err);
    return NextResponse.json({ error: 'No se pudo guardar. Probá de nuevo.' }, { status: 500 });
  }
}
