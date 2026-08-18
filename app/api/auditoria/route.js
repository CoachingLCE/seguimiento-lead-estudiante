import { NextResponse } from 'next/server';
import { readSheetCola } from '../../../lib/sheets';
import { findUsuario, tienePermisoAuditoria } from '../../../lib/auth';

// GET /api/auditoria?solicitanteEmail=...&usuario=...&desde=YYYY-MM-DD&hasta=YYYY-MM-DD
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoAuditoria(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    // Auditoria solo crece — se leen los últimos 5000 registros en vez de la hoja entera,
    // así la pantalla no se pone cada vez más lenta con el tiempo. Si se busca algo más viejo
    // que eso, puede no aparecer — para consultas muy antiguas puntuales, revisar directo en el Sheet.
    let registros = await readSheetCola('Auditoria', 5000);

    const filtroUsuario = searchParams.get('usuario');
    if (filtroUsuario) {
      registros = registros.filter((r) => r.UsuarioNombre === filtroUsuario);
    }
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    if (desde) {
      registros = registros.filter((r) => new Date(r.Fecha) >= new Date(desde + 'T00:00:00'));
    }
    if (hasta) {
      registros = registros.filter((r) => new Date(r.Fecha) <= new Date(hasta + 'T23:59:59'));
    }

    // Más reciente primero
    registros.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));

    return NextResponse.json({ registros });
  } catch (err) {
    console.error('Error cargando auditoria:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando el historial. Probá de nuevo.' }, { status: 500 });
  }
}
