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
// Si la persona no existe todavía en el sistema (era alumna pero nunca quedó cargada), se crea
// un registro mínimo de Lead + Inscrito con lo que se haya pasado, y recién ahí se registra la baja.
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!solicitante || !solicitante.roles.includes('Admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const [leads, seguimiento] = await Promise.all([readSheet('Leads'), readSheet('Seguimiento')]);
  const leadsComprados = leads.filter((l) => l.Estado === 'Comprado');
  const yaTieneBaja = new Set(seguimiento.filter((s) => s.Lote === 'baja').map((s) => s.LeadID));

  const resultado = { procesados: [], creados: [], noEncontrados: [], yaExistentes: [], ambiguos: [] };

  for (const entrada of body.entradas || []) {
    const etiqueta = entrada.nombre || entrada.email || entrada.whatsapp || '(sin datos)';
    if (!entrada.nombre && !entrada.email && !entrada.whatsapp) {
      resultado.noEncontrados.push(etiqueta);
      continue;
    }

    let candidatos = buscarEstudiante(entrada, leadsComprados);
    if (candidatos.length > 1) {
      resultado.ambiguos.push(`${etiqueta} (${candidatos.length} coincidencias — agregá curso o email para precisar)`);
      continue;
    }

    let lead = candidatos[0];
    let fueCreado = false;

    // No existe todavía: se crea un registro mínimo, ya marcado como Comprado, para que quede
    // en el sistema (Estudiantes, Reportes, etc.) y se le pueda registrar la baja.
    if (!lead) {
      if (!entrada.nombre) {
        resultado.noEncontrados.push(etiqueta);
        continue;
      }
      const fechaBaja = new Date(entrada.fecha || new Date().toISOString());
      const nuevoId = `L-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const [nombre, ...restoApellido] = entrada.nombre.trim().split(' ');
      await appendRow('Leads', [
        nuevoId, entrada.nombre.trim(), '', entrada.whatsapp || '', entrada.curso || '', '',
        'Carga manual (baja)', fechaBaja.toISOString(), body.solicitanteEmail, body.solicitanteNombre,
        'Comprado', fechaBaja.toISOString(), '', '', '', '', '',
        '', entrada.email || '', 'Alumna/o cargada manualmente al registrar su baja — no tiene historial de venta previo en el sistema.',
        '', '', '', '', '', ''
      ]);
      await appendRow('Inscritos', [
        `EST-${nuevoId}`, nuevoId, entrada.nombre.trim(), entrada.email || '', entrada.curso || '', '',
        fechaBaja.toISOString(), 'FALSE', '', '', '', 'FALSE', '', '', '', 'FALSE', '', 'FALSE', 'FALSE'
      ]);
      await registrarAccion(
        body.solicitanteEmail, body.solicitanteNombre,
        'Creó un registro manual (al no encontrarla al cargar una baja)', entrada.nombre.trim(), nuevoId
      );
      lead = { ID: nuevoId, Nombre: entrada.nombre.trim(), Apellido: '' };
      fueCreado = true;
    }

    if (!fueCreado && yaTieneBaja.has(lead.ID)) {
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
    if (fueCreado) resultado.creados.push(`${lead.Nombre} ${lead.Apellido}`.trim());
    else resultado.procesados.push(`${lead.Nombre} ${lead.Apellido}`.trim());
  }

  return NextResponse.json(resultado);
}
