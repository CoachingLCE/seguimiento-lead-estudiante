import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow } from '../../../../lib/sheets';
import { findUsuario, tienePermisoProductosEditar } from '../../../../lib/auth';
import { registrarAccion } from '../../../../lib/auditoria';

// PATCH /api/productos-valores/config -> actualiza el % (o valor) global de un nivel/config.
// body: { tierId, pct, label?, solicitanteEmail, solicitanteNombre }
// Esto es el default que se usa para todo producto que NO tenga "override" activado en ese nivel.
// Si el tierId no existe todavía (ej: la primera vez que se carga el tipo de cambio), se crea.
export async function PATCH(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoProductosEditar(solicitante)) {
    return NextResponse.json({ error: 'No tenés permisos para realizar esta acción.' }, { status: 403 });
  }
  if (!body.tierId || body.pct === undefined) return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 });

  try {
    const filas = await readSheet('ProductosValoresConfig');
    const fila = filas.find((f) => f.TierId === body.tierId);

    if (fila) {
      const nuevoLabel = body.label || fila.Label;
      await updateRow('ProductosValoresConfig', fila._rowIndex, [fila.TierId, nuevoLabel, body.pct]);
      await registrarAccion(
        body.solicitanteEmail, body.solicitanteNombre,
        'Actualizó un nivel de descuento',
        nuevoLabel !== fila.Label
          ? `"${fila.Label}" → "${nuevoLabel}", ${body.pct}%`
          : `${nuevoLabel} → ${body.pct}%`,
        ''
      );
    } else {
      await appendRow('ProductosValoresConfig', [body.tierId, body.label || body.tierId, body.pct]);
      await registrarAccion(
        body.solicitanteEmail, body.solicitanteNombre,
        'Creó un nivel de descuento nuevo', `${body.label || body.tierId} — ${body.pct}%`, ''
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error actualizando config de niveles:', err);
    return NextResponse.json({ error: 'No se pudo guardar. Probá de nuevo.' }, { status: 500 });
  }
}
