import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow } from '../../../../lib/sheets';
import { findUsuario, tienePermisoInformesRRSS } from '../../../../lib/auth';
import { registrarAccion } from '../../../../lib/auditoria';

// GET /api/informes-rrss/metricas?mes=2026-08&solicitanteEmail=...
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get('mes');
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (!mes) return NextResponse.json({ error: 'Falta el mes' }, { status: 400 });

  try {
    const todas = await readSheet('RRSSMetricas');
    const metricas = todas.filter((m) => m.Mes === mes);
    return NextResponse.json({ metricas });
  } catch (err) {
    console.error('Error cargando métricas RRSS:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando las métricas.' }, { status: 500 });
  }
}

// POST /api/informes-rrss/metricas -> crea o actualiza las métricas de una plataforma en un mes.
// body: { mes, plataforma, followers, reach, impressions, profileVisits, engagementRate, saves,
//         linkClicks, qualifiedLeads, solicitanteEmail, solicitanteNombre }
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoInformesRRSS(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (!body.mes || !body.plataforma) return NextResponse.json({ error: 'Falta el mes o la plataforma' }, { status: 400 });

  const ahora = new Date().toISOString();
  const fila = [
    body.mes, body.plataforma,
    body.followers || '', body.reach || '', body.impressions || '', body.profileVisits || '',
    body.engagementRate || '', body.saves || '', body.linkClicks || '', body.qualifiedLeads || '',
    body.solicitanteEmail, body.solicitanteNombre, ahora
  ];

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
}
