import { NextResponse } from 'next/server';
import { readSheet } from '../../../lib/sheets';
import { findUsuario, tienePermisoResumenEstudiantes } from '../../../lib/auth';
import { normalizarEdicion } from '../../../lib/constants';

// GET /api/resumen-estudiantes?solicitanteEmail=...&mes=2026-08 (mes opcional — sin él, es todo el histórico)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoResumenEstudiantes(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const mes = searchParams.get('mes') || '';

  const [inscritosSinFiltrar, leads] = await Promise.all([readSheet('Inscritos'), readSheet('Leads')]);
  // Los registros creados automáticamente al cargar una baja de alguien que no existía en el
  // sistema (Origen "Carga manual (baja)") no son estudiantes reales — no deben contarse acá.
  const idsCargaManualBaja = new Set(
    leads.filter((l) => l.Origen === 'Carga manual (baja)').map((l) => l.ID)
  );
  const inscritos = inscritosSinFiltrar
    .filter((i) => !idsCargaManualBaja.has(i.LeadId))
    .filter((i) => !mes || (i.FechaInscripcion || '').slice(0, 7) === mes);
  const hoyStr = new Date().toDateString();
  const esHoy = (fechaISO) => fechaISO && new Date(fechaISO).toDateString() === hoyStr;

  const altasPendientes = inscritos.filter((i) => i.AltaPlataforma !== 'TRUE').length;
  const altasHoy = inscritos.filter((i) => i.AltaPlataforma === 'TRUE' && esHoy(i.FechaAlta)).length;
  const bienvenidasPendientes = inscritos.filter((i) => i.BienvenidaEnviada !== 'TRUE').length;
  const bienvenidasHoy = inscritos.filter((i) => i.BienvenidaEnviada === 'TRUE' && esHoy(i.FechaBienvenida)).length;
  const confirmaronRecepcion = inscritos.filter((i) => i.ConfirmoRecepcion === 'TRUE').length;
  const enGrupoWhatsapp = inscritos.filter((i) => i.GrupoWhatsApp === 'TRUE').length;

  // Estudiantes por curso — para ver de un vistazo qué formaciones están creciendo más.
  const conteoPorCurso = {};
  inscritos.forEach((i) => {
    const c = i.Curso || 'Sin curso definido';
    conteoPorCurso[c] = (conteoPorCurso[c] || 0) + 1;
  });
  const porCurso = Object.entries(conteoPorCurso)
    .map(([curso, cantidad]) => ({ curso, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  // Estudiantes por edición dentro de cada curso (ej: "Coaching Educativo — Edición 12")
  // Normaliza "edición 16" / "Edición 16" / "EDICIÓN 16" a "Edición 16" — si no, se agrupan
  // como cosas distintas por una simple diferencia de mayúscula/minúscula al tipearlo.
  const conteoPorEdicion = {};
  inscritos.forEach((i) => {
    const clave = `${i.Curso || 'Sin curso definido'} — ${normalizarEdicion(i.Edicion) || 'Sin edición'}`;
    conteoPorEdicion[clave] = (conteoPorEdicion[clave] || 0) + 1;
  });
  const porEdicion = Object.entries(conteoPorEdicion)
    .map(([edicion, cantidad]) => ({ edicion, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const porUsuario = {};
  const sumar = (nombre, campo) => {
    if (!nombre) return;
    porUsuario[nombre] = porUsuario[nombre] || { altas: 0, bienvenidas: 0 };
    porUsuario[nombre][campo] += 1;
  };
  inscritos.forEach((i) => {
    if (i.AltaPlataforma === 'TRUE') sumar(i.AltaPorNombre, 'altas');
    if (i.BienvenidaEnviada === 'TRUE') sumar(i.BienvenidaPorNombre, 'bienvenidas');
  });

  const mesesDisponibles = [...new Set(
    inscritosSinFiltrar.filter((i) => !idsCargaManualBaja.has(i.LeadId)).map((i) => (i.FechaInscripcion || '').slice(0, 7)).filter(Boolean)
  )].sort((a, b) => b.localeCompare(a));

  return NextResponse.json({
    totalEstudiantes: inscritos.length,
    altasPendientes,
    altasHoy,
    bienvenidasPendientes,
    bienvenidasHoy,
    confirmaronRecepcion,
    enGrupoWhatsapp,
    porCurso,
    porEdicion,
    porUsuario,
    mesesDisponibles
  });
}
