import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow } from '../../../../lib/sheets';
import { findUsuario, tienePermisoAcademico } from '../../../../lib/auth';
import { registrarAccion } from '../../../../lib/auditoria';

// POST /api/academico/ediciones -> crea o actualiza la fecha de inicio de una edición
// body: { curso, edicion, fechaInicio, solicitanteEmail, solicitanteNombre }
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

  if (existente) {
    await updateRow('AcademicoEdiciones', existente._rowIndex, [curso, edicion, body.fechaInicio || '']);
  } else {
    await appendRow('AcademicoEdiciones', [curso, edicion, body.fechaInicio || '']);
  }

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Actualizó la fecha de inicio de una edición', `${curso} — Edición ${edicion}`, ''
  );

  return NextResponse.json({ ok: true });
}

// PUT /api/academico/ediciones -> actualiza el formador de un curso completo
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

  await registrarAccion(
    body.solicitanteEmail, body.solicitanteNombre,
    'Actualizó el formador de un curso', `${curso} — ${body.formador || ''}`, ''
  );

  return NextResponse.json({ ok: true });
}
