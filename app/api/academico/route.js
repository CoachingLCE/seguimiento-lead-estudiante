import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow, deleteRows } from '../../../lib/sheets';
import { findUsuario, tienePermisoAcademico, tienePermisoAcademicoVer } from '../../../lib/auth';
import { registrarAccion } from '../../../lib/auditoria';

// Este endpoint lee 4 hojas en paralelo (incluida Leads entera, que crece sin límite) — se le da
// más margen que al default de la plataforma para que no la corte a mitad de camino.
export const maxDuration = 60;

// GET /api/academico?curso=...&solicitanteEmail=... — cualquier usuario logueado puede ver
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoAcademicoVer(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const curso = searchParams.get('curso') || '';
    // Se leen una por una (en vez de con Promise.all) — 4 pedidos simultáneos a la misma
    // planilla parecían generarle fricción a la API de Google en este endpoint puntual.
    const todos = await readSheet('Academico');
    const cursos = await readSheet('AcademicoCursos');
    const todasEdiciones = await readSheet('AcademicoEdiciones');
    const leads = await readSheet('Leads');
    const docentes = await readSheet('Docentes');
    const estudiantes = curso ? todos.filter((e) => e.Curso === curso) : todos;
    const cursosDisponibles = [...new Set(todos.map((e) => e.Curso).filter(Boolean))].sort();

    // Vínculo best-effort con los pagos reales (Leads), buscando por email — para poder mostrar
    // "Pagos" en la ficha detallada de cada edición sin duplicar esa info a mano en Académico.
    const pagosPorEmail = {};
    leads.forEach((l) => {
      if (l.Estado === 'Comprado' && l.EmailEstudiante) {
        pagosPorEmail[l.EmailEstudiante.trim().toLowerCase()] = {
          montoTotal: l.MontoTotal || '', cantCuotas: l.CantCuotas || '',
          fechaVenta: l.FechaVenta || '', medioPago: l.MedioPago || ''
        };
      }
    });

    return NextResponse.json({
      estudiantes, cursosDisponibles, cursos,
      ediciones: todasEdiciones, // TODAS, sin filtrar — el reporte institucional necesita verlas juntas
      todosLosEstudiantes: todos, // idem, para el reporte por edición (todos los cursos a la vez)
      pagosPorEmail,
      docentesActivos: docentes.filter((d) => d.Activo !== 'FALSE').map((d) => d.Nombre).filter(Boolean).sort()
    });
  } catch (err) {
    console.error('Error cargando academico:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando los datos académicos.' }, { status: 500 });
  }
}

// POST /api/academico -> carga masiva (bulk paste) de estudiantes
// body: { curso, entradas: [{ nombre, email, situacion, edicion }], solicitanteEmail, solicitanteNombre }
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoAcademico(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const curso = (body.curso || '').trim();
  if (!curso) return NextResponse.json({ error: 'Falta el curso' }, { status: 400 });

  let cargados = 0;
  for (const entrada of body.entradas || []) {
    if (!entrada.nombre) continue;
    await appendRow('Academico', [
      curso, entrada.edicion || '', entrada.nombre.trim(), (entrada.email || '').trim(), entrada.situacion || '', ''
    ]);
    cargados++;
  }

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    `Cargó ${cargados} estudiante(s) en Académico`, curso, ''
  );

  return NextResponse.json({ ok: true, cargados });
}

// PATCH /api/academico -> editar un estudiante puntual (por _rowIndex)
// body: { rowIndex, nombre, email, situacion, edicion, observaciones, solicitanteEmail, solicitanteNombre }
export async function PATCH(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoAcademico(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const todos = await readSheet('Academico');
  const fila = todos.find((e) => e._rowIndex === body.rowIndex);
  if (!fila) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await updateRow('Academico', fila._rowIndex, [
    fila.Curso, body.edicion ?? fila.Edicion, body.nombre ?? fila.NombreCompleto,
    body.email ?? fila.Email, body.situacion ?? fila.SituacionAcademica,
    body.observaciones ?? (fila.Observaciones || '')
  ]);

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Editó un registro en Académico', body.nombre || fila.NombreCompleto, ''
  );

  return NextResponse.json({ ok: true });
}

// DELETE /api/academico -> { rowIndexes: [...], solicitanteEmail, solicitanteNombre }
export async function DELETE(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoAcademico(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const rowIndexes = body.rowIndexes || [];
  if (rowIndexes.length === 0) return NextResponse.json({ error: 'No se especificó qué eliminar' }, { status: 400 });

  await deleteRows('Academico', rowIndexes);
  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    `Eliminó ${rowIndexes.length} registro(s) de Académico`, '', ''
  );

  return NextResponse.json({ ok: true });
}
