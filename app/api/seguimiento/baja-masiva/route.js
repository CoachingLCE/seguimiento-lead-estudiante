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

function soloDigitos(v) {
  return (v || '').replace(/[^\d]/g, '');
}

// Busca al estudiante con lo que haya disponible, en orden de confiabilidad:
// email exacto > WhatsApp exacto > nombre (+ curso si hay más de un resultado por nombre).
function buscarEstudiante(entrada, leadsComprados) {
  const email = (entrada.email || '').trim().toLowerCase();
  if (email) {
    return leadsComprados.filter((l) => (l.EmailEstudiante || '').trim().toLowerCase() === email);
  }
  const whatsapp = soloDigitos(entrada.whatsapp);
  if (whatsapp && whatsapp.length >= 6) {
    return leadsComprados.filter((l) => soloDigitos(l.WhatsApp) === whatsapp);
  }
  const nombre = (entrada.nombre || '').trim().toLowerCase();
  if (nombre) {
    let candidatos = leadsComprados.filter((l) => `${l.Nombre} ${l.Apellido}`.trim().toLowerCase() === nombre);
    if (candidatos.length > 1 && entrada.curso) {
      const curso = entrada.curso.trim().toLowerCase();
      candidatos = candidatos.filter((l) => (l.Curso || '').toLowerCase() === curso);
    }
    return candidatos;
  }
  return [];
}

// POST /api/seguimiento/baja-masiva -> carga varias bajas de una. Cada entrada puede tener
// cualquier combinación de estos datos (todos opcionales, con al menos uno para poder identificar
// a la persona): { nombre, curso, email, whatsapp, fecha, motivo }
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!solicitante || !solicitante.roles.includes('Admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const [leads, seguimiento] = await Promise.all([readSheet('Leads'), readSheet('Seguimiento')]);
  const leadsComprados = leads.filter((l) => l.Estado === 'Comprado');
  const yaTieneBaja = new Set(seguimiento.filter((s) => s.Lote === 'baja').map((s) => s.LeadID));

  const resultado = { procesados: [], noEncontrados: [], yaExistentes: [], ambiguos: [] };

  for (const entrada of body.entradas || []) {
    const etiqueta = entrada.nombre || entrada.email || entrada.whatsapp || '(sin datos)';
    if (!entrada.nombre && !entrada.email && !entrada.whatsapp) {
      resultado.noEncontrados.push(etiqueta);
      continue;
    }

    const candidatos = buscarEstudiante(entrada, leadsComprados);
    if (candidatos.length === 0) {
      resultado.noEncontrados.push(etiqueta);
      continue;
    }
    if (candidatos.length > 1) {
      resultado.ambiguos.push(`${etiqueta} (${candidatos.length} coincidencias — agregá curso o email para precisar)`);
      continue;
    }

    const lead = candidatos[0];
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
