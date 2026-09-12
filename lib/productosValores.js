// Helpers compartidos para parsear/armar filas de la hoja "ProductosValores".
// El orden de estas 25 columnas tiene que coincidir EXACTO con la fila 1 del Sheet.
export const COLUMNAS_PRODUCTOS = [
  'id', 'nombre', 'modalidad', 'estado', 'valorLista', 'valorUnPago', 'precioExterior', 'margen',
  'ventasMes', 'actualizado', 'proximaActualizacion', 'proximaEdicion', 'landing', 'descripcion',
  'publicoObjetivo', 'duracion', 'descuentosJSON', 'beneficiosJSON', 'cuotasEscalonadasJSON',
  'esVariante', 'varianteDeId', 'motivo', 'sinNiveles', 'mediosDePagoJSON', 'archivado'
];

function jsonSeguro(texto, porDefecto) {
  if (!texto) return porDefecto;
  try { return JSON.parse(texto); } catch { return porDefecto; }
}

// Los medios de pago vienen en 2 formatos distintos según cuándo se cargaron (antes era un link
// directo como texto, ahora es {link, valor}) — se normaliza todo a {link, valor} al leer.
function normalizarMediosDePago(obj) {
  const normalizado = {};
  Object.entries(obj || {}).forEach(([clave, v]) => {
    normalizado[clave] = typeof v === 'string' ? { link: v, valor: null } : { link: v?.link || '', valor: v?.valor ?? null };
  });
  return normalizado;
}

export function parseProducto(row) {
  return {
    id: row.id,
    nombre: row.nombre || '',
    modalidad: row.modalidad || '',
    estado: row.estado || 'Activo',
    valorLista: row.valorLista ? Number(row.valorLista) : 0,
    valorUnPago: row.valorUnPago ? Number(row.valorUnPago) : null,
    precioExterior: row.precioExterior ? Number(row.precioExterior) : null,
    margen: row.margen ? Number(row.margen) : null,
    ventasMes: row.ventasMes ? Number(row.ventasMes) : 0,
    actualizado: row.actualizado || '',
    proximaActualizacion: row.proximaActualizacion || '',
    proximaEdicion: row.proximaEdicion || '',
    landing: row.landing || '',
    descripcion: row.descripcion || '',
    publicoObjetivo: row.publicoObjetivo || '',
    duracion: row.duracion || '',
    descuentos: jsonSeguro(row.descuentosJSON, {}),
    beneficios: jsonSeguro(row.beneficiosJSON, []),
    cuotasEscalonadas: jsonSeguro(row.cuotasEscalonadasJSON, []),
    esVariante: row.esVariante === 'TRUE' || row.esVariante === true,
    varianteDeId: row.varianteDeId || '',
    motivo: row.motivo || '',
    sinNiveles: row.sinNiveles === 'TRUE' || row.sinNiveles === true,
    mediosDePago: normalizarMediosDePago(jsonSeguro(row.mediosDePagoJSON, {})),
    archivado: row.archivado === 'TRUE' || row.archivado === true,
    _rowIndex: row._rowIndex
  };
}

// Arma la fila plana (en el mismo orden que COLUMNAS_PRODUCTOS) a partir de lo que manda el form.
export function serializeProducto(body, idFinal) {
  return [
    idFinal, body.nombre || '', body.modalidad || '', body.estado || 'Activo',
    body.valorLista ?? '', body.valorUnPago ?? '', body.precioExterior ?? '', body.margen ?? '',
    body.ventasMes ?? '', body.actualizado || '', body.proximaActualizacion || '', body.proximaEdicion || '',
    body.landing || '', body.descripcion || '', body.publicoObjetivo || '', body.duracion || '',
    JSON.stringify(body.descuentos || {}), JSON.stringify(body.beneficios || []), JSON.stringify(body.cuotasEscalonadas || []),
    body.esVariante ? 'TRUE' : 'FALSE', body.varianteDeId || '', body.motivo || '',
    body.sinNiveles ? 'TRUE' : 'FALSE', JSON.stringify(body.mediosDePago || {}), body.archivado ? 'TRUE' : 'FALSE'
  ];
}
