import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow } from '../../../../lib/sheets';
import { findUsuario, tienePermisoAcademico } from '../../../../lib/auth';
import { registrarAccion } from '../../../../lib/auditoria';

// POST /api/academico/ediciones -> crea o actualiza la fecha de inicio y/o el formador de una
// edición puntual. El formador se guarda por EDICIÓN (no por curso completo), porque hay cursos
// como Oratoria donde distintas ediciones tienen distintos formadores.
// body: { curso, edicion, fechaInicio?, formador?, solicitanteEmail, solicitanteNombre }
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoAcademico(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const curso = (body.curso || '').trim();
  const edicion = (body.edicion || '').trim();
  if (!curso || !edicion) return NextResponse.json({ error: 'Falta curso o edición' }, { status: 400 });

  const ediciones = await readSheet('AcademicoEdiciones');
  const existente = ediciones.find((e) => e.Curso === curso && e.Edicion === edicion);

  const fechaInicio = body.fechaInicio !== undefined ? body.fechaInicio : (existente?.FechaInicio || '');
  const formador = body.formador !== undefined ? body.formador : (existente?.Formador || '');

  if (existente) {
    await updateRow('AcademicoEdiciones', existente._rowIndex, [curso, edicion, fechaInicio, formador]);
  } else {
    await appendRow('AcademicoEdiciones', [curso, edicion, fechaInicio, formador]);
  }

  // Si el formador es un nombre que no estaba en la lista de Docentes, se agrega solo — así la
  // próxima vez que alguien abra el desplegable, ya aparece ahí sin que nadie tenga que mantener
  // esa lista a mano.
  if (formador) {
    const docentes = await readSheet('Docentes');
    const yaExiste = docentes.some((d) => (d.Nombre || '').trim().toLowerCase() === formador.trim().toLowerCase());
    if (!yaExiste) {
      await appendRow('Docentes', [formador, 'TRUE']);
    }
  }

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    body.formador !== undefined ? 'Actualizó el formador de una edición' : 'Actualizó la fecha de inicio de una edición',
    `${curso} — Edición ${edicion}`, ''
  );

  return NextResponse.json({ ok: true });
}

// PUT /api/academico/ediciones -> actualiza el formador POR DEFECTO de un curso completo (se usa
// solo cuando una edición puntual no tiene su propio formador definido — para cursos como
// Oratoria, que sí varían por edición, conviene dejar esto vacío y definir cada una a mano).
// body: { curso, formador, solicitanteEmail, solicitanteNombre }
export async function PUT(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoAcademico(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const curso = (body.curso || '').trim();
  if (!curso) return NextResponse.json({ error: 'Falta el curso' }, { status: 400 });

  const cursos = await readSheet('AcademicoCursos');
  const existente = cursos.find((c) => c.Curso === curso);

  if (existente) {
    await updateRow('AcademicoCursos', existente._rowIndex, [curso, body.formador || '']);
  } else {
    await appendRow('AcademicoCursos', [curso, body.formador || '']);
  }

  if (body.formador) {
    const docentes = await readSheet('Docentes');
    const yaExiste = docentes.some((d) => (d.Nombre || '').trim().toLowerCase() === body.formador.trim().toLowerCase());
    if (!yaExiste) {
      await appendRow('Docentes', [body.formador, 'TRUE']);
    }
  }

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Actualizó el formador por defecto de un curso', `${curso} — ${body.formador || ''}`, ''
  );

  return NextResponse.json({ ok: true });
}
