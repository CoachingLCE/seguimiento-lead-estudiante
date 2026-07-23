import { NextResponse } from 'next/server';
import { findUsuario } from '../../../../lib/auth';
import { verifyPassword } from '../../../../lib/passwords';

// POST /api/auth/login -> { email, password }
export async function POST(request) {
  const body = await request.json();
  const usuario = await findUsuario(body.email);

  if (!usuario) {
    return NextResponse.json({ error: 'Email no autorizado' }, { status: 403 });
  }

  if (!usuario.passwordHash) {
    return NextResponse.json(
      { error: 'Tu usuario todavía no tiene contraseña asignada. Pedile a Diego que te la reenvíe desde Accesos.' },
      { status: 403 }
    );
  }

  if (!verifyPassword(body.password, usuario.passwordHash)) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  return NextResponse.json({
    usuario: { email: usuario.email, nombre: usuario.nombre, roles: usuario.roles }
  });
}
