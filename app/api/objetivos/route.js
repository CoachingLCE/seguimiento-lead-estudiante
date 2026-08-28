import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow } from '../../../lib/sheets';
import { findUsuario, tienePermisoReportes } from '../../../lib/auth';
import { registrarAccion } from '../../../lib/auditoria';

// GET /api/objetivos?mes=2026-08&solicitanteEmail=...
// Devuelve los objetivos generales del mes (o null si no hay ninguno definido todavía) y la
// lista de objetivos por curso de ese mismo mes.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get('mes');
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoReportes(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (!mes) return NextResponse.json({ error: 'Falta el mes' }, { status: 400 });

  try {
    const [todos, todosPorCurso, todosPorVendedor] = await Promise.all([
      readSheet('Objetivos'), readSheet('ObjetivosPorCurso'), readSheet('ObjetivosPorVendedor')
    ]);
    const fila = todos.find((o) => o.Mes === mes);
    const objetivos = fila ? {
      metaFacturacion: Number(fila.MetaFacturacion) || 0,
      metaVentas: Number(fila.MetaVentas) || 0,
      metaLeads: Number(fila.MetaLeads) || 0,
      metaConversion: Number(fila.MetaConversion) || 0,
      metaTicketPromedio: Number(fila.MetaTicketPromedio) || 0,
      actualizadoPorNombre: fila.ActualizadoPorNombre || '',
      fechaActualizacion: fila.FechaActualizacion || ''
    } : null;

    const objetivosPorCurso = todosPorCurso
      .filter((o) => o.Mes === mes)
      .map((o) => ({ curso: o.Curso, meta: Number(o.Meta) || 0 }));

    const objetivosPorVendedor = todosPorVendedor
      .filter((o) => o.Mes === mes)
      .map((o) => ({ vendedor: o.Vendedor, meta: Number(o.Meta) || 0 }));

    return NextResponse.json({ objetivos, objetivosPorCurso, objetivosPorVendedor });
  } catch (err) {
    console.error('Error cargando objetivos:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando los objetivos.' }, { status: 500 });
  }
}

// POST /api/objetivos -> crea o actualiza los objetivos de un mes. Solo Admin.
// body: { mes, metaFacturacion, metaVentas, metaLeads, metaConversion, metaTicketPromedio,
//         metasPorCurso: [{curso, meta}], solicitanteEmail, solicitanteNombre }
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!solicitante?.roles?.some((r) => ['Admin', 'Coordinador'].includes(r))) {
    return NextResponse.json({ error: 'Solo Admin o Coordinador pueden definir objetivos' }, { status: 403 });
  }
  if (!body.mes) return NextResponse.json({ error: 'Falta el mes' }, { status: 400 });

  const ahora = new Date().toISOString();
  const fila = [
    body.mes, body.metaFacturacion || 0, body.metaVentas || 0, body.metaLeads || 0,
    body.metaConversion || 0, body.metaTicketPromedio || 0,
    body.solicitanteEmail, body.solicitanteNombre, ahora
  ];

  const todos = await readSheet('Objetivos');
  const existente = todos.find((o) => o.Mes === body.mes);
  if (existente) {
    await updateRow('Objetivos', existente._rowIndex, fila);
  } else {
    await appendRow('Objetivos', fila);
  }

  // Objetivos por curso: se actualiza cada curso recibido — si ya existía una meta para ese
  // curso+mes, se pisa; si no, se crea una fila nueva. No se borran filas de cursos que no
  // vinieron en este guardado (para no perder datos si el formulario solo mandó algunos).
  if (Array.isArray(body.metasPorCurso) && body.metasPorCurso.length > 0) {
    const todosPorCurso = await readSheet('ObjetivosPorCurso');
    for (const entrada of body.metasPorCurso) {
      if (!entrada.curso) continue;
      const existentePorCurso = todosPorCurso.find((o) => o.Mes === body.mes && o.Curso === entrada.curso);
      const filaPorCurso = [body.mes, entrada.curso, entrada.meta || 0];
      if (existentePorCurso) {
        await updateRow('ObjetivosPorCurso', existentePorCurso._rowIndex, filaPorCurso);
      } else {
        await appendRow('ObjetivosPorCurso', filaPorCurso);
      }
    }
  }

  // Objetivos por vendedor: mismo criterio que por curso (upsert por mes+vendedor).
  if (Array.isArray(body.metasPorVendedor) && body.metasPorVendedor.length > 0) {
    const todosPorVendedor = await readSheet('ObjetivosPorVendedor');
    for (const entrada of body.metasPorVendedor) {
      if (!entrada.vendedor) continue;
      const existentePorVendedor = todosPorVendedor.find((o) => o.Mes === body.mes && o.Vendedor === entrada.vendedor);
      const filaPorVendedor = [body.mes, entrada.vendedor, entrada.meta || 0];
      if (existentePorVendedor) {
        await updateRow('ObjetivosPorVendedor', existentePorVendedor._rowIndex, filaPorVendedor);
      } else {
        await appendRow('ObjetivosPorVendedor', filaPorVendedor);
      }
    }
  }

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Actualizó los objetivos comerciales', body.mes, ''
  );

  return NextResponse.json({ ok: true });
}
