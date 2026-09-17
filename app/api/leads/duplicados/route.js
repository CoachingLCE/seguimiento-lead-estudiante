import { NextResponse } from 'next/server';
import { readSheet } from '../../../../lib/sheets';
import { findUsuario } from '../../../../lib/auth';
import { tienePermisoCrearLeads } from '../../../../lib/permisos';
import { normalizarWhatsapp } from '../../../../lib/constants';

// GET /api/leads/duplicados?nombre=...&whatsapp=...&email=...&solicitanteEmail=...
// Devuelve solo lo mínimo necesario para mostrar el aviso de duplicado — no expone la lista completa
// de leads (a diferencia de /api/leads, que requiere permiso operativo más amplio).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoCrearLeads(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const nombre = (searchParams.get('nombre') || '').trim().toLowerCase();
  const whatsapp = normalizarWhatsapp(searchParams.get('whatsapp'));
  const email = (searchParams.get('email') || '').trim().toLowerCase();

  // Nombres "placeholder" (vacío, o el literal "sin nombre" que se usa para cargar un lead solo
  // con el número) NO deben contar como coincidencia de nombre — si no, dos leads sin nombre
  // cualquiera aparecen como "duplicados" entre sí aunque sean personas totalmente distintas,
  // y esa coincidencia débil puede tapar una coincidencia real y más fuerte (mismo WhatsApp/email).
  const NOMBRES_PLACEHOLDER = ['', 'sin nombre'];
  const nombreEsValido = nombre.length >= 3 && !NOMBRES_PLACEHOLDER.includes(nombre);

  if (!nombreEsValido && !whatsapp && !email) {
    return NextResponse.json({ coincidencias: [] });
  }

  // Fuerza de la coincidencia: WhatsApp/email (dato exacto) siempre pesa más que un nombre
  // parecido (dato débil) — así, si hay varias coincidencias, la que se muestra primero
  // (coincidencias[0] en el front) es siempre la más confiable, no la primera que aparezca
  // en la hoja por casualidad de orden.
  function fuerzaCoincidencia(l) {
    if (whatsapp && whatsapp.length >= 6 && normalizarWhatsapp(l.WhatsApp) === whatsapp) return 3;
    if (email && email.length >= 5 && (l.EmailEstudiante || '').trim().toLowerCase() === email) return 2;
    if (nombreEsValido && (l.Nombre || '').trim().toLowerCase().includes(nombre)) return 1;
    return 0;
  }

  const leads = await readSheet('Leads');
  const coincidencias = leads
    .map((l) => ({ l, fuerza: fuerzaCoincidencia(l) }))
    .filter((x) => x.fuerza > 0)
    .sort((a, b) => b.fuerza - a.fuerza)
    .map((x) => x.l);

  function motivo(l) {
    if (whatsapp && whatsapp.length >= 6 && normalizarWhatsapp(l.WhatsApp) === whatsapp) return 'Mismo WhatsApp';
    if (email && email.length >= 5 && (l.EmailEstudiante || '').trim().toLowerCase() === email) return 'Mismo email';
    return 'Nombre parecido';
  }

  let seguimiento = [];
  if (coincidencias.length > 0) {
    seguimiento = await readSheet('Seguimiento');
  }

  return NextResponse.json({
    coincidencias: coincidencias.slice(0, 5).map((l) => {
      const filasLead = seguimiento
        .filter((s) => s.LeadID === l.ID)
        .sort((a, b) => new Date(b.FechaVence) - new Date(a.FechaVence));
      const conResponsable = filasLead.find((s) => s.AsignadoANombre);
      const conResultado = filasLead
        .filter((s) => s.Resultado)
        .sort((a, b) => new Date(b.FechaContacto || 0) - new Date(a.FechaContacto || 0))[0];

      return {
        id: l.ID,
        nombre: [l.Nombre, l.Apellido].filter(Boolean).join(' '),
        curso: l.Curso || 'sin curso',
        estado: l.Estado,
        whatsapp: l.WhatsApp || '',
        responsable: conResponsable?.AsignadoANombre || '',
        ultimaGestion: conResultado ? `${conResultado.Resultado}` : '',
        motivo: motivo(l)
      };
    })
  });
}
