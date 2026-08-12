import { NextResponse } from 'next/server';
import { readSheet, appendRow } from '../../../../lib/sheets';
import { findUsuario } from '../../../../lib/auth';
import { registrarAccion } from '../../../../lib/auditoria';

// GET /api/seguimiento/baja-masiva?solicitanteEmail=... -> TODAS las bajas registradas
// (a diferencia del "LOTE BAJAS" en Seguimiento, que solo muestra las que ya cumplieron 90 días,
// esto sirve como vista de referencia de todo lo que está en camino).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!solicitante || !solicitante.roles.includes('Admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const [seguimiento, leads] = await Promise.all([readSheet('Seguimiento'), readSheet('Leads')]);
  const bajas = seguimiento
    .filter((s) => s.Lote === 'baja')
    .map((s) => {
      const lead = leads.find((l) => l.ID === s.LeadID);
      const vence = new Date(s.FechaVence);
      const fechaBajaAprox = new Date(vence.getTime() - 90 * 24 * 60 * 60 * 1000);
      const diasFaltantes = Math.ceil((vence - new Date()) / (24 * 60 * 60 * 1000));
      return {
        leadId: s.LeadID,
        nombre: lead ? `${lead.Nombre} ${lead.Apellido}` : '(lead no encontrado)',
        email: lead?.EmailEstudiante || '',
        curso: lead?.Curso || '',
        fechaBaja: fechaBajaAprox.toISOString(),
        fechaDisponible: s.FechaVence,
        diasFaltantes,
        disponibleAhora: diasFaltantes <= 0,
        contactado: s.Contactado === 'TRUE',
        observaciones: s.Observaciones || ''
      };
    })
    .sort((a, b) => new Date(a.fechaDisponible) - new Date(b.fechaDisponible));

  return NextResponse.json({ bajas });
}

// POST /api/seguimiento/baja-masiva -> carga varias bajas de una, identificando a cada persona
// por su email. body: { entradas: [{ email, fecha, motivo }], solicitanteEmail, solicitanteNombre }
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!solicitante || !solicitante.roles.includes('Admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const [leads, seguimiento] = await Promise.all([readSheet('Leads'), readSheet('Seguimiento')]);
  const yaTieneBaja = new Set(seguimiento.filter((s) => s.Lote === 'baja').map((s) => s.LeadID));

  const resultado = { procesados: [], noEncontrados: [], yaExistentes: [] };

  for (const entrada of body.entradas || []) {
    const email = (entrada.email || '').trim().toLowerCase();
    if (!email) continue;
    const lead = leads.find((l) => (l.EmailEstudiante || '').trim().toLowerCase() === email && l.Estado === 'Comprado');
    if (!lead) {
      resultado.noEncontrados.push(entrada.email);
      continue;
    }
    if (yaTieneBaja.has(lead.ID)) {
      resultado.yaExistentes.push(`${lead.Nombre} ${lead.Apellido}`);
      continue;
    }

    const fechaBaja = new Date(entrada.fecha || new Date().toISOString());
    const vence = new Date(fechaBaja.getTime() + 90 * 24 * 60 * 60 * 1000);
    vence.setHours(0, 0, 0, 0);
    await appendRow('Seguimiento', [
      lead.ID, 'baja', vence.toISOString(), '', '', 'FALSE', '',
      '', `Baja registrada el ${fechaBaja.toLocaleDateString('es-AR')}${entrada.motivo ? ` — Motivo: ${entrada.motivo}` : ''}`,
      '', ''
    ]);
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      'Registró una baja de la cursada (carga masiva)', entrada.motivo || '', lead.ID
    );
    resultado.procesados.push(`${lead.Nombre} ${lead.Apellido}`);
  }

  return NextResponse.json(resultado);
}
