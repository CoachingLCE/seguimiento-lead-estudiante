import { NextResponse } from 'next/server';
import { findUsuario } from '../../../../lib/auth';
import { verifyPassword } from '../../../../lib/passwords';
import { registrarAccion } from '../../../../lib/auditoria';

// POST /api/auth/login -> { email, password }
export async function POST(request) {
  const body = await request.json();
  const usuario = await findUsuario(body.email);

  if (!usuario) {
    return NextResponse.json({ error: 'Email no autorizado' }, { status: 403 });
  }

  if (!usuario.activo) {
    await registrarAccion(body.email, usuario.nombre, 'Intento de login rechazado', 'Usuario desactivado');
    return NextResponse.json({ error: 'Tu usuario está desactivado. Pedile a Diego que lo reactive.' }, { status: 403 });
  }

  if (!usuario.passwordHash) {
    return NextResponse.json(
      { error: 'Tu usuario todavía no tiene contraseña asignada. Pedile a Diego que te la reenvíe desde Accesos.' },
      { status: 403 }
    );
  }

  if (!verifyPassword(body.password, usuario.passwordHash)) {
    await registrarAccion(body.email, usuario.nombre, 'Intento de login fallido', 'Contraseña incorrecta');
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  await registrarAccion(body.email, usuario.nombre, 'Inició sesión', '');

  return NextResponse.json({
    usuario: { email: usuario.email, nombre: usuario.nombre, roles: usuario.roles }
  });
}
