import { NextResponse } from 'next/server';
import { readSheetCola } from '../../../lib/sheets';
import { findUsuario, tienePermisoAuditoria } from '../../../lib/auth';
import { paginaDeHistorial } from '../../../lib/historialMeses';

// GET /api/auditoria?solicitanteEmail=...&usuario=...&desde=YYYY-MM-DD&hasta=YYYY-MM-DD&mes=YYYY-MM&todo=1
// Historial MES A MES (pedido de Diego): sin filtros devuelve solo UN mes (el actual, o el último que tenga movimientos; con `mes=` se
// pide otro), más la lista de meses con movimientos y cuántos tiene cada uno. Con `todo=1` o con filtros (usuario, desde, hasta) devuelve
// todo lo que coincide, de cualquier mes, para que una búsqueda o un filtro por persona no se pierda movimientos viejos.
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
    const todos = await readSheetCola('Auditoria', 5000);
    const usuarios = [...new Set(todos.map((r) => r.UsuarioNombre).filter(Boolean))].sort();

    const filtroUsuario = searchParams.get('usuario');
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const pagina = paginaDeHistorial({
      registros: todos, campoFecha: 'Fecha', mes: searchParams.get('mes'), todo: searchParams.get('todo') === '1',
      hayFiltros: !!(filtroUsuario || desde || hasta),
      filtrar: (lista) => {
        let r = lista;
        if (filtroUsuario) r = r.filter((x) => x.UsuarioNombre === filtroUsuario);
        if (desde) r = r.filter((x) => new Date(x.Fecha) >= new Date(desde + 'T00:00:00'));
        if (hasta) r = r.filter((x) => new Date(x.Fecha) <= new Date(hasta + 'T23:59:59'));
        return r;
      }
    });

    return NextResponse.json({ registros: pagina.registros, meses: pagina.meses, mes: pagina.mes, usuarios });
  } catch (err) {
    console.error('Error cargando auditoria:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando el historial. Probá de nuevo.' }, { status: 500 });
  }
}
