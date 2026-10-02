// "Nuevo seguimiento comercial": cuando un lead que ya recorrió todo el camino de Seguimiento (y
// quedó resuelto, o se le acabaron los lotes) vuelve a escribir, se le puede iniciar un CICLO
// nuevo (botón en la ficha, pestaña Seguimiento) en vez de perder o pisar el historial del
// anterior. La hoja Seguimiento guarda esto en una columna "Ciclo" (1, 2, 3…) — las filas viejas
// (de antes de que existiera esta columna) no tienen nada cargado ahí, así que se tratan como
// Ciclo 1 por default. Las filas de Lote "baja" no tienen ciclo: son un seguimiento aparte
// (reincorporación de alumnos dados de baja), no una "vuelta" de venta.
//
// Estas funciones son el único lugar que sabe interpretar esa columna — todas las pantallas que
// necesitan mostrar o actuar sobre el seguimiento ACTIVO de un lead (Seguimiento, Dashboard) pasan
// por acá, para no repetir esta lógica ni arriesgarse a que alguna quede desactualizada.

// El ciclo de una fila puntual, con el default a 1 para filas sin la columna cargada.
export function cicloDe(fila) {
  const n = parseInt(fila?.Ciclo, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// Para cada lead, cuál es su ciclo de seguimiento comercial VIGENTE: el más alto que tenga alguna
// fila de lote numérico (1 a 6). Devuelve un Map LeadID -> número de ciclo.
export function cicloVigentePorLead(seguimiento) {
  const mapa = new Map();
  seguimiento.forEach((s) => {
    if (s.Lote === 'baja') return;
    const c = cicloDe(s);
    if (!mapa.has(s.LeadID) || c > mapa.get(s.LeadID)) mapa.set(s.LeadID, c);
  });
  return mapa;
}

// Filtra un array de filas de Seguimiento para quedarse solo con las del ciclo vigente de cada
// lead (+ las de Lote "baja", que no tienen ciclo). Úsalo en cualquier pantalla de seguimiento
// ACTIVO (Seguimiento, Dashboard) para que un ciclo viejo ya cerrado (ej: terminó en "No le
// interesa") no tape ni se mezcle con un ciclo nuevo que se haya iniciado para ese mismo lead.
export function filasVigentes(seguimiento) {
  const vigentePorLead = cicloVigentePorLead(seguimiento);
  return seguimiento.filter((s) => s.Lote === 'baja' || cicloDe(s) === (vigentePorLead.get(s.LeadID) || 1));
}
