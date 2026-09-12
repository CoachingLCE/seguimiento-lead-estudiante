'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import AccesoDenegado from '../../components/AccesoDenegado';
import { useSession } from '../../lib/useSession';
import { tienePermisoBajas } from '../../lib/permisos';

// Cada persona es un bloque separado por una línea en blanco, con campos "Etiqueta: valor"
// en cualquier orden — todos opcionales, con al menos uno para poder identificarla.
// Ej:
//   Nombre: María Agustina Roldán
//   Curso: Coaching de Equipos
//   Email: ag.roldan.est@gmail.com
//   WhatsApp: +54 9 11 1234-5678
//   Fecha: 12/08/2026
// Busca "Etiqueta: valor" en cualquier parte del texto, sin depender de que cada campo esté
// en su propia línea (por si se pega todo junto sin saltos). Cuando un campo que YA estaba
// completado en la persona actual vuelve a aparecer, se entiende que arrancó una persona nueva.
function heuristicaSinEtiquetas(bloque) {
  const entrada = { nombre: '', curso: '', email: '', whatsapp: '', fecha: '', motivo: '' };
  const lineas = bloque.split('\n').map((l) => l.trim()).filter(Boolean);
  const restantes = [];
  lineas.forEach((linea) => {
    const mFecha = linea.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
    const mEmail = linea.match(/[^\s]+@[^\s]+\.[^\s]+/);
    const mWpp = linea.match(/^[+]?[\d\s\-()]{8,}$/);
    if (mFecha && !entrada.fecha) {
      entrada.fecha = new Date(Number(mFecha[3]), Number(mFecha[2]) - 1, Number(mFecha[1])).toISOString();
    } else if (mEmail && !entrada.email) {
      entrada.email = mEmail[0];
    } else if (mWpp && !entrada.whatsapp) {
      entrada.whatsapp = linea;
    } else if (!entrada.nombre) {
      entrada.nombre = linea.replace(/^[(\-•]+|[)\-]+$/g, '').trim();
    } else {
      restantes.push(linea.replace(/^[(\-•]+|[)\-]+$/g, '').trim());
    }
  });
  if (restantes.length > 0) entrada.curso = restantes.join(' ');
  return entrada;
}

// Variante de heuristicaSinEtiquetas para una fila de planilla (una persona por línea, con los
// datos separados por tabulaciones) — se usa cuando se pega una tabla sin líneas en blanco entre
// personas, en vez de "bloques" de varias líneas por persona.
function heuristicaPorFila(linea) {
  const entrada = { nombre: '', curso: '', email: '', whatsapp: '', fecha: '', motivo: '' };
  const partes = linea.split('\t').map((p) => p.trim()).filter(Boolean);
  const restantes = [];
  partes.forEach((parte) => {
    const mFecha = parte.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
    const mEmail = parte.match(/[^\s]+@[^\s]+\.[^\s]+/);
    const mWpp = parte.match(/^[+]?[\d\s\-()]{8,}$/);
    const mSinDato = /^\(?sin\s*(fecha|dato)s?\)?$/i.test(parte);
    if (mSinDato) {
      // "(sin fecha)" explícito — no se toma como nombre ni como dato real, se ignora.
    } else if (mFecha && !entrada.fecha) {
      entrada.fecha = new Date(Number(mFecha[3]), Number(mFecha[2]) - 1, Number(mFecha[1])).toISOString();
    } else if (mEmail && !entrada.email) {
      entrada.email = mEmail[0];
    } else if (mWpp && !entrada.whatsapp) {
      entrada.whatsapp = parte;
    } else if (!entrada.nombre) {
      entrada.nombre = parte.replace(/^[(\-•]+|[)\-]+$/g, '').trim();
    } else if (!/^\d+$/.test(parte)) {
      // Un número suelto (ej: una columna extra sin usar) se ignora en vez de mezclarse con el curso.
      restantes.push(parte);
    }
  });
  if (restantes.length > 0) entrada.curso = restantes.join(' ');
  return entrada;
}

function parsearBloquesBajas(texto) {
  const patron = /(nombre|curso|e[-\s]?mail|whatsapp|wpp|tel[eé]?fono?|fecha|motivo)\s*:\s*([\s\S]*?)(?=(?:nombre|curso|e[-\s]?mail|whatsapp|wpp|tel[eé]?fono?|fecha|motivo)\s*:|$)/gi;
  const entradas = [];
  let actual = null;
  let match;
  while ((match = patron.exec(texto)) !== null) {
    const etiqueta = match[1].toLowerCase().replace(/[\s-]/g, '');
    const valor = match[2].replace(/\n+/g, ' ').trim();
    if (!valor) continue;
    let campo = null;
    if (etiqueta.startsWith('nombre')) campo = 'nombre';
    else if (etiqueta.startsWith('curso')) campo = 'curso';
    else if (etiqueta.startsWith('email') || etiqueta.startsWith('mail')) campo = 'email';
    else if (etiqueta.startsWith('whatsapp') || etiqueta.startsWith('wpp') || etiqueta.startsWith('tel')) campo = 'whatsapp';
    else if (etiqueta.startsWith('fecha')) campo = 'fecha';
    else if (etiqueta.startsWith('motivo')) campo = 'motivo';
    if (!campo) continue;

    if (!actual || actual[campo]) {
      if (actual) entradas.push(actual);
      actual = { nombre: '', curso: '', email: '', whatsapp: '', fecha: '', motivo: '' };
    }
    if (campo === 'fecha') {
      const [d, m, y] = valor.split(/[/\-]/);
      actual.fecha = d && m && y ? new Date(Number(y), Number(m) - 1, Number(d)).toISOString() : '';
    } else {
      actual[campo] = valor;
    }
  }
  if (actual) entradas.push(actual);

  // Si no se detectó NINGUNA etiqueta en todo el texto, se cae a una heurística sin etiquetas.
  // Primero se prueba por bloques (separados por línea en blanco); si eso da UN solo bloque pero
  // el texto tiene varias líneas con tabulaciones (una fila de planilla por persona, pegada sin
  // línea en blanco entre cada una), se interpreta cada línea como una persona distinta.
  if (entradas.length === 0) {
    const bloques = texto.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const lineas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
    const pareceFilaDeTabla = lineas.length > 1 && lineas.filter((l) => l.includes('\t')).length > 1;

    if (bloques.length === 1 && pareceFilaDeTabla) {
      lineas.forEach((linea) => entradas.push(heuristicaPorFila(linea)));
    } else {
      bloques.forEach((bloque) => entradas.push(heuristicaSinEtiquetas(bloque)));
    }
  }

  entradas.forEach((e) => { if (!e.fecha) e.fecha = new Date().toISOString(); });
  return entradas;
}

export default function BajasPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();

  const [textoBajasMasivas, setTextoBajasMasivas] = useState('');
  const previewBajas = useMemo(
    () => (textoBajasMasivas.trim() ? parsearBloquesBajas(textoBajasMasivas) : []),
    [textoBajasMasivas]
  );
  const [cargandoBajasMasivas, setCargandoBajasMasivas] = useState(false);
  const [progresoCarga, setProgresoCarga] = useState(null);
  const [resultadoBajasMasivas, setResultadoBajasMasivas] = useState(null);
  const [listaBajas, setListaBajas] = useState([]);
  const [enviandoMensajeId, setEnviandoMensajeId] = useState(null);
  const [seleccionadas, setSeleccionadas] = useState(new Set());
  const [eliminando, setEliminando] = useState(false);
  const [filtroHistorial, setFiltroHistorial] = useState('todas');
  const [filtroCurso, setFiltroCurso] = useState('');

  async function eliminarBajas(leadIds) {
    setEliminando(true);
    await fetch('/api/seguimiento/baja-masiva', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadIds, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setEliminando(false);
    setSeleccionadas(new Set());
    cargarDatosBajas();
  }

  const puedeVer = tienePermisoBajas(usuario);

  async function cargarBajasMasivas() {
    setCargandoBajasMasivas(true);
    const entradas = parsearBloquesBajas(textoBajasMasivas);
    // Se manda una por una (en vez de todo el lote junto) para poder mostrar el progreso en
    // vivo — antes era una sola llamada larga y no había forma de saber en qué iba.
    const acumulado = { procesados: [], creados: [], noEncontrados: [], yaExistentes: [], ambiguos: [], errores: [] };
    setProgresoCarga({ actual: 0, total: entradas.length });
    for (let i = 0; i < entradas.length; i++) {
      try {
        const res = await fetch('/api/seguimiento/baja-masiva', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entradas: [entradas[i]], solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
        });
        const r = await res.json();
        if (!res.ok) {
          acumulado.errores.push(r.error || 'Error desconocido del servidor');
        } else {
          ['procesados', 'creados', 'noEncontrados', 'yaExistentes', 'ambiguos', 'errores'].forEach((clave) => {
            if (r[clave]?.length) acumulado[clave].push(...r[clave]);
          });
        }
      } catch (err) {
        const etiqueta = entradas[i].nombre || entradas[i].email || entradas[i].whatsapp || `fila ${i + 1}`;
        acumulado.errores.push(`${etiqueta}: no se pudo conectar con el servidor. Probá de nuevo con esta persona.`);
      }
      setProgresoCarga({ actual: i + 1, total: entradas.length });
    }
    setResultadoBajasMasivas(acumulado);
    setTextoBajasMasivas('');
    cargarDatosBajas();
    setProgresoCarga(null);
    setCargandoBajasMasivas(false);
  }

  useEffect(() => {
    if (usuario) cargarDatosBajas();
  }, [usuario]);

  async function cargarDatosBajas() {
    const r = await fetch(`/api/seguimiento/baja-masiva?solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((res) => res.json());
    setListaBajas(r.bajas || []);
  }

  async function enviarMensaje1(baja) {
    setEnviandoMensajeId(baja.leadId);
    const res = await fetch('/api/bajas/enviar-mensaje', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: baja.leadId, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setEnviandoMensajeId(null);
    if (res.ok) { cargarDatosBajas(); }
    else { const r = await res.json(); alert(r.error || 'No se pudo enviar el mensaje'); }
  }

  if (!usuario) return null;

  // Solo cálculos visuales sobre listaBajas ya cargada — no toca la API ni la lógica existente.
  const totalBajas = listaBajas.length;
  const listasParaRecontactar = listaBajas.filter((b) => b.listaParaReactivacion).length;
  const proximasAlDia90 = listaBajas.filter((b) => !b.disponibleAhora && b.diasFaltantes <= 5).length;

  // Duplicados: misma persona (por nombre normalizado) con la misma fecha de baja, pero en
  // registros DISTINTOS (leads distintos) — pasa cuando se vuelve a cargar a alguien que no se
  // encontró la primera vez. No se borran solos (podría borrarse por error la versión con el
  // email correcto) — se marcan para que los revises y elijas cuál dejar.
  const conteoPorClave = {};
  listaBajas.forEach((b) => {
    const clave = `${(b.nombre || '').trim().toLowerCase()}|||${new Date(b.fechaBaja).toDateString()}`;
    conteoPorClave[clave] = (conteoPorClave[clave] || 0) + 1;
  });
  const esDuplicado = (b) => conteoPorClave[`${(b.nombre || '').trim().toLowerCase()}|||${new Date(b.fechaBaja).toDateString()}`] > 1;
  const totalDuplicados = listaBajas.filter(esDuplicado).length;

  const FILTROS_HISTORIAL = [
    { id: 'todas', label: 'Todas' },
    { id: 'recontactar', label: 'Recontactar' },
    { id: 'proximas90', label: 'Próximas al día 90' },
    { id: 'lote', label: 'En Lote Bajas' },
    { id: 'contactadas', label: 'Contactadas' },
    { id: 'duplicados', label: `⚠️ Duplicados${totalDuplicados > 0 ? ` (${totalDuplicados})` : ''}` }
  ];
  const listaFiltrada = listaBajas.filter((b) => {
    if (filtroHistorial === 'recontactar') return b.listaParaReactivacion;
    if (filtroHistorial === 'proximas90') return !b.disponibleAhora && b.diasFaltantes <= 5;
    if (filtroHistorial === 'lote') return b.disponibleAhora && !b.contactado;
    if (filtroHistorial === 'contactadas') return b.contactado;
    if (filtroHistorial === 'duplicados') return esDuplicado(b);
    return true;
  }).filter((b) => !filtroCurso || b.curso === filtroCurso);

  const cursosUnicos = [...new Set(listaBajas.map((b) => b.curso).filter(Boolean))].sort();

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      {!puedeVer ? (
        <AccesoDenegado seccion="Bajas" />
      ) : (
      <div className="max-w-[1700px] mx-auto px-6 pb-16">

        {/* ENCABEZADO */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold mb-1">Bajas</h3>
            <p className="text-textMuted text-sm">Seguimiento y reactivación de estudiantes dados de baja.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <IndicadorResumen valor={totalBajas} label="Bajas registradas" />
            <IndicadorResumen valor={listasParaRecontactar} label="Listas para recontactar" colorClase="text-warningText" />
            <IndicadorResumen valor={proximasAlDia90} label="Próximas al día 90" colorClase="text-infoText" />
          </div>
        </div>

        {/* CARGAR BAJAS */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 mb-4">
          <p className="text-base font-semibold mb-0.5">Cargar bajas</p>
          <p className="text-textMuted text-xs mb-3">Pegá un bloque por persona, separados por una línea en blanco.</p>
          <p className="text-textMuted text-[11px] mb-3 bg-bg border border-border rounded-lg px-3 py-2 inline-block">
            Nombre · Curso · Email · WhatsApp · Fecha · Motivo
          </p>
          <textarea rows={8} value={textoBajasMasivas} onChange={(e) => setTextoBajasMasivas(e.target.value)}
            placeholder={'Nombre: María Agustina Roldán\nCurso: Coaching de Equipos\nEmail: ag.roldan.est@gmail.com\nWhatsApp: +54 9 11 1234-5678\nFecha: 12/08/2026\n\nNombre: Otra Persona\nEmail: otra@mail.com'}
            className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm font-mono mb-3 focus:outline-none focus:border-accentTeal transition-colors" />

          {textoBajasMasivas.trim() && (
            <div className="mb-4 space-y-2">
              <p className="text-textMuted text-[11px]">👀 Se van a cargar {previewBajas.length} persona{previewBajas.length !== 1 ? 's' : ''}</p>
              {previewBajas.map((p, i) => (
                <div key={i} className="bg-bg border border-border rounded-xl p-3 text-[12px] flex flex-wrap gap-x-4 gap-y-1.5">
                  <span className={p.nombre ? 'text-successText' : 'text-dangerText'}>{p.nombre ? '✓' : '✗'} {p.nombre || 'Nombre (falta)'}</span>
                  {p.curso && <span className="text-successText">✓ {p.curso}</span>}
                  {p.email && <span className="text-successText">✓ {p.email}</span>}
                  {p.whatsapp && <span className="text-successText">✓ {p.whatsapp}</span>}
                  <span className="text-infoText">📅 {new Date(p.fecha).toLocaleDateString('es-AR')}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={cargarBajasMasivas} disabled={cargandoBajasMasivas || !textoBajasMasivas.trim()}
            className="text-sm px-5 py-2.5 rounded-xl bg-dangerText text-white font-semibold disabled:opacity-50 mb-1 shadow-sm">
            {cargandoBajasMasivas
              ? (progresoCarga ? `Cargando ${progresoCarga.actual} de ${progresoCarga.total}…` : 'Cargando…')
              : `🔴 Registrar ${previewBajas.length > 0 ? previewBajas.length : ''} baja${previewBajas.length !== 1 ? 's' : ''}`.replace('  ', ' ')}
          </button>
          {cargandoBajasMasivas && progresoCarga && (
            <div className="w-full max-w-xs bg-bg border border-border rounded-full h-1.5 overflow-hidden mb-1">
              <div className="h-full bg-dangerText transition-all" style={{ width: `${(progresoCarga.actual / progresoCarga.total) * 100}%` }} />
            </div>
          )}

          {resultadoBajasMasivas && (
            <div className="mt-3 flex flex-col gap-1.5">
              {resultadoBajasMasivas.procesados.length > 0 && (
                <ChipResultado color="success" icono="✓" texto={`Registradas: ${resultadoBajasMasivas.procesados.join(', ')}`} />
              )}
              {resultadoBajasMasivas.creados?.length > 0 && (
                <ChipResultado color="info" icono="🆕" texto={`Creadas: ${resultadoBajasMasivas.creados.join(', ')}`} />
              )}
              {resultadoBajasMasivas.yaExistentes.length > 0 && (
                <ChipResultado color="warning" icono="⚠️" texto={`Ya existentes: ${resultadoBajasMasivas.yaExistentes.join(', ')}`} />
              )}
              {resultadoBajasMasivas.ambiguos?.length > 0 && (
                <ChipResultado color="warning" icono="⚠️" texto={`Ambiguas: ${resultadoBajasMasivas.ambiguos.join(' · ')}`} />
              )}
              {resultadoBajasMasivas.errores?.length > 0 && (
                <ChipResultado color="danger" icono="🛑" texto={`Errores: ${resultadoBajasMasivas.errores.join(' · ')}`} />
              )}
              {resultadoBajasMasivas.noEncontrados.length > 0 && (
                <ChipResultado color="danger" icono="✗" texto={`No encontradas: ${resultadoBajasMasivas.noEncontrados.join(', ')}`} />
              )}
            </div>
          )}
        </div>

        {/* HISTORIAL DE BAJAS */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6">
          <p className="text-base font-semibold mb-3">Historial de bajas</p>

          <>
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {FILTROS_HISTORIAL.map((f) => (
                  <button key={f.id} onClick={() => setFiltroHistorial(f.id)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      filtroHistorial === f.id ? 'bg-accentPurple border-accentPurple text-white' : 'bg-surface2 border-border text-textSec hover:text-text'
                    }`}>
                    {f.label}
                  </button>
                ))}
                {cursosUnicos.length > 0 && (
                  <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)}
                    className="text-xs px-2.5 py-1 rounded-full bg-surface2 border border-border text-textSec">
                    <option value="">Todos los cursos</option>
                    {cursosUnicos.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>

              {seleccionadas.size > 0 && (
                <div className="flex items-center justify-between bg-warningBg border border-warningText/30 rounded-xl px-4 py-2.5 mb-3">
                  <p className="text-warningText text-xs font-semibold">{seleccionadas.size} seleccionada{seleccionadas.size !== 1 ? 's' : ''}</p>
                  <button onClick={() => eliminarBajas([...seleccionadas])} disabled={eliminando}
                    className="text-xs px-3 py-1.5 rounded-lg bg-dangerText text-white font-semibold disabled:opacity-60">
                    {eliminando ? 'Eliminando…' : '🗑 Eliminar seleccionadas'}
                  </button>
                </div>
              )}

              {listaFiltrada.length === 0 ? (
                <p className="text-textMuted text-xs py-4 text-center">Sin bajas para este filtro.</p>
              ) : (
                <>
                  {/* Tabla — visible desde tablet para arriba */}
                  <div className="hidden sm:block overflow-x-auto max-h-[750px] overflow-y-auto rounded-xl border border-border">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-surface z-10">
                        <tr className="text-textSec text-left border-b border-border">
                          <th className="py-2.5 px-3 w-6">
                            <input type="checkbox"
                              checked={listaFiltrada.length > 0 && listaFiltrada.every((b) => seleccionadas.has(b.leadId))}
                              onChange={(e) => setSeleccionadas(e.target.checked ? new Set(listaFiltrada.map((b) => b.leadId)) : new Set())} />
                          </th>
                          <th className="px-2">Nombre</th><th className="px-2">Email</th><th className="px-2">Curso</th><th className="px-2">Fecha baja</th>
                          <th className="px-2">Reactivación</th>
                          <th className="px-2">Seguimiento</th>
                          <th className="px-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {listaFiltrada.map((b) => (
                          <tr key={b.leadId} className={`border-b border-border last:border-b-0 hover:bg-bg/40 ${esDuplicado(b) ? 'bg-warningBg/40' : ''}`}>
                            <td className="py-2 px-3">
                              <input type="checkbox" checked={seleccionadas.has(b.leadId)}
                                onChange={() => setSeleccionadas((prev) => {
                                  const nuevo = new Set(prev);
                                  nuevo.has(b.leadId) ? nuevo.delete(b.leadId) : nuevo.add(b.leadId);
                                  return nuevo;
                                })} />
                            </td>
                            <td className="px-2 font-medium whitespace-nowrap">
                              {esDuplicado(b) && <span title="Hay más de un registro con este nombre y fecha">⚠️ </span>}
                              {b.nombre}
                            </td>
                            <td className="px-2 text-textSec whitespace-nowrap">{b.email || <span className="text-warningText">Sin email</span>}</td>
                            <td className="px-2 text-textSec">{b.curso}</td>
                            <td className="px-2 whitespace-nowrap">{new Date(b.fechaBaja).toLocaleDateString('es-AR')}</td>
                            <td className="px-2"><BadgeReactivacion b={b} enviandoMensajeId={enviandoMensajeId} onEnviar={enviarMensaje1} /></td>
                            <td className="px-2"><BadgeSeguimiento b={b} /></td>
                            <td className="px-2">
                              <button onClick={() => eliminarBajas([b.leadId])} disabled={eliminando}
                                className="text-dangerText text-xs disabled:opacity-60">🗑</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Cards — mobile */}
                  <div className="sm:hidden space-y-2 max-h-96 overflow-y-auto">
                    {listaFiltrada.map((b) => (
                      <div key={b.leadId} className={`border rounded-xl p-3 ${esDuplicado(b) ? 'bg-warningBg/40 border-warningText/40' : 'bg-bg border-border'}`}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={seleccionadas.has(b.leadId)}
                              onChange={() => setSeleccionadas((prev) => {
                                const nuevo = new Set(prev);
                                nuevo.has(b.leadId) ? nuevo.delete(b.leadId) : nuevo.add(b.leadId);
                                return nuevo;
                              })} />
                            <p className="text-sm font-medium">{esDuplicado(b) && '⚠️ '}{b.nombre}</p>
                          </div>
                          <button onClick={() => eliminarBajas([b.leadId])} disabled={eliminando}
                            className="text-dangerText text-xs disabled:opacity-60 shrink-0">🗑</button>
                        </div>
                        <p className="text-textSec text-xs mb-1">{b.curso} · {new Date(b.fechaBaja).toLocaleDateString('es-AR')}</p>
                        <p className="text-xs mb-2">{b.email || <span className="text-warningText">Sin email</span>}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <BadgeReactivacion b={b} enviandoMensajeId={enviandoMensajeId} onEnviar={enviarMensaje1} />
                          <BadgeSeguimiento b={b} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
          </>
        </div>
      </div>
      )}
    </div>
  );
}

function IndicadorResumen({ valor, label, colorClase }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-2.5 text-center min-w-[110px]">
      <p className={`text-xl font-bold ${colorClase || 'text-text'}`}>{valor}</p>
      <p className="text-textMuted text-[11px] whitespace-nowrap">{label}</p>
    </div>
  );
}

function ChipResultado({ color, icono, texto }) {
  const clases = {
    success: 'bg-successBg text-successText',
    info: 'bg-infoBg text-infoText',
    warning: 'bg-warningBg text-warningText',
    danger: 'bg-dangerBg text-dangerText'
  };
  return (
    <div className={`text-xs px-3 py-2 rounded-lg ${clases[color]}`}>
      {icono} {texto}
    </div>
  );
}

// Mismos estados y condiciones que antes — la diferencia es que "Listo para enviar" ahora es
// directamente un botón que dispara la misma acción que antes vivía en "Acciones pendientes".
function BadgeReactivacion({ b, enviandoMensajeId, onEnviar }) {
  if (b.confirmoRecepcionBaja) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-successBg text-successText whitespace-nowrap">🟢 Confirmó</span>;
  if (b.mensajeEnviado) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface2 text-textMuted whitespace-nowrap">⚪ Enviado</span>;
  if (b.listaParaReactivacion) {
    if (!b.email) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-warningBg text-warningText whitespace-nowrap">Sin email cargado</span>;
    return (
      <button onClick={() => onEnviar(b)} disabled={enviandoMensajeId === b.leadId}
        className="text-[11px] px-2.5 py-1 rounded-full bg-accentPurple text-white font-semibold disabled:opacity-60 whitespace-nowrap">
        {enviandoMensajeId === b.leadId ? 'Enviando…' : '📩 Enviar mail'}
      </button>
    );
  }
  const faltan = 85 - Math.floor((new Date() - new Date(b.fechaBaja)) / 86400000);
  return <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface2 text-textMuted whitespace-nowrap">Faltan {faltan} días</span>;
}

function BadgeSeguimiento({ b }) {
  if (b.contactado) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-infoBg text-infoText whitespace-nowrap">🔵 Contactado</span>;
  if (b.disponibleAhora) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-warningBg text-warningText whitespace-nowrap">🟠 En Lote Bajas</span>;
  return <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface2 text-textMuted whitespace-nowrap">Faltan {b.diasFaltantes} días</span>;
}
