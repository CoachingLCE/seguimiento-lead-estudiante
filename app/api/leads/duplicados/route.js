import { NextResponse } from 'next/server';
import { readSheet } from '../../../../lib/sheets';
import { findUsuario } from '../../../../lib/auth';
import { tienePermisoCrearLeads } from '../../../../lib/permisos';

function soloDigitos(v) {
  return (v || '').replace(/[^\d]/g, '');
}

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
  const whatsapp = soloDigitos(searchParams.get('whatsapp'));
  const email = (searchParams.get('email') || '').trim().toLowerCase();

  if (!nombre && !whatsapp && !email) {
    return NextResponse.json({ coincidencias: [] });
  }

  const leads = await readSheet('Leads');
  const coincidencias = leads.filter((l) => {
    const mismoWhatsapp = whatsapp && whatsapp.length >= 6 && soloDigitos(l.WhatsApp) === whatsapp;
    const mismoEmail = email && email.length >= 5 && (l.EmailEstudiante || '').trim().toLowerCase() === email;
    const nombreParecido = nombre && nombre.length >= 3 && (l.Nombre || '').trim().toLowerCase().includes(nombre);
    return mismoWhatsapp || mismoEmail || nombreParecido;
  });

  return NextResponse.json({
    coincidencias: coincidencias.slice(0, 5).map((l) => ({
      id: l.ID,
      nombre: [l.Nombre, l.Apellido].filter(Boolean).join(' '),
      curso: l.Curso || 'sin curso',
      estado: l.Estado
    }))
  });
}
