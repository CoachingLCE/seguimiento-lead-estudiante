import { NextResponse } from 'next/server';
import { findUsuario } from '../../../lib/auth';
import { readSheet, appendRow, updateRow, deleteRows } from '../../../lib/sheets';
import { encryptPassword, decryptPassword } from '../../../lib/passwords';
import { enviarMailContraseña } from '../../../lib/mailer';
import { registrarAccion } from '../../../lib/auditoria';
import { PASSWORD_GENERICA } from '../../../lib/constants';

// GET /api/usuarios?email=...        -> valida login y devuelve el usuario/rol (usado por /api/auth/login vía findUsuario)
// GET /api/usuarios?list=true&solicitanteEmail=... -> lista completa CON la contraseña actual (solo Admin), para "Accesos"
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get('list') === 'true') {
    const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
    if (!solicitante || !solicitante.roles.includes('Admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    const usuarios = await readSheet('Usuarios');
    return NextResponse.json({
      usuarios: usuarios.map((u) => ({
        Email: u.Email,
        Nombre: u.Nombre,
        Roles: u.Roles,
        Activo: u.Activo !== 'FALSE',
        passwordActual: u.PasswordHash ? decryptPassword(u.PasswordHash) : null
      }))
    });
  }

  const email = searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Falta email' }, { status: 400 });
  }
  const usuario = await findUsuario(email);
  if (!usuario) {
    return NextResponse.json({ error: 'Email no autorizado' }, { status: 403 });
  }
  return NextResponse.json({ usuario: { email: usuario.email, nombre: usuario.nombre, roles: usuario.roles } });
}

// POST /api/usuarios -> solo Admin puede dar de alta usuarios nuevos.
// Si no se pasa "password", se usa PASSWORD_GENERICA ("Hola123"). Se envía por mail.
// body: { solicitanteEmail, nuevoEmail, nombre, roles: ['Inscripciones'], password? }
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!solicitante || !solicitante.roles.includes('Admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const password = (body.password || '').trim() || PASSWORD_GENERICA;
  const passwordEncriptada = encryptPassword(password);
  await appendRow('Usuarios', [body.nuevoEmail, body.nombre, (body.roles || []).join(','), passwordEncriptada, 'TRUE']);

  let emailEnviado = true;
  try {
    await enviarMailContraseña(body.nuevoEmail, body.nombre, password);
  } catch (err) {
    emailEnviado = false;
  }

  await registrarAccion(
    body.solicitanteEmail, solicitante.nombre,
    'Dio de alta un usuario', `${body.nombre} (${body.nuevoEmail}) — ${(body.roles || []).join(', ')}`
  );

  return NextResponse.json({ ok: true, emailEnviado });
}

// PATCH /api/usuarios -> editar un usuario existente. Solo Admin. Se puede mandar cualquier
// combinación de estos campos, todos opcionales salvo targetEmail:
// body: { solicitanteEmail, targetEmail, nuevaPassword?, nuevosRoles?, activo? }
export async function PATCH(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!solicitante || !solicitante.roles.includes('Admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const usuarios = await readSheet('Usuarios');
  const target = usuarios.find(
    (u) => (u.Email || '').toLowerCase() === (body.targetEmail || '').toLowerCase()
  );
  if (!target) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  // Protección: no permitir sacarle el rol Admin o desactivar al último administrador activo.
  const tocaQuitarAdmin =
    (body.nuevosRoles !== undefined && !body.nuevosRoles.includes('Admin') && (target.Roles || '').includes('Admin')) ||
    (body.activo === false && (target.Roles || '').includes('Admin'));
  if (tocaQuitarAdmin) {
    const admins = usuarios.filter((u) => (u.Roles || '').includes('Admin') && u.Activo !== 'FALSE');
    if (admins.length <= 1) {
      return NextResponse.json({ error: 'No se puede desactivar/sacarle el rol al último administrador del sistema.' }, { status: 400 });
    }
  }

  let passwordFinal = target.PasswordHash;
  let emailEnviado = null;
  if (body.nuevaPassword !== undefined) {
    const nuevaPassword = (body.nuevaPassword || '').trim() || PASSWORD_GENERICA;
    passwordFinal = encryptPassword(nuevaPassword);
    try {
      await enviarMailContraseña(target.Email, target.Nombre, nuevaPassword);
      emailEnviado = true;
    } catch (err) {
      emailEnviado = false;
    }
  }

  const rolesFinal = body.nuevosRoles !== undefined ? body.nuevosRoles.join(',') : target.Roles;
  const activoFinal = body.activo !== undefined ? (body.activo ? 'TRUE' : 'FALSE') : (target.Activo !== 'FALSE' ? 'TRUE' : 'FALSE');

  await updateRow('Usuarios', target._rowIndex, [target.Email, target.Nombre, rolesFinal, passwordFinal, activoFinal]);

  const cambios = [];
  if (body.nuevaPassword !== undefined) cambios.push('Restableció contraseña');
  if (body.nuevosRoles !== undefined) cambios.push(`Cambió roles a: ${rolesFinal}`);
  if (body.activo !== undefined) cambios.push(body.activo ? 'Reactivó el usuario' : 'Desactivó el usuario');

  await registrarAccion(
    body.solicitanteEmail, solicitante.nombre,
    cambios.join(' · ') || 'Editó un usuario',
    `Usuario afectado: ${target.Nombre} (${target.Email})`
  );

  return NextResponse.json({ ok: true, emailEnviado });
}

// DELETE /api/usuarios -> elimina un usuario definitivamente. Solo Admin.
// No se puede eliminar al último administrador del sistema.
// body: { solicitanteEmail, targetEmail }
export async function DELETE(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!solicitante || !solicitante.roles.includes('Admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const usuarios = await readSheet('Usuarios');
  const target = usuarios.find(
    (u) => (u.Email || '').toLowerCase() === (body.targetEmail || '').toLowerCase()
  );
  if (!target) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  if ((target.Roles || '').includes('Admin')) {
    const admins = usuarios.filter((u) => (u.Roles || '').includes('Admin'));
    if (admins.length <= 1) {
      return NextResponse.json({ error: 'No se puede eliminar al último administrador del sistema.' }, { status: 400 });
    }
  }

  await deleteRows('Usuarios', [target._rowIndex]);

  await registrarAccion(
    body.solicitanteEmail, solicitante.nombre,
    'Eliminó un usuario', `Usuario eliminado: ${target.Nombre} (${target.Email})`
  );

  return NextResponse.json({ ok: true });
}
