'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { useSession } from '../../lib/useSession';
import { tienePermisoInformesRRSS } from '../../lib/permisos';

const PLATAFORMAS = [
  { id: 'instagram', label: 'Instagram', color: 'text-accentMagenta' },
  { id: 'linkedin', label: 'LinkedIn', color: 'text-infoText' },
  { id: 'youtube', label: 'YouTube', color: 'text-dangerText' },
  { id: 'google_business', label: 'Google Business', color: 'text-warningText' },
  { id: 'blog', label: 'Blog', color: 'text-accentTeal' }
];
const TIPOS_PIEZA = ['Reel', 'Carrusel', 'Post', 'Video', 'Artículo', 'Historia'];

function mesesDisponibles() {
  const hoy = new Date();
  const meses = [];
  for (let i = 0; i < 13; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return meses;
}
function labelDeMes(mes) {
  const [anio, m] = mes.split('-').map(Number);
  return new Date(anio, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}
function num(v) {
  return v === '' || v === undefined || v === null ? null : Number(v);
}
function fmt(v) {
  const n = num(v);
  return n === null ? '—' : n.toLocaleString('es-AR');
}

export default function InformesRRSSPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();

  const [mes, setMes] = useState('');
  const [cargando, setCargando] = useState(true);
  const [metricas, setMetricas] = useState([]);
  const [piezas, setPiezas] = useState([]);
  const [analisis, setAnalisis] = useState(null);
  const [comentarios, setComentarios] = useState([]);

  const [editandoPlataforma, setEditandoPlataforma] = useState(null);
  const [formMetrica, setFormMetrica] = useState({});
  const [guardandoMetrica, setGuardandoMetrica] = useState(false);

  const [mostrarFormPieza, setMostrarFormPieza] = useState(false);
  const [editandoPiezaId, setEditandoPiezaId] = useState(null);
  const [formPieza, setFormPieza] = useState({ plataforma: 'instagram', tipo: 'Reel', titulo: '', views: '', likes: '', comments: '', saves: '', shares: '', guion: '', notaIA: '' });
  const [guardandoPieza, setGuardandoPieza] = useState(false);
  const [confirmarBorrarPieza, setConfirmarBorrarPieza] = useState(null);

  const [editandoAnalisis, setEditandoAnalisis] = useState(false);
  const [formAnalisis, setFormAnalisis] = useState({ resumen: '', causas: '', propuestas: '' });
  const [guardandoAnalisis, setGuardandoAnalisis] = useState(false);

  const [textoComentario, setTextoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  const puedeVer = tienePermisoInformesRRSS(usuario);

  useEffect(() => {
    if (!usuario) return;
    if (!puedeVer) { router.push('/dashboard'); return; }
    if (!mes) setMes(mesesDisponibles()[0]);
  }, [usuario]);

  useEffect(() => {
    if (usuario && mes) cargarTodo();
  }, [mes, usuario]);

  async function cargarTodo() {
    setCargando(true);
    const qs = `mes=${mes}&solicitanteEmail=${encodeURIComponent(usuario.email)}`;
    const [rMetricas, rPiezas, rAnalisis, rComentarios] = await Promise.all([
      fetch(`/api/informes-rrss/metricas?${qs}`).then((r) => r.json()),
      fetch(`/api/informes-rrss/piezas?${qs}`).then((r) => r.json()),
      fetch(`/api/informes-rrss/analisis?${qs}`).then((r) => r.json()),
      fetch(`/api/informes-rrss/comentarios?${qs}`).then((r) => r.json())
    ]);
    setMetricas(rMetricas.metricas || []);
    setPiezas(rPiezas.piezas || []);
    setAnalisis(rAnalisis.analisis || null);
    setFormAnalisis(rAnalisis.analisis ? {
      resumen: rAnalisis.analisis.resumen, causas: rAnalisis.analisis.causas, propuestas: rAnalisis.analisis.propuestas
    } : { resumen: '', causas: '', propuestas: '' });
    setComentarios(rComentarios.comentarios || []);
    setCargando(false);
  }

  function abrirEdicionMetrica(plataformaId) {
    const actual = metricas.find((m) => m.Plataforma === plataformaId);
    setFormMetrica({
      followers: actual?.Followers || '', reach: actual?.Reach || '', impressions: actual?.Impressions || '',
      profileVisits: actual?.ProfileVisits || '', engagementRate: actual?.EngagementRate || '',
      saves: actual?.Saves || '', linkClicks: actual?.LinkClicks || '', qualifiedLeads: actual?.QualifiedLeads || ''
    });
    setEditandoPlataforma(plataformaId);
  }

  async function guardarMetrica() {
    setGuardandoMetrica(true);
    await fetch('/api/informes-rrss/metricas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mes, plataforma: editandoPlataforma, ...formMetrica,
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    setGuardandoMetrica(false);
    setEditandoPlataforma(null);
    cargarTodo();
  }

  function abrirNuevaPieza() {
    setEditandoPiezaId(null);
    setFormPieza({ plataforma: 'instagram', tipo: 'Reel', titulo: '', views: '', likes: '', comments: '', saves: '', shares: '', guion: '', notaIA: '' });
    setMostrarFormPieza(true);
  }
  function abrirEdicionPieza(p) {
    setEditandoPiezaId(p._rowIndex);
    setFormPieza({
      plataforma: p.Plataforma || 'instagram', tipo: p.Tipo || 'Reel', titulo: p.Titulo || '',
      views: p.Views || '', likes: p.Likes || '', comments: p.Comments || '', saves: p.Saves || '', shares: p.Shares || '',
      guion: p.Guion || '', notaIA: p.NotaIA || ''
    });
    setMostrarFormPieza(true);
  }
  async function guardarPieza() {
    if (!formPieza.titulo.trim()) return;
    setGuardandoPieza(true);
    const cuerpo = { mes, ...formPieza, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre };
    if (editandoPiezaId) {
      await fetch('/api/informes-rrss/piezas', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cuerpo, rowIndex: editandoPiezaId })
      });
    } else {
      await fetch('/api/informes-rrss/piezas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo)
      });
    }
    setGuardandoPieza(false);
    setMostrarFormPieza(false);
    cargarTodo();
  }
  async function borrarPieza(p) {
    await fetch('/api/informes-rrss/piezas', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndex: p._rowIndex, titulo: p.Titulo, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setConfirmarBorrarPieza(null);
    cargarTodo();
  }

  async function guardarAnalisis() {
    setGuardandoAnalisis(true);
    await fetch('/api/informes-rrss/analisis', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mes, ...formAnalisis, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setGuardandoAnalisis(false);
    setEditandoAnalisis(false);
    cargarTodo();
  }

  async function enviarComentario() {
    if (!textoComentario.trim()) return;
    setEnviandoComentario(true);
    await fetch('/api/informes-rrss/comentarios', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mes, texto: textoComentario.trim(), solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setTextoComentario('');
    setEnviandoComentario(false);
    cargarTodo();
  }

  if (!usuario || !puedeVer) return null;

  const plataformasConDatos = PLATAFORMAS.filter((p) =>
    ['instagram', 'linkedin', 'youtube'].includes(p.id) || metricas.some((m) => m.Plataforma === p.id)
  );

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-[1300px] mx-auto px-6 pb-16">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <h3 className="text-lg font-bold">📊 Informes RRSS</h3>
          <select value={mes} onChange={(e) => setMes(e.target.value)}
            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm capitalize">
            {mesesDisponibles().map((m) => <option key={m} value={m} className="capitalize">{labelDeMes(m)}</option>)}
          </select>
        </div>
        <p className="text-textMuted text-xs mb-5">Métricas mensuales de redes sociales, contenido destacado y análisis.</p>

        {cargando ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : (
          <div className="space-y-4">
            {/* KPIs POR PLATAFORMA */}
            <div className="grid md:grid-cols-3 gap-3">
              {plataformasConDatos.map((plat) => {
                const m = metricas.find((x) => x.Plataforma === plat.id);
                return (
                  <div key={plat.id} className="bg-surface border border-border rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-sm font-semibold ${plat.color}`}>{plat.label}</p>
                      <button onClick={() => abrirEdicionMetrica(plat.id)} className="text-xs text-accentTeal font-semibold">
                        {m ? '✏️ Editar' : '+ Cargar'}
                      </button>
                    </div>
                    {!m ? (
                      <p className="text-textMuted text-xs">Sin datos este mes.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        <p className="text-textSec">Seguidores: <b className="text-text">{fmt(m.Followers)}</b></p>
                        <p className="text-textSec">Alcance: <b className="text-text">{fmt(m.Reach)}</b></p>
                        <p className="text-textSec">Impresiones: <b className="text-text">{fmt(m.Impressions)}</b></p>
                        <p className="text-textSec">Visitas perfil: <b className="text-text">{fmt(m.ProfileVisits)}</b></p>
                        <p className="text-textSec">Engagement: <b className="text-text">{m.EngagementRate ? `${m.EngagementRate}%` : '—'}</b></p>
                        <p className="text-textSec">Guardados: <b className="text-text">{fmt(m.Saves)}</b></p>
                        <p className="text-textSec">Clics a link: <b className="text-text">{fmt(m.LinkClicks)}</b></p>
                        <p className="text-textSec">Leads calif.: <b className="text-successText">{fmt(m.QualifiedLeads)}</b></p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* FORM EDICION METRICA */}
            {editandoPlataforma && (
              <div className="bg-surface border border-accentTeal/40 rounded-2xl p-5">
                <p className="text-sm font-semibold mb-3">Métricas de {PLATAFORMAS.find((p) => p.id === editandoPlataforma)?.label} — {labelDeMes(mes)}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    ['followers', 'Seguidores'], ['reach', 'Alcance'], ['impressions', 'Impresiones'],
                    ['profileVisits', 'Visitas al perfil'], ['engagementRate', 'Engagement (%)'], ['saves', 'Guardados'],
                    ['linkClicks', 'Clics a link'], ['qualifiedLeads', 'Leads calificados']
                  ].map(([campo, label]) => (
                    <div key={campo}>
                      <label className="text-[11px] text-textSec block mb-1">{label}</label>
                      <input type="text" inputMode="decimal" value={formMetrica[campo] || ''}
                        onChange={(e) => setFormMetrica((f) => ({ ...f, [campo]: e.target.value }))}
                        className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditandoPlataforma(null)} className="text-sm px-4 py-2 rounded-lg bg-surface2 border border-border">Cancelar</button>
                  <button onClick={guardarMetrica} disabled={guardandoMetrica}
                    className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-60">
                    {guardandoMetrica ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}

            {/* CONTENIDO DESTACADO */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">🎬 Contenido destacado</p>
                <button onClick={abrirNuevaPieza} className="text-xs px-3 py-1.5 rounded-lg bg-accentPurple text-white font-semibold">+ Agregar</button>
              </div>

              {mostrarFormPieza && (
                <div className="bg-bg border border-border rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[11px] text-textSec block mb-1">Plataforma</label>
                      <select value={formPieza.plataforma} onChange={(e) => setFormPieza((f) => ({ ...f, plataforma: e.target.value }))}
                        className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-sm">
                        {PLATAFORMAS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-textSec block mb-1">Tipo</label>
                      <select value={formPieza.tipo} onChange={(e) => setFormPieza((f) => ({ ...f, tipo: e.target.value }))}
                        className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-sm">
                        {TIPOS_PIEZA.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <label className="text-[11px] text-textSec block mb-1">Título</label>
                  <input value={formPieza.titulo} onChange={(e) => setFormPieza((f) => ({ ...f, titulo: e.target.value }))}
                    placeholder="Ej: 3 señales de que tu equipo necesita coaching"
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm mb-3" />
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-3">
                    {[['views', 'Views'], ['likes', 'Likes'], ['comments', 'Comments'], ['saves', 'Saves'], ['shares', 'Shares']].map(([campo, label]) => (
                      <div key={campo}>
                        <label className="text-[11px] text-textSec block mb-1">{label}</label>
                        <input type="text" inputMode="numeric" value={formPieza[campo]}
                          onChange={(e) => setFormPieza((f) => ({ ...f, [campo]: e.target.value }))}
                          className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs" />
                      </div>
                    ))}
                  </div>
                  <label className="text-[11px] text-textSec block mb-1">Guion / copy (opcional)</label>
                  <textarea rows={3} value={formPieza.guion} onChange={(e) => setFormPieza((f) => ({ ...f, guion: e.target.value }))}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm mb-3" />
                  <label className="text-[11px] text-textSec block mb-1">Nota / por qué funcionó (opcional)</label>
                  <textarea rows={2} value={formPieza.notaIA} onChange={(e) => setFormPieza((f) => ({ ...f, notaIA: e.target.value }))}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm mb-3" />
                  <div className="flex gap-2">
                    <button onClick={() => setMostrarFormPieza(false)} className="text-sm px-4 py-2 rounded-lg bg-surface2 border border-border">Cancelar</button>
                    <button onClick={guardarPieza} disabled={guardandoPieza || !formPieza.titulo.trim()}
                      className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-50">
                      {guardandoPieza ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}

              {piezas.length === 0 ? (
                <p className="text-textMuted text-sm">Sin piezas cargadas este mes.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {piezas.map((p) => (
                    <div key={p._rowIndex} className="bg-bg border border-border rounded-xl p-3.5">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface2 text-textMuted mr-1.5">{PLATAFORMAS.find((pl) => pl.id === p.Plataforma)?.label || p.Plataforma}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface2 text-textMuted">{p.Tipo}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => abrirEdicionPieza(p)} className="text-xs text-accentTeal">✏️</button>
                          <button onClick={() => setConfirmarBorrarPieza(p)} className="text-xs text-dangerText">🗑</button>
                        </div>
                      </div>
                      <p className="text-sm font-medium mb-2">{p.Titulo}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-textSec">
                        {p.Views && <span>👁 {fmt(p.Views)}</span>}
                        {p.Likes && <span>❤️ {fmt(p.Likes)}</span>}
                        {p.Comments && <span>💬 {fmt(p.Comments)}</span>}
                        {p.Saves && <span>🔖 {fmt(p.Saves)}</span>}
                        {p.Shares && <span>🔁 {fmt(p.Shares)}</span>}
                      </div>
                      {p.NotaIA && <p className="text-textMuted text-[11px] mt-2 italic border-l-2 border-accentPurple pl-2">{p.NotaIA}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ANALISIS */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">🔍 Análisis del mes</p>
                {!editandoAnalisis && (
                  <button onClick={() => setEditandoAnalisis(true)} className="text-xs text-accentTeal font-semibold">✏️ Editar</button>
                )}
              </div>
              {editandoAnalisis ? (
                <>
                  <label className="text-[11px] text-textSec block mb-1">Resumen</label>
                  <textarea rows={3} value={formAnalisis.resumen} onChange={(e) => setFormAnalisis((f) => ({ ...f, resumen: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />
                  <label className="text-[11px] text-textSec block mb-1">Causas</label>
                  <textarea rows={3} value={formAnalisis.causas} onChange={(e) => setFormAnalisis((f) => ({ ...f, causas: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />
                  <label className="text-[11px] text-textSec block mb-1">Propuestas</label>
                  <textarea rows={3} value={formAnalisis.propuestas} onChange={(e) => setFormAnalisis((f) => ({ ...f, propuestas: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />
                  <div className="flex gap-2">
                    <button onClick={() => setEditandoAnalisis(false)} className="text-sm px-4 py-2 rounded-lg bg-surface2 border border-border">Cancelar</button>
                    <button onClick={guardarAnalisis} disabled={guardandoAnalisis}
                      className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-60">
                      {guardandoAnalisis ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </>
              ) : !analisis ? (
                <p className="text-textMuted text-sm">Todavía no hay análisis cargado para este mes.</p>
              ) : (
                <div className="space-y-3 text-sm">
                  {analisis.resumen && <div><p className="text-textMuted text-[11px] uppercase mb-1">Resumen</p><p className="text-textSec whitespace-pre-wrap">{analisis.resumen}</p></div>}
                  {analisis.causas && <div><p className="text-textMuted text-[11px] uppercase mb-1">Causas</p><p className="text-textSec whitespace-pre-wrap">{analisis.causas}</p></div>}
                  {analisis.propuestas && <div><p className="text-textMuted text-[11px] uppercase mb-1">Propuestas</p><p className="text-textSec whitespace-pre-wrap">{analisis.propuestas}</p></div>}
                </div>
              )}
            </div>

            {/* COMENTARIOS */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <p className="text-sm font-semibold mb-3">💬 Comentarios</p>
              {comentarios.length === 0 ? (
                <p className="text-textMuted text-sm mb-3">Sin comentarios todavía.</p>
              ) : (
                <div className="space-y-3 mb-3">
                  {comentarios.map((c, i) => (
                    <div key={i} className="border-b border-border pb-2.5 last:border-b-0">
                      <p className="text-xs"><b className="font-semibold">{c.UsuarioNombre}</b> <span className="text-textMuted">· {new Date(c.Fecha).toLocaleString('es-AR')}</span></p>
                      <p className="text-textSec text-sm mt-0.5 whitespace-pre-wrap">{c.Texto}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input value={textoComentario} onChange={(e) => setTextoComentario(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && enviarComentario()}
                  placeholder="Escribir un comentario…" className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
                <button onClick={enviarComentario} disabled={enviandoComentario || !textoComentario.trim()}
                  className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-50">
                  Enviar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {confirmarBorrarPieza && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setConfirmarBorrarPieza(null)}>
          <div className="bg-surface2 border border-border rounded-2xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold mb-2">¿Eliminar "{confirmarBorrarPieza.Titulo}"?</p>
            <p className="text-textMuted text-xs mb-4">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarBorrarPieza(null)} className="text-xs px-3 py-2 rounded-lg bg-surface border border-border flex-1">Cancelar</button>
              <button onClick={() => borrarPieza(confirmarBorrarPieza)} className="text-xs px-3 py-2 rounded-lg bg-dangerText text-white font-semibold flex-1">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
