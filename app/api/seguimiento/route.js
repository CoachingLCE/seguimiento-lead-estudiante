import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow } from '../../../lib/sheets';
import { findUsuario, tienePermisoOperativo } from '../../../lib/auth';
import { registrarAccion } from '../../../lib/auditoria';
import { DIAS_LOTE_2 } from '../../../lib/constants';

// Resultados que NO requieren escalar al siguiente lote (el lead ya dio una respuesta definitiva)
const RESULTADOS_FINALES = ['Interesado', 'No le interesa'];

// GET /api/seguimiento?solicitanteEmail=... -> todas las filas de seguimiento (se cruza con Leads en el front)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoOperativo(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const seguimiento = await readSheet('Seguimiento');
  return NextResponse.json({ seguimiento });
}

// PATCH /api/seguimiento -> acciones posibles según body.accion
// 1) registrar contacto:  { accion: 'contactar', leadId, lote, resultado, observaciones, proximaAccion, solicitanteEmail, solicitanteNombre }
// 2) reasignar lote:      { accion: 'reasignar', leadId, lote, nuevoEmail, nuevoNombre, solicitanteEmail, solicitanteNombre }
export async function PATCH(request) {
  const body = await request.json();
  const seguimiento = await readSheet('Seguimiento');
  const fila = seguimiento.find((s) => s.LeadID === body.leadId && s.Lote === String(body.lote));
  if (!fila) {
    return NextResponse.json({ error: 'Registro de seguimiento no encontrado' }, { status: 404 });
  }

  if (body.accion === 'reasignar') {
    const solicitante = await findUsuario(body.solicitanteEmail);
    const puedeReasignar =
      solicitante && (solicitante.roles.includes('Admin') || solicitante.roles.includes('Coordinador'));
    if (!puedeReasignar) {
      return NextResponse.json({ error: 'No autorizado para reasignar' }, { status: 403 });
    }
    await updateRow('Seguimiento', fila._rowIndex, [
      fila.LeadID, fila.Lote, fila.FechaVence, body.nuevoEmail, body.nuevoNombre,
      fila.Contactado, fila.Resultado, fila.FechaContacto, fila.Observaciones, fila.ProximaAccion
    ]);
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      `Reasignó Lote ${fila.Lote}`, `A ${body.nuevoNombre}`, fila.LeadID
    );
    return NextResponse.json({ ok: true });
  }

  if (body.accion === 'contactar') {
    const ahora = new Date();
    await updateRow('Seguimiento', fila._rowIndex, [
      fila.LeadID, fila.Lote, fila.FechaVence, fila.AsignadoAEmail, fila.AsignadoANombre,
      'TRUE', body.resultado, ahora.toISOString(),
      body.observaciones || '', body.proximaAccion || ''
    ]);

    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      `Registró contacto en Lote ${fila.Lote}`, body.resultado, fila.LeadID
    );

    // Si fue el Lote 1 y el resultado no es definitivo, se genera el Lote 2 dinámicamente
    // (vence a los 10 días desde este contacto, no desde el ingreso del lead)
    if (fila.Lote === '1' && !RESULTADOS_FINALES.includes(body.resultado)) {
      const yaExisteLote2 = seguimiento.some((s) => s.LeadID === fila.LeadID && s.Lote === '2');
      if (!yaExisteLote2) {
        const vence2 = new Date(ahora.getTime() + DIAS_LOTE_2 * 24 * 60 * 60 * 1000).toISOString();
        await appendRow('Seguimiento', [
          fila.LeadID, '2', vence2, fila.AsignadoAEmail, fila.AsignadoANombre, 'FALSE', '', '', '', ''
        ]);
      }
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
}
