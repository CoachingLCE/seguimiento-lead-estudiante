import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow } from '../../../lib/sheets';
import { findUsuario, tienePermisoReportes } from '../../../lib/auth';
import { registrarAccion } from '../../../lib/auditoria';

// GET /api/escala-inscripciones?solicitanteEmail=...
// Devuelve la escala completa (una sola, con "Rango de inscripciones" como escalón/orden de
// referencia y "Rango" como el rango real vigente para ese escalón) y la fecha de actualización.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoReportes(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const filas = await readSheet('EscalaInscripciones');
    const escalones = filas
      .map((f) => ({
        rowIndex: f._rowIndex,
        orden: Number(f.Orden) || 0,
        rangoInscripciones: f.RangoInscripciones || '',
        rango: f.Rango || '',
        valor: f.Valor || ''
      }))
      .sort((a, b) => a.orden - b.orden);

    const info = filas.find((f) => f.FechaActualizacion);
    const fechaActualizacion = info?.FechaActualizacion || '';

    return NextResponse.json({ escalones, fechaActualizacion });
  } catch (err) {
    console.error('Error cargando escala de inscripciones:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando la escala.' }, { status: 500 });
  }
}

// POST /api/escala-inscripciones -> reemplaza la escala completa. Solo Admin.
// body: { escalones: [{orden, rangoInscripciones, rango, valor}], fechaActualizacion,
//         solicitanteEmail, solicitanteNombre }
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!solicitante?.roles?.includes('Admin')) {
    return NextResponse.json({ error: 'Solo Admin puede editar la escala de inscripciones' }, { status: 403 });
  }
  if (!Array.isArray(body.escalones)) return NextResponse.json({ error: 'Faltan los escalones' }, { status: 400 });

  const filas = await readSheet('EscalaInscripciones');

  // Se actualiza cada escalón por su Orden (upsert) — la fecha de actualización se guarda en
  // la primera fila, junto al primer escalón, para no necesitar una hoja aparte.
  for (let i = 0; i < body.escalones.length; i++) {
    const e = body.escalones[i];
    const existente = filas.find((f) => Number(f.Orden) === e.orden);
    const filaValores = [
      e.orden, e.rangoInscripciones || '', e.rango || '', e.valor || '',
      i === 0 ? (body.fechaActualizacion || '') : (existente?.FechaActualizacion || '')
    ];
    if (existente) {
      await updateRow('EscalaInscripciones', existente._rowIndex, filaValores);
    } else {
      await appendRow('EscalaInscripciones', filaValores);
    }
  }

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Actualizó la escala de inscripciones', body.fechaActualizacion || '', ''
  );

  return NextResponse.json({ ok: true });
}
