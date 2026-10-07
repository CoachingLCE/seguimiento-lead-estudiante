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

// "Lote único" (pedido de Alex, equipo de Inscripciones): cada lead tiene que estar en UN solo lote a la
// vez —el más avanzado que ya le toca—. Antes, cada lote era una fila independiente: contactar a alguien por
// el Lote 4 no cerraba el Lote 2 o el 3 que seguían pendientes, así que el lead seguía apareciendo en las
// listas de los lotes anteriores (y se lo podía contactar dos veces en poco tiempo, con mensajes cruzados).
//
// Esto NO escribe nada en la hoja: se calcula al leer, por lo que también corrige los casos viejos sin
// limpieza manual, y si se "deshace" un contacto, el lote vuelve solo a su lugar.
//
// Devuelve un Map fila -> { tipo, porLote, fecha? } con las filas PENDIENTES que no deben mostrarse como trabajo:
//  - tipo 'superado': el mismo lead, en el mismo ciclo, ya tiene un lote POSTERIOR contactado o vencido.
//  - tipo 'pospuesto': otro lote del mismo lead tiene un contacto programado a una fecha futura (esa fecha manda).
// Reglas: el Lote 1 (primer contacto) nunca se supera ni se pospone; una fila con fecha programada propia se
// respeta (alguien eligió esa fecha a propósito); el Lote "baja" no participa.
export function filasSuperadas(seguimiento, ahora = new Date()) {
  const grupos = new Map();
  seguimiento.forEach((s) => {
    if (!/^[1-6]$/.test(String(s.Lote))) return;
    const k = `${s.LeadID}|${cicloDe(s)}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(s);
  });
  const resultado = new Map();
  grupos.forEach((filas) => {
    const vencida = (q) => new Date(q.FechaVence) <= ahora;
    const pendientes = filas.filter((r) => r.Contactado !== 'TRUE');
    // Cuenta también una fila YA contactada con fecha futura (ej: Lote 1 "Contactame en 4 meses" → Programado 30/11):
    // el lead pidió esa fecha, así que los demás lotes pendientes esperan hasta entonces.
    const programadas = filas.filter((q) => q.FechaProgramada && new Date(q.FechaProgramada) > ahora);
    pendientes.forEach((r) => {
      const n = Number(r.Lote);
      if (n === 1 || r.FechaProgramada) return;
      const prog = vencida(r) ? programadas.find((q) => q !== r) : null; // un lote que todavía no venció no se está "posponiendo"
      if (prog) { resultado.set(r, { tipo: 'pospuesto', porLote: String(prog.Lote), fecha: prog.FechaProgramada }); return; }
      const posteriores = filas.filter((q) => q !== r && Number(q.Lote) > n && (q.Contactado === 'TRUE' || vencida(q)));
      if (posteriores.length > 0) resultado.set(r, { tipo: 'superado', porLote: String(Math.max(...posteriores.map((q) => Number(q.Lote)))) });
    });
  });
  return resultado;
}
