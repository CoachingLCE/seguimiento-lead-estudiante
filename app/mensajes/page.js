'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { useSession } from '../../lib/useSession';
import { tienePermisoMensajesVer, tienePermisoMensajesEscribir } from '../../lib/permisos';

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

  const puedeVer = tienePermisoMensajesVer(usuario);
  const puedeEscribir = tienePermisoMensajesEscribir(usuario);

  useEffect(() => {
    if (!usuario) return;
    if (!puedeVer) { router.push('/dashboard'); return; }
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

  if (!usuario || !puedeVer) return null;

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-[900px] mx-auto px-6 pb-16">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <h3 className="text-lg font-bold">💬 Mensajes frecuentes</h3>
          {puedeEscribir && (
            <button onClick={abrirNuevo} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold">
              + Nuevo mensaje
            </button>
          )}
        </div>
        <p className="text-textMuted text-xs mb-5">
          Plantillas de mensajes listas para copiar y pegar en WhatsApp — promos, seguimientos, lo que uses seguido.
        </p>

        {mostrarForm && (
          <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
            <p className="text-sm font-semibold mb-3">{editandoRowIndex ? 'Editar mensaje' : 'Nuevo mensaje'}</p>
            <label className="text-xs text-textSec block mb-1">Título</label>
            <input value={tituloForm} onChange={(e) => setTituloForm(e.target.value)}
              placeholder="Ej: Promo fin de mes — Coaching Ontológico"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />
            <label className="text-xs text-textSec block mb-1">Mensaje</label>
            <textarea rows={10} value={mensajeForm} onChange={(e) => setMensajeForm(e.target.value)}
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
        ) : (
          <div className="space-y-3">
            {mensajes.map((m) => (
              <div key={m._rowIndex} className="bg-surface border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold">{m.Titulo}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => copiar(m.Mensaje, m._rowIndex)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-accentPurple text-white font-semibold whitespace-nowrap">
                      {copiadoId === m._rowIndex ? '✓ Copiado' : '📋 Copiar'}
                    </button>
                    {puedeEscribir && (
                      <>
                        <button onClick={() => abrirEdicion(m)} className="text-xs text-accentTeal font-semibold">✏️</button>
                        <button onClick={() => setConfirmarBorrar(m)} className="text-xs text-dangerText font-semibold">🗑</button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-textSec text-[13px] whitespace-pre-wrap bg-bg/50 rounded-lg px-3 py-2.5">{m.Mensaje}</p>
                <p className="text-textMuted text-[10.5px] mt-2">
                  {m.CreadoPorNombre} · {new Date(m.FechaCreacion).toLocaleDateString('es-AR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

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
