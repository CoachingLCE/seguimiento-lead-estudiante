import { NextResponse } from 'next/server';
import { readSheet } from '../../../lib/sheets';
import { findUsuario, tienePermisoResumenEstudiantes } from '../../../lib/auth';

// GET /api/resumen-estudiantes?solicitanteEmail=...
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoResumenEstudiantes(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const inscritos = await readSheet('Inscritos');
  const hoyStr = new Date().toDateString();
  const esHoy = (fechaISO) => fechaISO && new Date(fechaISO).toDateString() === hoyStr;

  const altasPendientes = inscritos.filter((i) => i.AltaPlataforma !== 'TRUE').length;
  const altasHoy = inscritos.filter((i) => i.AltaPlataforma === 'TRUE' && esHoy(i.FechaAlta)).length;
  const bienvenidasPendientes = inscritos.filter((i) => i.BienvenidaEnviada !== 'TRUE').length;
  const bienvenidasHoy = inscritos.filter((i) => i.BienvenidaEnviada === 'TRUE' && esHoy(i.FechaBienvenida)).length;

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

  return NextResponse.json({
    totalEstudiantes: inscritos.length,
    altasPendientes,
    altasHoy,
    bienvenidasPendientes,
    bienvenidasHoy,
    porUsuario
  });
}
