import { NextResponse } from 'next/server';
import { readSheet, updateRow } from '../../../../lib/sheets';
import { findUsuario } from '../../../../lib/auth';
import { registrarAccion } from '../../../../lib/auditoria';

function esValido(v) {
  return Number.isFinite(Number(v));
}

// GET /api/leads/corregir-montos?solicitanteEmail=... -> vista previa (no corrige nada)
// Busca ventas confirmadas con MontoTotal invalido (ej: guardado como texto "NaN" por un bug viejo)
// y muestra si se puede recalcular solo (CantCuotas x ValorCuota) o si necesita revisión manual.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!solicitante || !solicitante.roles.includes('Admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const leads = await readSheet('Leads');
  const rotos = leads.filter((l) => l.Estado === 'Comprado' && !esValido(l.MontoTotal));

  return NextResponse.json({
    encontrados: rotos.map((l) => ({
      id: l.ID,
      nombre: `${l.Nombre} ${l.Apellido}`,
      montoActual: l.MontoTotal,
      cantCuotas: l.CantCuotas,
      valorCuota: l.ValorCuota,
      seRecuperaSolo: esValido(l.CantCuotas) && esValido(l.ValorCuota),
      montoRecalculado: esValido(l.CantCuotas) && esValido(l.ValorCuota) ? Number(l.CantCuotas) * Number(l.ValorCuota) : null
    }))
  });
}

// POST /api/leads/corregir-montos -> corrige de verdad los que se pueden recuperar solos
// (CantCuotas x ValorCuota válidos). Los que no, quedan para editar a mano desde la ficha.
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!solicitante || !solicitante.roles.includes('Admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const leads = await readSheet('Leads');
  const rotos = leads.filter((l) =>
    l.Estado === 'Comprado' && !esValido(l.MontoTotal) && esValido(l.CantCuotas) && esValido(l.ValorCuota)
  );

  for (const l of rotos) {
    const montoNuevo = Number(l.CantCuotas) * Number(l.ValorCuota);
    await updateRow('Leads', l._rowIndex, [
      l.ID, l.Nombre, l.Apellido, l.WhatsApp, l.Curso, l.CursosAdicionales, l.Origen, l.FechaIngreso,
      l.CargadoPorEmail, l.CargadoPorNombre, l.Estado, l.FechaVenta, l.MedioPago, l.Modalidad,
      l.CantCuotas, l.ValorCuota, montoNuevo, l.Edicion, l.EmailEstudiante, l.NotasInternas,
      l.InstagramUsuario, l.Docentes, l.DetalleCuotas, l.VendidoPorNombre, l.Pais, l.Prioridad
    ]);
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      'Corrigió un monto invalido', `${l.Nombre} ${l.Apellido} — de "${l.MontoTotal}" a $${montoNuevo}`, l.ID
    );
  }

  return NextResponse.json({ corregidos: rotos.length });
}
