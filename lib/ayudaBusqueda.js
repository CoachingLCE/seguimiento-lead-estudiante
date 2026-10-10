// Búsqueda dentro de la ayuda ("Necesito ayuda"): la persona escribe lo que quiere hacer ("eliminar un lead", "borrar", "cómo cargo
// una clase") y aparecen las tareas y secciones de la ayuda que coinciden. Pedido de Diego: cuando alguien (por ejemplo Maca) no
// encontraba cómo eliminar un lead, la ayuda no le dejaba escribir nada y solo ofrecía una lista cerrada.
// Función pura SIN imports, idéntica en todas las apps de ILCE (se puede probar sola).
//
// Cómo busca: ignora tildes, mayúsculas y signos; descarta palabras de relleno ("cómo", "puedo", "un"); entiende sinónimos (eliminar =
// borrar = quitar = sacar…); suma puntos si coincide en el título o en las palabras clave de la tarea y menos si coincide en el
// texto; solo muestra lo que coincide con al menos una palabra, y ordena primero lo que coincide con más.

export const normalizar = (v) => String(v == null ? '' : v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim();

const RELLENO = new Set(['como', 'que', 'quiero', 'quiere', 'puedo', 'puede', 'hago', 'hace', 'hacer', 'donde', 'cual', 'cuales', 'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'le', 'se', 'mi', 'me', 'por', 'para', 'con', 'en', 'a', 'y', 'o', 'es', 'esta', 'este', 'esto', 'necesito', 'saber', 'ayuda', 'si', 'no', 'al', 'ya', 'hay']);

// Grupos de palabras que significan lo mismo. Se comparan por raíz (las primeras letras) para tolerar plurales y conjugaciones.
const GRUPOS = [
  ['elimin', 'borr', 'quit', 'sacar', 'saco', 'suprim', 'descart', 'remov'],
  ['cread', 'crear', 'creo', 'agreg', 'carg', 'nuev', 'alta', 'sumar', 'sumo', 'anotar', 'anot', 'registr'],
  ['edit', 'modific', 'cambi', 'corregir', 'corrijo', 'actualiz', 'arregl'],
  ['busc', 'encontr', 'ubic', 'localiz'],
  ['ver', 'mirar', 'miro', 'consult', 'revis', 'abrir', 'abro'],
  ['baja', 'desvinc', 'abandon', 'dejo', 'dejar'],
  ['duplic', 'repetid', 'doble'],
  ['permiso', 'acceso', 'autoriz', 'rol', 'admin'],
  ['mail', 'email', 'correo', 'mensaj'],
  ['export', 'descarg', 'excel', 'planilla'],
  ['contrasena', 'clave', 'password', 'ingres', 'entrar', 'login']
];

const raiz = (t) => (t.length > 5 ? t.slice(0, 5) : t);
function expandir(token) {
  const out = new Set([token]);
  for (const g of GRUPOS) {
    if (g.some((p) => token.startsWith(p) || p.startsWith(token) && token.length >= 4)) g.forEach((p) => out.add(p));
  }
  return [...out];
}

export function tokens(consulta) {
  return normalizar(consulta).split(' ').filter((t) => t && !RELLENO.has(t) && (t.length > 1));
}

const coincide = (textoNorm, variante) => {
  if (!variante) return false;
  const palabras = textoNorm.split(' ');
  return palabras.some((p) => p === variante || (variante.length >= 4 && (p.startsWith(variante) || variante.startsWith(raiz(p)) && p.length >= 4 && raiz(p) === raiz(variante))));
};

/**
 * @param {string} consulta  lo que escribió la persona
 * @param {Array<{id:string, tipo:string, titulo:string, texto?:string, palabras?:string[]}>} items
 * @param {number} max       cantidad máxima de resultados
 * @returns {Array} los items que coinciden, de mejor a peor, cada uno con su `puntaje`
 */
export function buscarAyuda(consulta, items, max = 8) {
  const toks = tokens(consulta);
  if (toks.length === 0 || !Array.isArray(items)) return [];
  const grupos = toks.map(expandir);
  const res = [];
  for (const it of items) {
    if (!it) continue;
    const tit = normalizar(it.titulo), txt = normalizar(it.texto), kw = normalizar((it.palabras || []).join(' '));
    let puntaje = 0, cubiertos = 0;
    for (const variantes of grupos) {
      let mejor = 0;
      for (const v of variantes) {
        const exacta = variantes[0] === v;           // la palabra tal cual la escribió pesa más que un sinónimo
        if (coincide(tit, v)) mejor = Math.max(mejor, exacta ? 6 : 4);
        if (coincide(kw, v)) mejor = Math.max(mejor, exacta ? 5 : 3);
        if (coincide(txt, v)) mejor = Math.max(mejor, exacta ? 2 : 1);
      }
      if (mejor > 0) { cubiertos++; puntaje += mejor; }
    }
    if (cubiertos === 0) continue;
    // Lo que responde a todas las palabras escritas va primero; una tarea pesa más que un paso suelto.
    puntaje += cubiertos === toks.length ? 5 : 0;
    if (it.tipo === 'tarea') puntaje += 2;
    res.push({ ...it, puntaje, cubiertos });
  }
  // Si algún resultado responde a TODAS las palabras escritas (o a la mayor cantidad posible), se muestran solo los que llegan a ese
  // nivel: así "eliminar un lead" no arrastra a "cargar un lead" solo por compartir la palabra "lead".
  const mejorCobertura = res.reduce((m, r) => Math.max(m, r.cubiertos), 0);
  return res.filter((r) => r.cubiertos === mejorCobertura).sort((a, b) => b.puntaje - a.puntaje || String(a.titulo).localeCompare(String(b.titulo), 'es')).slice(0, max);
}
