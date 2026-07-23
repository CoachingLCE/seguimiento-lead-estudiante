import { NextResponse } from 'next/server';
import { findUsuario } from '../../../lib/auth';
import { readSheet, appendRow, updateRow } from '../../../lib/sheets';
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
  await appendRow('Usuarios', [body.nuevoEmail, body.nombre, (body.roles || []).join(','), passwordEncriptada]);

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

// PATCH /api/usuarios -> resetea la contraseña de un usuario existente (a la que se pase, o a PASSWORD_GENERICA) y reenvía el mail.
// Solo Admin. body: { solicitanteEmail, targetEmail, nuevaPassword? }
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

  const nuevaPassword = (body.nuevaPassword || '').trim() || PASSWORD_GENERICA;
  const passwordEncriptada = encryptPassword(nuevaPassword);
  await updateRow('Usuarios', target._rowIndex, [target.Email, target.Nombre, target.Roles, passwordEncriptada]);

  let emailEnviado = true;
  try {
    await enviarMailContraseña(target.Email, target.Nombre, nuevaPassword);
  } catch (err) {
    emailEnviado = false;
  }

  await registrarAccion(
    body.solicitanteEmail, solicitante.nombre,
    'Restableció contraseña', `Usuario afectado: ${target.Nombre} (${target.Email})`
  );

  return NextResponse.json({ ok: true, emailEnviado });
}
