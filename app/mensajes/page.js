'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import AccesoDenegado from '../../components/AccesoDenegado';
import { useSession } from '../../lib/useSession';
import { tienePermisoMensajesVer, tienePermisoMensajesEscribir } from '../../lib/permisos';

// Pedido de Diego (02/10/2026): mostrar "Nuevo" si se creó, o "Modificado" si se editó, en los
// últimos 7 días. Si se editó DESPUÉS de crearse (no el mismo guardado inicial), manda "Modificado"
// por sobre "Nuevo" — es la señal más reciente.
const DIAS_RECIENTE = 7;
function estadoReciente(m) {
  const ahora = Date.now();
  const dentroDeNDias = (fecha) => !!fecha && (ahora - new Date(fecha).getTime()) / 86400000 <= DIAS_RECIENTE;
  const fueModificado = m.FechaModificacion && new Date(m.FechaModificacion) > new Date(m.FechaCreacion);
  if (fueModificado && dentroDeNDias(m.FechaModificacion)) return 'modificado';
  if (dentroDeNDias(m.FechaCreacion)) return 'nuevo';
  return null;
}

function emailsFavoritos(m) {
  return (m.Favoritos || '').split(',').map((e) => e.trim()).filter(Boolean);
}

export default function MensajesFrecuentesPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();

  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [copiadoId, setCopiadoId] = useState(null);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoRowIndex, setEditandoRowIndex] = useState(null);
  const [tituloForm, setTituloForm] = useState('');
  const [mensajeForm, setMensajeForm] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(null);
  const [vistaCompacta, setVistaCompacta] = useState(true);
  const [expandidoId, setExpandidoId] = useState(null);
  const [arrastrandoId, setArrastrandoId] = useState(null);
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const textareaRef = useRef(null);

  const puedeVer = tienePermisoMensajesVer(usuario);
  const puedeEscribir = tienePermisoMensajesEscribir(usuario);

  useEffect(() => {
    if (!usuario) return;
    if (!puedeVer) return; // ya no redirige — la pantalla en sí muestra el mensaje de acceso
    cargarMensajes();
  }, [usuario]);

  async function cargarMensajes() {
    setCargando(true);
    setErrorCarga('');
    try {
      const res = await fetch(`/api/mensajes-frecuentes?solicitanteEmail=${encodeURIComponent(usuario.email)}`);
      const r = await res.json();
      if (!res.ok || r.error) {
        setErrorCarga(r.error || 'No se pudieron cargar los mensajes.');
      } else {
        setMensajes(r.mensajes || []);
      }
    } catch (err) {
      setErrorCarga('No se pudo conectar con el servidor.');
    }
    setCargando(false);
  }

  function copiar(mensaje, id) {
    navigator.clipboard.writeText(mensaje);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  }

  function abrirNuevo() {
    setEditandoRowIndex(null);
    setTituloForm('');
    setMensajeForm('');
    setMostrarForm(true);
  }

  function abrirEdicion(m) {
    setEditandoRowIndex(m._rowIndex);
    setTituloForm(m.Titulo);
    setMensajeForm(m.Mensaje);
    setMostrarForm(true);
  }

  // Duplicar: no hace falta un endpoint propio — alcanza con precargar el formulario de "Nuevo
  // mensaje" con el contenido de este, para que quien duplica pueda ajustar el título antes de
  // guardar (ej. para una variante de la misma plantilla).
  function duplicar(m) {
    setEditandoRowIndex(null);
    setTituloForm(`${m.Titulo} (copia)`);
    setMensajeForm(m.Mensaje);
    setMostrarForm(true);
  }

  // Negrita/cursiva estilo WhatsApp (*negrita*, _cursiva_) — Diego pidió poder aplicar formato
  // antes de copiar el mensaje. Envuelve la selección actual del textarea con el marcador; si no
  // hay nada seleccionado, inserta el par de marcadores y deja el cursor en el medio para escribir.
  function aplicarFormatoWhatsapp(marcador) {
    const ta = textareaRef.current;
    if (!ta) return;
    const inicio = ta.selectionStart;
    const fin = ta.selectionEnd;
    const seleccion = mensajeForm.slice(inicio, fin);
    const nuevoTexto = mensajeForm.slice(0, inicio) + marcador + seleccion + marcador + mensajeForm.slice(fin);
    setMensajeForm(nuevoTexto);
    const nuevaPosicion = inicio + marcador.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = nuevaPosicion;
      ta.selectionEnd = nuevaPosicion + seleccion.length;
    });
  }

  // Favorito: preferencia personal (no requiere permiso de escritura) — optimista en pantalla,
  // se confirma contra el servidor en segundo plano.
  async function alternarFavorito(m) {
    setMensajes((prev) => prev.map((x) => {
      if (x._rowIndex !== m._rowIndex) return x;
      const emails = emailsFavoritos(x);
      const yaEsta = emails.includes(usuario.email);
      const nuevos = yaEsta ? emails.filter((e) => e !== usuario.email) : [...emails, usuario.email];
      return { ...x, Favoritos: nuevos.join(',') };
    }));
    await fetch('/api/mensajes-frecuentes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'toggleFavorito', rowIndex: m._rowIndex, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
  }

  async function guardar() {
    if (!tituloForm.trim() || !mensajeForm.trim()) return;
    setGuardando(true);
    const cuerpo = {
      titulo: tituloForm.trim(), mensaje: mensajeForm,
      solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
    };
    if (editandoRowIndex) {
      await fetch('/api/mensajes-frecuentes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cuerpo, rowIndex: editandoRowIndex })
      });
    } else {
      await fetch('/api/mensajes-frecuentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo)
      });
    }
    setGuardando(false);
    setMostrarForm(false);
    cargarMensajes();
  }

  async function borrar(m) {
    await fetch('/api/mensajes-frecuentes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndex: m._rowIndex, titulo: m.Titulo, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setConfirmarBorrar(null);
    cargarMensajes();
  }

  // Arrastrar y soltar para reordenar — solo disponible para quien puede escribir (Macarena/Admin).
  // Se reordena visualmente al toque (para que se sienta inmediato) y se guarda en el Sheet apenas
  // se suelta, mandando el orden completo actualizado.
  function onDragStart(id) {
    setArrastrandoId(id);
  }
  function onDragOver(ev, idSobreElQueEsta) {
    ev.preventDefault();
    if (arrastrandoId === null || arrastrandoId === idSobreElQueEsta) return;
    setMensajes((prev) => {
      const desde = prev.findIndex((m) => m._rowIndex === arrastrandoId);
      const hasta = prev.findIndex((m) => m._rowIndex === idSobreElQueEsta);
      if (desde === -1 || hasta === -1) return prev;
      const copia = [...prev];
      const [movido] = copia.splice(desde, 1);
      copia.splice(hasta, 0, movido);
      return copia;
    });
  }
  async function onDrop() {
    setArrastrandoId(null);
    const ordenes = mensajes.map((m, i) => ({ rowIndex: m._rowIndex, orden: i + 1 }));
    await fetch('/api/mensajes-frecuentes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'reordenar', ordenes, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
  }

  if (!usuario) return null;

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      {!puedeVer ? (
        <AccesoDenegado seccion="Mensajes frecuentes" />
      ) : (
      <div className="max-w-[900px] mx-auto px-6 pb-16">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <h3 className="text-lg font-bold">💬 Mensajes frecuentes</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setSoloFavoritos((v) => !v)}
              className={`text-xs px-3 py-2 rounded-lg border ${soloFavoritos ? 'bg-accentPurple/15 border-accentPurple text-accentPurple' : 'bg-surface2 border-border text-textSec'}`}>
              {soloFavoritos ? '⭐ Solo favoritos' : '☆ Favoritos'}
            </button>
            <button onClick={() => setVistaCompacta((v) => !v)}
              className="text-xs px-3 py-2 rounded-lg bg-surface2 border border-border text-textSec">
              {vistaCompacta ? '▤ Vista completa' : '☰ Vista compacta'}
            </button>
            {puedeEscribir && (
              <button onClick={abrirNuevo} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold">
                + Nuevo mensaje
              </button>
            )}
          </div>
        </div>
        <p className="text-textMuted text-xs mb-5">
          Plantillas de mensajes listas para copiar y pegar en WhatsApp — promos, seguimientos, lo que uses seguido.
          {puedeEscribir && ' Arrastrá desde ⠿ para cambiar el orden.'}
        </p>

        {mostrarForm && (
          <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
            <p className="text-sm font-semibold mb-3">{editandoRowIndex ? 'Editar mensaje' : 'Nuevo mensaje'}</p>
            <label className="text-xs text-textSec block mb-1">Título</label>
            <input value={tituloForm} onChange={(e) => setTituloForm(e.target.value)}
              placeholder="Ej: Promo fin de mes — Coaching Ontológico"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />
            <label className="text-xs text-textSec block mb-1">Mensaje</label>
            <div className="flex items-center gap-1.5 mb-1.5">
              <button type="button" onClick={() => aplicarFormatoWhatsapp('*')} title="Negrita — así se ve en WhatsApp: *texto*"
                className="text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg bg-surface2 border border-border hover:border-accentTeal">N</button>
              <button type="button" onClick={() => aplicarFormatoWhatsapp('_')} title="Cursiva — así se ve en WhatsApp: _texto_"
                className="text-xs italic w-7 h-7 flex items-center justify-center rounded-lg bg-surface2 border border-border hover:border-accentTeal">C</button>
              <span className="text-textMuted text-[10.5px]">Seleccioná texto y aplicá el formato — se ve así en WhatsApp.</span>
            </div>
            <textarea ref={textareaRef} rows={10} value={mensajeForm} onChange={(e) => setMensajeForm(e.target.value)}
              placeholder={'Hola! Soy Maca de ILCE 👋\n\nA fin de mes te quería compartir una promo especial...'}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono mb-3 whitespace-pre-wrap" />
            <div className="flex gap-2">
              <button onClick={() => setMostrarForm(false)} className="text-sm px-4 py-2 rounded-lg bg-surface2 border border-border">Cancelar</button>
              <button onClick={guardar} disabled={guardando || !tituloForm.trim() || !mensajeForm.trim()}
                className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-50">
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {errorCarga ? (
          <div className="bg-dangerBg border border-dangerText/30 rounded-2xl p-6 text-center">
            <p className="text-dangerText text-sm font-semibold mb-3">⚠️ {errorCarga}</p>
            <button onClick={cargarMensajes} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold">Reintentar</button>
          </div>
        ) : cargando ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : mensajes.length === 0 ? (
          <p className="text-textMuted text-sm">Todavía no hay mensajes guardados{puedeEscribir ? ' — usá "+ Nuevo mensaje" para arrancar.' : '.'}</p>
        ) : (() => {
          // Favoritos primero (acceso rápido), respetando el orden ya elegido dentro de cada grupo —
          // el sort de JS es estable, así que alcanza con comparar por "es favorito o no".
          const propioFavorito = (m) => emailsFavoritos(m).includes(usuario.email);
          const mensajesOrdenados = [...mensajes].sort((a, b) => (propioFavorito(b) ? 1 : 0) - (propioFavorito(a) ? 1 : 0));
          const mensajesAMostrar = soloFavoritos ? mensajesOrdenados.filter(propioFavorito) : mensajesOrdenados;
          if (mensajesAMostrar.length === 0) {
            return <p className="text-textMuted text-sm">Todavía no marcaste ningún mensaje como favorito — tocá el ☆ de un mensaje para sumarlo acá.</p>;
          }
          return (
          <div className="space-y-3">
            {mensajesAMostrar.map((m) => {
              const estaExpandido = !vistaCompacta || expandidoId === m._rowIndex;
              const esFavorito = propioFavorito(m);
              const estado = estadoReciente(m);
              const fueEditado = m.FechaModificacion && new Date(m.FechaModificacion) > new Date(m.FechaCreacion);
              return (
                <div key={m._rowIndex}
                  draggable={puedeEscribir}
                  onDragStart={() => onDragStart(m._rowIndex)}
                  onDragOver={(ev) => onDragOver(ev, m._rowIndex)}
                  onDrop={onDrop}
                  className={`bg-surface border border-border rounded-2xl p-4 transition-opacity ${arrastrandoId === m._rowIndex ? 'opacity-40' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {puedeEscribir && <span className="text-textMuted cursor-grab shrink-0" title="Arrastrar para reordenar">⠿</span>}
                      {vistaCompacta && (
                        <button onClick={() => setExpandidoId(expandidoId === m._rowIndex ? null : m._rowIndex)}
                          className="text-textMuted text-xs shrink-0">{estaExpandido ? '▼' : '▶'}</button>
                      )}
                      <p className="text-sm font-semibold truncate">{m.Titulo}</p>
                      {estado === 'nuevo' && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-successBg text-successText shrink-0">Nuevo</span>}
                      {estado === 'modificado' && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-infoBg text-infoText shrink-0">Modificado</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => alternarFavorito(m)} title={esFavorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
                        className={esFavorito ? 'text-base text-yellow-400' : 'text-base text-textMuted hover:text-yellow-400'}>
                        {esFavorito ? '⭐' : '☆'}
                      </button>
                      <button onClick={() => copiar(m.Mensaje, m._rowIndex)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-accentPurple text-white font-semibold whitespace-nowrap">
                        {copiadoId === m._rowIndex ? '✓ Copiado' : '📋 Copiar'}
                      </button>
                      {puedeEscribir && (
                        <div className="flex items-center gap-2 pl-2 border-l border-border">
                          <button onClick={() => duplicar(m)} title="Duplicar" className="text-xs text-textSec hover:text-text font-semibold">📑</button>
                          <button onClick={() => abrirEdicion(m)} title="Editar" className="text-xs text-accentTeal font-semibold">✏️</button>
                          <button onClick={() => setConfirmarBorrar(m)} title="Eliminar" className="text-xs text-dangerText font-semibold">🗑</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {estaExpandido && (
                    <>
                      <p className="text-textSec text-[13px] whitespace-pre-wrap bg-bg/50 rounded-lg px-3 py-2.5">{m.Mensaje}</p>
                      <p className="text-textMuted text-[10.5px] mt-2">
                        Creado por {m.CreadoPorNombre} · {new Date(m.FechaCreacion).toLocaleDateString('es-AR')}
                        {fueEditado && <> · Editado por {m.UltimaModificacionPorNombre} · {new Date(m.FechaModificacion).toLocaleDateString('es-AR')}</>}
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          );
        })()}
      </div>
      )}

      {confirmarBorrar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setConfirmarBorrar(null)}>
          <div className="bg-surface2 border border-border rounded-2xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold mb-2">¿Eliminar "{confirmarBorrar.Titulo}"?</p>
            <p className="text-textMuted text-xs mb-4">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarBorrar(null)} className="text-xs px-3 py-2 rounded-lg bg-surface border border-border flex-1">Cancelar</button>
              <button onClick={() => borrar(confirmarBorrar)} className="text-xs px-3 py-2 rounded-lg bg-dangerText text-white font-semibold flex-1">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
