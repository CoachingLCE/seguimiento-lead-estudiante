import { NextResponse } from 'next/server';
import { findUsuario } from '../../../../lib/auth';
import { readSheet, deleteRows } from '../../../../lib/sheets';
import { registrarAccion } from '../../../../lib/auditoria';

// GET /api/leads/limpiar?creadorEmail=...&solicitanteEmail=... -> vista previa (no borra nada)
// Devuelve cuántos leads de ese creador se borrarían, y cuántos quedan afuera por estar ya vendidos.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!solicitante || !solicitante.roles.includes('Admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const creadorEmail = (searchParams.get('creadorEmail') || '').trim().toLowerCase();
  if (!creadorEmail) {
    return NextResponse.json({ error: 'Falta creadorEmail' }, { status: 400 });
  }

  const leads = await readSheet('Leads');
  const delCreador = leads.filter((l) => (l.CargadoPorEmail || '').trim().toLowerCase() === creadorEmail);
  const aBorrar = delCreador.filter((l) => l.Estado !== 'Comprado');
  const protegidos = delCreador.filter((l) => l.Estado === 'Comprado');

  return NextResponse.json({
    totalCreados: delCreador.length,
    aBorrar: aBorrar.length,
    protegidosPorVenta: protegidos.length
  });
}

// DELETE /api/leads/limpiar -> borra de verdad los leads de ese creador (y su Seguimiento asociado),
// salvo los que ya tengan una venta confirmada (esos se protegen, nunca se tocan).
// body: { creadorEmail, solicitanteEmail, solicitanteNombre }
export async function DELETE(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!solicitante || !solicitante.roles.includes('Admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const creadorEmail = (body.creadorEmail || '').trim().toLowerCase();
  if (!creadorEmail) {
    return NextResponse.json({ error: 'Falta creadorEmail' }, { status: 400 });
  }

  const [leads, seguimiento] = await Promise.all([readSheet('Leads'), readSheet('Seguimiento')]);
  const delCreador = leads.filter((l) => (l.CargadoPorEmail || '').trim().toLowerCase() === creadorEmail);
  const aBorrar = delCreador.filter((l) => l.Estado !== 'Comprado');
  const idsABorrar = new Set(aBorrar.map((l) => l.ID));

  const filasSeguimientoABorrar = seguimiento.filter((s) => idsABorrar.has(s.LeadID));

  await deleteRows('Leads', aBorrar.map((l) => l._rowIndex));
  await deleteRows('Seguimiento', filasSeguimientoABorrar.map((s) => s._rowIndex));

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Limpieza masiva de leads',
    `Se eliminaron ${aBorrar.length} lead(s) cargado(s) por ${creadorEmail} (y ${filasSeguimientoABorrar.length} fila(s) de seguimiento asociadas). ${delCreador.length - aBorrar.length} quedaron protegidos por tener venta confirmada.`
  );

  return NextResponse.json({
    eliminados: aBorrar.length,
    seguimientoEliminado: filasSeguimientoABorrar.length,
    protegidos: delCreador.length - aBorrar.length
  });
}
