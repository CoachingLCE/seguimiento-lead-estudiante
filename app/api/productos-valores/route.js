import { NextResponse } from 'next/server';
import { readSheet, appendRow, updateRow, deleteRows } from '../../../lib/sheets';
import { findUsuario, tienePermisoProductosVer, tienePermisoProductosEditar } from '../../../lib/auth';
import { registrarAccion } from '../../../lib/auditoria';
import { parseProducto, serializeProducto } from '../../../lib/productosValores';

// GET /api/productos-valores?solicitanteEmail=... -> catálogo completo + config de niveles.
// Visible para cualquier usuario logueado (la edición es la que está restringida).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoProductosVer(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const [filas, configFilas] = await Promise.all([
      readSheet('ProductosValores'), readSheet('ProductosValoresConfig')
    ]);
    const productos = filas.map(parseProducto);
    const config = configFilas.map((c) => ({ tierId: c.TierId, label: c.Label, pct: Number(c.Pct) || 0 }));
    return NextResponse.json({ productos, config });
  } catch (err) {
    console.error('Error cargando productos y valores:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando el catálogo.' }, { status: 500 });
  }
}

// POST /api/productos-valores -> crea o actualiza un producto (por id — sin id, se crea uno nuevo).
export async function POST(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoProductosEditar(solicitante)) {
    return NextResponse.json({ error: 'No tenés permisos para realizar esta acción.' }, { status: 403 });
  }
  const nombre = (body.nombre || '').trim();
  if (!nombre) return NextResponse.json({ error: 'Falta el nombre del producto.' }, { status: 400 });

  try {
    const filas = await readSheet('ProductosValores');
    const existente = body.id ? filas.find((f) => f.id === String(body.id)) : null;
    const idFinal = existente ? existente.id : `PV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fila = serializeProducto({ ...body, nombre, actualizado: body.actualizado || new Date().toLocaleDateString('es-AR') }, idFinal);

    if (existente) {
      await updateRow('ProductosValores', existente._rowIndex, fila);
    } else {
      await appendRow('ProductosValores', fila);
    }

    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      existente ? 'Actualizó valores de un producto' : 'Creó un producto en Productos y Valores', nombre, ''
    );

    return NextResponse.json({ ok: true, id: idFinal });
  } catch (err) {
    console.error('Error guardando producto:', err);
    return NextResponse.json({ error: 'No se pudo guardar. Probá de nuevo.' }, { status: 500 });
  }
}

// DELETE /api/productos-valores -> { id, nombre, solicitanteEmail, solicitanteNombre }
export async function DELETE(request) {
  const body = await request.json();
  const solicitante = await findUsuario(body.solicitanteEmail);
  if (!tienePermisoProductosEditar(solicitante)) {
    return NextResponse.json({ error: 'No tenés permisos para realizar esta acción.' }, { status: 403 });
  }
  if (!body.id) return NextResponse.json({ error: 'Falta indicar qué eliminar.' }, { status: 400 });

  try {
    const filas = await readSheet('ProductosValores');
    const fila = filas.find((f) => f.id === String(body.id));
    if (!fila) return NextResponse.json({ error: 'No se encontró ese producto.' }, { status: 404 });

    await deleteRows('ProductosValores', [fila._rowIndex]);
    await registrarAccion(
      body.solicitanteEmail, body.solicitanteNombre,
      'Eliminó un producto de Productos y Valores', body.nombre || fila.nombre || '', ''
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error eliminando producto:', err);
    return NextResponse.json({ error: 'No se pudo eliminar. Probá de nuevo.' }, { status: 500 });
  }
}
