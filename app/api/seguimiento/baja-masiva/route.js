import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow, deleteRows } from '../../../../lib/sheets';
import { findUsuario, tienePermisoBajas } from '../../../../lib/auth';
import { registrarAccion } from '../../../../lib/auditoria';
import { normalizarWhatsapp } from '../../../../lib/constants';

// Con muchas personas en una carga masiva, los reintentos automáticos por cuota (ver lib/sheets.js)
// pueden alargar bastante la ejecución — se le da más margen de lo normal.
export const maxDuration = 300;

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// GET /api/seguimiento/baja-masiva?solicitanteEmail=... -> TODAS las bajas registradas
// (a diferencia del "LOTE BAJAS" en Seguimiento, que solo muestra las que ya cumplieron 90 días,
// esto sirve como vista de referencia de todo lo que está en camino).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoBajas(solicitante)) {
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
      const diasDesdeLaBaja = Math.floor((new Date() - fechaBajaAprox) / (24 * 60 * 60 * 1000));
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
        observaciones: s.Observaciones || '',
        // Reactivación por mail: se habilita a los 85 días de la baja (un poco antes de los 90,
        // que es cuando aparece en el Lote Bajas de Seguimiento para contacto directo).
        listaParaReactivacion: diasDesdeLaBaja >= 85,
        mensajeEnviado: !!s.MensajeReactivacionEnviado,
        fechaMensajeEnviado: s.MensajeReactivacionEnviado || '',
        confirmoRecepcionBaja: s.ConfirmoRecepcionBaja === 'TRUE'
      };
    })
    .sort((a, b) => new Date(a.fechaDisponible) - new Date(b.fechaDisponible));

  return NextResponse.json({ bajas });
}

// Busca al estudiante con lo que haya disponible, en orden de confiabilidad:
// email exacto > WhatsApp (tolerante al "9" móvil argentino) > nombre (+ curso si hay ambigüedad).
function buscarEstudiante(entrada, leadsComprados) {
  // Se prueba en cascada (email -> whatsapp -> nombre) — si el dato más específico que trajo
  // esta carga no encuentra nada (ej: el registro existente todavía no tenía el email guardado),
  // se sigue probando con lo que queda, en vez de darlo por "no encontrado" y crear un duplicado.
  const email = (entrada.email || '').trim().toLowerCase();
  if (email) {
    const porEmail = leadsComprados.filter((l) => (l.EmailEstudiante || '').trim().toLowerCase() === email);
    if (porEmail.length > 0) return porEmail;
  }

  const whatsapp = normalizarWhatsapp(entrada.whatsapp);
  if (whatsapp && whatsapp.length >= 6) {
    const porWhatsapp = leadsComprados.filter((l) => normalizarWhatsapp(l.WhatsApp) === whatsapp);
    if (porWhatsapp.length > 0) return porWhatsapp;
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
  if (!tienePermisoBajas(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const [leads, seguimiento] = await Promise.all([readSheet('Leads'), readSheet('Seguimiento')]);
  const leadsComprados = leads.filter((l) => l.Estado === 'Comprado');
  const yaTieneBaja = new Set(seguimiento.filter((s) => s.Lote === 'baja').map((s) => s.LeadID));

  const resultado = { procesados: [], creados: [], noEncontrados: [], yaExistentes: [], ambiguos: [], errores: [] };

  for (const entrada of body.entradas || []) {
    const etiqueta = entrada.nombre || entrada.email || entrada.whatsapp || '(sin datos)';
    try {
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
        const fechaBajaNueva = new Date(entrada.fecha || new Date().toISOString());
        const nuevoId = `L-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await appendRow('Leads', [
          nuevoId, entrada.nombre.trim(), '', entrada.whatsapp || '', entrada.curso || '', '',
          'Carga manual (baja)', fechaBajaNueva.toISOString(), body.solicitanteEmail, body.solicitanteNombre,
          'Comprado', fechaBajaNueva.toISOString(), '', '', '', '', '',
          '', entrada.email || '', 'Alumna/o cargada manualmente al registrar su baja — no tiene historial de venta previo en el sistema.',
          '', '', '', '', '', ''
        ]);
        await appendRow('Inscritos', [
          `EST-${nuevoId}`, nuevoId, entrada.nombre.trim(), entrada.email || '', entrada.curso || '', '',
          fechaBajaNueva.toISOString(), 'FALSE', '', '', '', 'FALSE', '', '', '', 'FALSE', '', 'FALSE', 'FALSE'
        ]);
        await registrarAccion(
          body.solicitanteEmail, body.solicitanteNombre,
          'Creó un registro manual (al no encontrarla al cargar una baja)', entrada.nombre.trim(), nuevoId
        );
        lead = { ID: nuevoId, Nombre: entrada.nombre.trim(), Apellido: '' };
        fueCreado = true;
        // Se agrega también al set en memoria, por si esta MISMA tanda tiene otra entrada
        // que coincida con la persona recién creada (evita duplicar en el mismo envío).
        leadsComprados.push({ ...lead, EmailEstudiante: entrada.email || '', WhatsApp: entrada.whatsapp || '', Curso: entrada.curso || '' });
      }

      if (!fueCreado && yaTieneBaja.has(lead.ID)) {
        // Si esta vez vino el email y antes no lo tenía cargado, se aprovecha para completarlo
        // — así el mail de reactivación (Acción 1) va a poder mandarse cuando llegue el momento.
        if (entrada.email && !lead.EmailEstudiante && lead._rowIndex) {
          await updateRow('Leads', lead._rowIndex, [
            lead.ID, lead.Nombre, lead.Apellido, lead.WhatsApp || '', lead.Curso || '', lead.CursosAdicionales || '',
            lead.Origen || '', lead.FechaIngreso || '', lead.CargadoPorEmail || '', lead.CargadoPorNombre || '',
            lead.Estado || '', lead.FechaVenta || '', lead.MedioPago || '', lead.Modalidad || '',
            lead.CantCuotas || '', lead.ValorCuota || '', lead.MontoTotal || '', lead.Edicion || '',
            entrada.email, lead.NotasInternas || '', lead.InstagramUsuario || '', lead.Docentes || '',
            lead.DetalleCuotas || '', lead.VendidoPorNombre || '', lead.Pais || ''
          ]);
          await registrarAccion(
            body.solicitanteEmail, body.solicitanteNombre,
            'Completó el email al recargar una baja ya existente', `${lead.Nombre} ${lead.Apellido}`, lead.ID
          );
        }
        resultado.yaExistentes.push(`${lead.Nombre} ${lead.Apellido}`);
        continue;
      }

      const fechaBaja = new Date(entrada.fecha || new Date().toISOString());
      const vence = new Date(fechaBaja.getTime() + 90 * 24 * 60 * 60 * 1000);
      vence.setHours(0, 0, 0, 0);
      await appendRow('Seguimiento', [
        lead.ID, 'baja', vence.toISOString(), '', '', 'FALSE', '',
        '', `Baja registrada el ${fechaBaja.toLocaleDateString('es-AR')}${entrada.motivo ? ` — Motivo: ${entrada.motivo}` : ''}`,
        '', '', '', '', ''
      ]);
      yaTieneBaja.add(lead.ID);
      await registrarAccion(
        body.solicitanteEmail, body.solicitanteNombre,
        'Registró una baja de la cursada (carga masiva)', entrada.motivo || '', lead.ID
      );
      if (fueCreado) resultado.creados.push(`${lead.Nombre} ${lead.Apellido}`.trim());
      else resultado.procesados.push(`${lead.Nombre} ${lead.Apellido}`.trim());
    } catch (err) {
      console.error(`Error procesando entrada de baja (${etiqueta}):`, err);
      resultado.errores.push(`${etiqueta}: ${err.message || 'error desconocido'}`);
    }
    // Cada persona hace varias escrituras seguidas a Google Sheets (Leads, Inscritos, Seguimiento,
    // Auditoría) — en una carga masiva grande, hacerlas todas sin pausa dispara el límite de
    // "escrituras por minuto" de la API de Google y el resto de la tanda falla con timeout.
    await esperar(400);
  }

  return NextResponse.json(resultado);
}

// DELETE /api/seguimiento/baja-masiva -> { leadIds: [...], solicitanteEmail, solicitanteNombre }
// Borra solo la fila de "baja" en Seguimiento (deja de aparecer en esta lista y en el Lote Bajas),
// sin tocar el lead ni su historial — por si se cargó por error o ya no corresponde.
export async function DELETE(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoBajas(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const leadIds = new Set(body.leadIds || []);
  if (leadIds.size === 0) {
    return NextResponse.json({ error: 'No se especificó qué eliminar' }, { status: 400 });
  }

  const [seguimiento, leads] = await Promise.all([readSheet('Seguimiento'), readSheet('Leads')]);
  const filasABorrar = seguimiento.filter((s) => s.Lote === 'baja' && leadIds.has(s.LeadID));
  if (filasABorrar.length === 0) {
    return NextResponse.json({ error: 'No se encontró esa baja' }, { status: 404 });
  }

  await deleteRows('Seguimiento', filasABorrar.map((f) => f._rowIndex));

  for (const fila of filasABorrar) {
    const lead = leads.find((l) => l.ID === fila.LeadID);
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      'Eliminó una baja registrada', lead ? `${lead.Nombre} ${lead.Apellido}` : '', fila.LeadID
    );
  }

  return NextResponse.json({ ok: true, eliminadas: filasABorrar.length });
}
