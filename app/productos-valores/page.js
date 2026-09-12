'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { useSession } from '../../lib/useSession';
import { tienePermisoProductosVer, tienePermisoProductosEditar } from '../../lib/permisos';

const ESTADOS = ['Activo', 'Pausado', 'Próximamente'];
const MODALIDADES = ['Sincrónico', 'On demand', 'Ebook', 'Comunidad', 'Servicio', 'Otro producto'];
const FORMATOS = ['Sincrónico', 'Asincrónico', 'Híbrido'];
const MEDIOS_CONOCIDOS = [
  ['contado', '💳 Contado'], ['debitoAutomatico', '🔄 Débito automático'], ['exterior', '🌎 Exterior (USD)']
];

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function money(n) { return `$${Math.round(n).toLocaleString('es-AR')}`; }
function conDescuento(total, pct) { return total * (1 - num(pct) / 100); }

// Saca la cantidad de cuotas del texto libre de duración (ej: "12 cuotas · 12 meses" -> 12).
function cantCuotasDeDuracion(duracion) {
  const m = (duracion || '').match(/(\d+)\s*cuotas?/i);
  return m ? Number(m[1]) : null;
}

function pctEfectivo(producto, tierId, config) {
  const d = producto.descuentos?.[tierId];
  if (!d) return null;
  if (d.override) return d.pct;
  return config.find((t) => t.tierId === tierId)?.pct ?? d.pct;
}

const FORM_VACIO = {
  nombre: '', modalidad: 'Sincrónico', formato: 'Sincrónico', estado: 'Activo',
  valorLista: '', valorUnPago: '', precioExterior: '',
  margen: '', duracion: '', descripcion: '', publicoObjetivo: '', landing: '',
  proximaActualizacion: '', proximaEdicion: '',
  descuentos: {}, cuotasEscalonadas: [], mediosDePago: {},
  esVariante: false, varianteDeId: '', motivo: '', sinNiveles: false, archivado: false
};

function BadgeEstado({ estado }) {
  const clases = estado === 'Activo' ? 'bg-successBg text-successText'
    : estado === 'Pausado' ? 'bg-warningBg text-warningText'
    : 'bg-infoBg text-infoText';
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${clases}`}>{estado}</span>;
}
function BadgeFormato({ formato }) {
  const clases = formato === 'Sincrónico' ? 'bg-accentPurple/20 text-accentPurple'
    : formato === 'Asincrónico' ? 'bg-accentTeal/20 text-accentTeal'
    : 'bg-accentMagenta/20 text-accentMagenta';
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${clases}`}>{formato}</span>;
}

export default function ProductosValoresPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();

  const [productos, setProductos] = useState(null);
  const [config, setConfig] = useState([]);
  const [errorCarga, setErrorCarga] = useState('');
  const [mostrarVariantes, setMostrarVariantes] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroModalidad, setFiltroModalidad] = useState('');
  const [filtroFormato, setFiltroFormato] = useState('');
  const [expandidos, setExpandidos] = useState(new Set());

  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [editandoConfig, setEditandoConfig] = useState(false);
  const [configTemp, setConfigTemp] = useState([]);

  const puedeVer = tienePermisoProductosVer(usuario);
  const puedeEditar = tienePermisoProductosEditar(usuario);

  useEffect(() => {
    if (!usuario) return;
    if (!puedeVer) { router.push('/dashboard'); return; }
    cargar();
  }, [usuario]);

  function mostrarAviso(tipo, texto) {
    setAviso({ tipo, texto });
    setTimeout(() => setAviso((a) => (a?.texto === texto ? null : a)), 4000);
  }

  async function cargar() {
    setErrorCarga('');
    try {
      const res = await fetch(`/api/productos-valores?solicitanteEmail=${encodeURIComponent(usuario.email)}`);
      const r = await res.json();
      if (!res.ok || r.error) { setErrorCarga(r.error || 'No se pudo cargar el catálogo.'); setProductos([]); return; }
      setProductos(r.productos || []);
      setConfig(r.config || []);
    } catch (err) {
      setErrorCarga('No se pudo conectar con el servidor.');
      setProductos([]);
    }
  }

  function toggleExpandido(id) {
    setExpandidos((prev) => {
      const nuevo = new Set(prev);
      nuevo.has(id) ? nuevo.delete(id) : nuevo.add(id);
      return nuevo;
    });
  }

  function abrirNuevo() {
    setForm(FORM_VACIO);
    setErrorForm('');
    setEditando({});
  }
  function abrirEdicion(p) {
    setForm({
      nombre: p.nombre, modalidad: p.modalidad, formato: p.formato || 'Sincrónico', estado: p.estado,
      valorLista: p.valorLista || '', valorUnPago: p.valorUnPago || '', precioExterior: p.precioExterior || '',
      margen: p.margen || '', duracion: p.duracion || '', descripcion: p.descripcion || '',
      publicoObjetivo: p.publicoObjetivo || '', landing: p.landing || '',
      proximaActualizacion: p.proximaActualizacion || '', proximaEdicion: p.proximaEdicion || '',
      descuentos: p.descuentos || {}, cuotasEscalonadas: p.cuotasEscalonadas || [], mediosDePago: p.mediosDePago || {},
      esVariante: p.esVariante, varianteDeId: p.varianteDeId || '', motivo: p.motivo || '',
      sinNiveles: p.sinNiveles, archivado: p.archivado
    });
    setErrorForm('');
    setEditando(p);
  }

  function setDescuento(tierId, campo, valor) {
    setForm((f) => ({ ...f, descuentos: { ...f.descuentos, [tierId]: { ...(f.descuentos[tierId] || { pct: 0, override: false }), [campo]: valor } } }));
  }
  function quitarDescuento(tierId) {
    setForm((f) => { const d = { ...f.descuentos }; delete d[tierId]; return { ...f, descuentos: d }; });
  }
  function agregarDescuento(tierId) {
    const tierDefault = config.find((t) => t.tierId === tierId)?.pct || 0;
    setForm((f) => ({ ...f, descuentos: { ...f.descuentos, [tierId]: { pct: tierDefault, override: false } } }));
  }

  function setMedio(clave, campo, valor) {
    setForm((f) => ({ ...f, mediosDePago: { ...f.mediosDePago, [clave]: { ...(f.mediosDePago[clave] || { link: '', valor: null }), [campo]: valor } } }));
  }
  function quitarMedio(clave) {
    setForm((f) => { const m = { ...f.mediosDePago }; delete m[clave]; return { ...f, mediosDePago: m }; });
  }

  function agregarTramo() {
    setForm((f) => ({ ...f, cuotasEscalonadas: [...f.cuotasEscalonadas, { tramo: '', pctDto: '', valorAnterior: '', valor: '' }] }));
  }
  function editarTramo(i, campo, valor) {
    setForm((f) => ({ ...f, cuotasEscalonadas: f.cuotasEscalonadas.map((t, idx) => idx === i ? { ...t, [campo]: valor } : t) }));
  }
  function quitarTramo(i) {
    setForm((f) => ({ ...f, cuotasEscalonadas: f.cuotasEscalonadas.filter((_, idx) => idx !== i) }));
  }

  async function guardar() {
    if (!form.nombre.trim()) { setErrorForm('Falta el nombre del producto.'); return; }
    setErrorForm('');
    setGuardando(true);
    try {
      const res = await fetch('/api/productos-valores', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editando?.id, ...form, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
      });
      const r = await res.json();
      if (!res.ok || r.error) { setErrorForm(r.error || 'No se pudo guardar.'); setGuardando(false); return; }
      setEditando(null);
      mostrarAviso('success', '✓ Guardado correctamente');
      cargar();
    } catch (err) {
      setErrorForm('No se pudo conectar con el servidor.');
    }
    setGuardando(false);
  }

  async function borrar(p) {
    try {
      const res = await fetch('/api/productos-valores', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, nombre: p.nombre, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
      });
      const r = await res.json();
      setConfirmarBorrar(null);
      if (!res.ok || r.error) { mostrarAviso('error', `✕ ${r.error || 'No se pudo eliminar.'}`); return; }
      mostrarAviso('success', '✓ Eliminado');
      cargar();
    } catch (err) {
      setConfirmarBorrar(null);
      mostrarAviso('error', '✕ No se pudo conectar con el servidor.');
    }
  }

  function abrirEdicionConfig() {
    setConfigTemp(config.map((t) => ({ ...t })));
    setEditandoConfig(true);
  }
  async function guardarConfig() {
    setGuardando(true);
    try {
      for (const t of configTemp) {
        const original = config.find((c) => c.tierId === t.tierId);
        if (original && Number(original.pct) === Number(t.pct)) continue;
        await fetch('/api/productos-valores/config', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tierId: t.tierId, pct: Number(t.pct), solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
        });
      }
      setEditandoConfig(false);
      mostrarAviso('success', '✓ Niveles actualizados');
      cargar();
    } catch (err) {
      mostrarAviso('error', '✕ No se pudo guardar.');
    }
    setGuardando(false);
  }

  if (!usuario || !puedeVer) return null;

  const productosSinArchivarNiVariantes = (productos || []).filter((p) => !p.archivado && !p.esVariante);

  const productosVisibles = (productos || [])
    .filter((p) => mostrarVariantes || !p.esVariante)
    .filter((p) => filtroEstado === 'Archivado' ? p.archivado : (!p.archivado && (!filtroEstado || p.estado === filtroEstado)))
    .filter((p) => !filtroModalidad || p.modalidad === filtroModalidad)
    .filter((p) => !filtroFormato || p.formato === filtroFormato);

  const conteoPorEstado = ESTADOS.map((e) => ({
    estado: e, cantidad: productosSinArchivarNiVariantes.filter((p) => p.estado === e).length
  })).filter((e) => e.cantidad > 0);
  const cantidadArchivados = (productos || []).filter((p) => p.archivado && !p.esVariante).length;
  const conteoPorModalidad = MODALIDADES.map((m) => ({
    modalidad: m, cantidad: productosSinArchivarNiVariantes.filter((p) => p.modalidad === m).length
  })).filter((m) => m.cantidad > 0);
  const conteoPorFormato = FORMATOS.map((f) => ({
    formato: f, cantidad: productosSinArchivarNiVariantes.filter((p) => p.formato === f).length
  })).filter((f) => f.cantidad > 0);

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-16">

        {aviso && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg ${
            aviso.tipo === 'success' ? 'bg-successBg text-successText border border-successText/30' : 'bg-dangerBg text-dangerText border border-dangerText/30'
          }`}>
            {aviso.texto}
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <h3 className="text-lg font-bold">💲 Productos y Valores</h3>
          {puedeEditar && (
            <button onClick={abrirNuevo} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold">+ Nuevo producto</button>
          )}
        </div>
        <p className="text-textMuted text-xs mb-4">Precios, descuentos por nivel y botones de pago de cada curso.</p>

        {/* NIVELES GENERALES */}
        <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Niveles de descuento (general)</p>
            {puedeEditar && !editandoConfig && <button onClick={abrirEdicionConfig} className="text-xs text-accentTeal font-semibold">✏️ Editar</button>}
          </div>
          {editandoConfig ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                {configTemp.map((t, i) => (
                  <div key={t.tierId}>
                    <label className="text-[11px] text-textSec block mb-1">{t.label}</label>
                    <input type="text" inputMode="decimal" value={t.pct}
                      onChange={(e) => setConfigTemp((prev) => prev.map((x, idx) => idx === i ? { ...x, pct: e.target.value } : x))}
                      className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditandoConfig(false)} className="text-xs px-3 py-1.5 rounded-lg bg-surface2 border border-border">Cancelar</button>
                <button onClick={guardarConfig} disabled={guardando} className="text-xs px-3 py-1.5 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-60">
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              {config.map((t) => (
                <span key={t.tierId} className="text-xs px-3 py-1 rounded-full bg-infoBg text-infoText font-medium">{t.label}: {t.pct}%</span>
              ))}
            </div>
          )}
          <p className="text-textMuted text-[11px] mt-2">Este % se usa en todo producto que no tenga un valor propio ("override") para ese nivel.</p>
        </div>

        {/* FILTROS — 3 filas claramente separadas */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <button onClick={() => setFiltroEstado('')}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${filtroEstado === '' ? 'bg-accentPurple border-accentPurple text-white' : 'bg-surface2 border-border text-textSec hover:text-text'}`}>
            Todos ({productosSinArchivarNiVariantes.length})
          </button>
          {conteoPorEstado.map((e) => (
            <button key={e.estado} onClick={() => setFiltroEstado(e.estado)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${filtroEstado === e.estado ? 'bg-accentPurple border-accentPurple text-white' : 'bg-surface2 border-border text-textSec hover:text-text'}`}>
              {e.estado === 'Activo' ? 'Activos' : e.estado === 'Pausado' ? 'Pausados' : 'Próximamente'} ({e.cantidad})
            </button>
          ))}
          {cantidadArchivados > 0 && (
            <button onClick={() => setFiltroEstado('Archivado')}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${filtroEstado === 'Archivado' ? 'bg-accentPurple border-accentPurple text-white' : 'bg-surface2 border-border text-textSec hover:text-text'}`}>
              Archivados ({cantidadArchivados})
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <button onClick={() => setFiltroModalidad('')}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${filtroModalidad === '' ? 'bg-accentTeal border-accentTeal text-white' : 'bg-surface2 border-border text-textSec hover:text-text'}`}>
            Todos los tipos
          </button>
          {conteoPorModalidad.map((m) => (
            <button key={m.modalidad} onClick={() => setFiltroModalidad(filtroModalidad === m.modalidad ? '' : m.modalidad)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${filtroModalidad === m.modalidad ? 'bg-accentTeal border-accentTeal text-white' : 'bg-surface2 border-border text-textSec hover:text-text'}`}>
              {m.modalidad} ({m.cantidad})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <button onClick={() => setFiltroFormato('')}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${filtroFormato === '' ? 'bg-accentMagenta border-accentMagenta text-white' : 'bg-surface2 border-border text-textSec hover:text-text'}`}>
            Todos los formatos
          </button>
          {conteoPorFormato.map((f) => (
            <button key={f.formato} onClick={() => setFiltroFormato(filtroFormato === f.formato ? '' : f.formato)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${filtroFormato === f.formato ? 'bg-accentMagenta border-accentMagenta text-white' : 'bg-surface2 border-border text-textSec hover:text-text'}`}>
              {f.formato === 'Sincrónico' ? 'Sincrónicos' : f.formato === 'Asincrónico' ? 'Asincrónicos' : 'Híbridos'} ({f.cantidad})
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-textSec cursor-pointer mb-4 w-fit">
          <input type="checkbox" checked={mostrarVariantes} onChange={(e) => setMostrarVariantes(e.target.checked)} />
          Mostrar variantes (cambios de cursada, re cursadas, etc.)
        </label>

        {errorCarga ? (
          <div className="bg-dangerBg border border-dangerText/30 rounded-2xl p-6 text-center">
            <p className="text-dangerText text-sm font-semibold mb-3">✕ {errorCarga}</p>
            <button onClick={cargar} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold">Reintentar</button>
          </div>
        ) : productos === null ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : productosVisibles.length === 0 ? (
          <p className="text-textMuted text-sm">Sin productos que coincidan con estos filtros.</p>
        ) : (
          <div className="space-y-2.5">
            {productosVisibles.map((p) => {
              const abierto = expandidos.has(p.id);
              const cantCuotas = cantCuotasDeDuracion(p.duracion);
              const tieneEscalonadas = p.cuotasEscalonadas?.length > 0;
              const filasDescuento = Object.keys(p.descuentos || {}).map((tierId) => {
                const pct = pctEfectivo(p, tierId, config);
                const label = config.find((t) => t.tierId === tierId)?.label || tierId;
                return pct > 0 ? { label, pct, valor: conDescuento(p.valorLista, pct) } : null;
              }).filter(Boolean);
              const productoPadre = p.esVariante ? productos.find((x) => x.id === p.varianteDeId) : null;
              const mediosDisponibles = Object.entries(p.mediosDePago || {}).filter(([, m]) => m.link);

              return (
                <div key={p.id} className="bg-surface border border-border rounded-2xl overflow-hidden">
                  {/* CABECERA — siempre visible, clickeable para expandir/colapsar */}
                  <button onClick={() => toggleExpandido(p.id)} className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-bg/40 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <p className="text-sm font-semibold truncate">{p.nombre}</p>
                        <BadgeEstado estado={p.estado} />
                        <BadgeFormato formato={p.formato} />
                        {p.esVariante && <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface2 text-textMuted">Variante</span>}
                      </div>
                      <p className="text-textMuted text-xs">{p.modalidad}{p.duracion ? ` · ${p.duracion}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-base font-bold">{money(p.valorLista)}</p>
                        <p className="text-textMuted text-[10px]">Valor de lista</p>
                      </div>
                      <span className="text-textMuted text-lg">{abierto ? '▾' : '▸'}</span>
                    </div>
                  </button>

                  {abierto && (
                    <div className="px-4 sm:px-5 pb-5 border-t border-border pt-4">
                      {p.descripcion && <p className="text-textSec text-xs mb-3">{p.descripcion}</p>}

                      {p.esVariante && (
                        <p className="text-textMuted text-[11px] mb-3">
                          {productoPadre ? `Variante de: ${productoPadre.nombre}` : ''}{p.motivo ? ` — ${p.motivo}` : ''}
                        </p>
                      )}

                      {/* PRECIO BASE / CUOTAS */}
                      <div className="bg-bg border border-border rounded-xl p-3.5 mb-3">
                        <div className="text-center mb-2">
                          <p className="text-2xl font-bold">{money(p.valorLista)}</p>
                          <p className="text-textMuted text-[11px]">Valor de lista</p>
                        </div>
                        {tieneEscalonadas ? (
                          <div className="overflow-x-auto mt-3">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-textSec text-left border-b border-border">
                                  <th className="pr-3 py-1">Tramo</th><th className="pr-3">Dto</th><th>Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.cuotasEscalonadas.map((t, i) => (
                                  <tr key={i} className="border-b border-border last:border-b-0">
                                    <td className="pr-3 py-1 text-textSec">{t.tramo}</td>
                                    <td className="pr-3 text-warningText">-{t.pctDto}%</td>
                                    <td className="font-medium">{money(t.valor)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : cantCuotas && cantCuotas > 1 ? (
                          <div className="flex items-center justify-center gap-4 text-sm">
                            {p.valorUnPago ? <span className="text-textSec">Contado: <b className="text-text">{money(p.valorUnPago)}</b></span> : null}
                            <span className="text-textSec">{cantCuotas} cuotas: <b className="text-text">{money(p.valorLista / cantCuotas)}/mes</b></span>
                          </div>
                        ) : p.valorUnPago ? (
                          <div className="flex items-center justify-center gap-4 text-sm">
                            <span className="text-textSec">Pago único: <b className="text-text">{money(p.valorUnPago)}</b></span>
                          </div>
                        ) : null}
                        {p.precioExterior ? <p className="text-textMuted text-[11px] text-center mt-2">Exterior: USD {p.precioExterior}</p> : null}
                      </div>

                      {/* TABLA DE DESCUENTOS + MEDIOS DE PAGO */}
                      {filasDescuento.length > 0 && (
                        <div className="overflow-x-auto mb-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-textSec text-left border-b border-border">
                                <th className="py-1.5 pr-3">Beneficio</th><th className="pr-3">Descuento</th><th className="pr-3">Precio</th><th>Medios de pago</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filasDescuento.map((f) => (
                                <tr key={f.label} className="border-b border-border last:border-b-0">
                                  <td className="py-2 pr-3 text-textSec">{f.label}</td>
                                  <td className="pr-3 text-warningText font-medium">-{f.pct}%</td>
                                  <td className="pr-3 font-bold text-successText">{money(f.valor)}</td>
                                  <td>
                                    {mediosDisponibles.length > 0 ? (
                                      <div className="flex gap-1 flex-wrap">
                                        {mediosDisponibles.map(([clave, m]) => (
                                          <a key={clave} href={m.link} target="_blank" rel="noopener noreferrer"
                                            className="text-[10px] px-2 py-0.5 rounded-full bg-infoBg text-infoText font-semibold whitespace-nowrap">
                                            {MEDIOS_CONOCIDOS.find(([k]) => k === clave)?.[1] || clave}
                                          </a>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-textMuted text-[11px]">Sin medio de pago cargado</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {puedeEditar && (
                        <div className="flex items-center gap-2 pt-2">
                          <button onClick={() => abrirEdicion(p)} className="text-xs text-accentTeal font-semibold">✏️ Editar</button>
                          <button onClick={() => setConfirmarBorrar(p)} className="text-xs text-dangerText font-semibold">🗑 Eliminar</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editando !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4 py-8" onClick={() => setEditando(null)}>
          <div className="bg-surface2 border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold mb-4">{editando.id ? `Editar ${editando.nombre}` : 'Nuevo producto'}</p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="col-span-2">
                <label className="text-[11px] text-textSec block mb-1">Nombre</label>
                <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[11px] text-textSec block mb-1">Modalidad (tipo de producto)</label>
                <select value={form.modalidad} onChange={(e) => setForm((f) => ({ ...f, modalidad: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-2 py-2 text-sm">
                  {MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-textSec block mb-1">Formato (badge visible)</label>
                <select value={form.formato} onChange={(e) => setForm((f) => ({ ...f, formato: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-2 py-2 text-sm">
                  {FORMATOS.map((f2) => <option key={f2} value={f2}>{f2}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-textSec block mb-1">Estado</label>
                <select value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-2 py-2 text-sm">
                  {ESTADOS.map((e2) => <option key={e2} value={e2}>{e2}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-textSec block mb-1">Valor de lista ($)</label>
                <input type="text" inputMode="decimal" value={form.valorLista} onChange={(e) => setForm((f) => ({ ...f, valorLista: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-2 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[11px] text-textSec block mb-1">Pago único ($, opcional)</label>
                <input type="text" inputMode="decimal" value={form.valorUnPago} onChange={(e) => setForm((f) => ({ ...f, valorUnPago: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-2 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[11px] text-textSec block mb-1">Precio exterior (USD, opcional)</label>
                <input type="text" inputMode="decimal" value={form.precioExterior} onChange={(e) => setForm((f) => ({ ...f, precioExterior: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-2 py-2 text-sm" />
              </div>
            </div>

            <label className="text-[11px] text-textSec block mb-1">Duración (texto libre, ej: "4 cuotas · 8 semanas")</label>
            <input value={form.duracion} onChange={(e) => setForm((f) => ({ ...f, duracion: e.target.value }))}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />

            <label className="text-[11px] text-textSec block mb-1">Descripción</label>
            <textarea rows={2} value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />

            <label className="text-[11px] text-textSec block mb-1">Landing (link, opcional)</label>
            <input value={form.landing} onChange={(e) => setForm((f) => ({ ...f, landing: e.target.value }))}
              placeholder="https://..." className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-4" />

            <p className="text-xs font-semibold text-textSec mb-2">Descuentos por nivel</p>
            <div className="space-y-1.5 mb-2">
              {Object.entries(form.descuentos).map(([tierId, d]) => (
                <div key={tierId} className="flex items-center gap-2 bg-bg border border-border rounded-lg px-3 py-2">
                  <span className="text-xs w-28 shrink-0">{config.find((t) => t.tierId === tierId)?.label || tierId}</span>
                  <input type="text" inputMode="decimal" value={d.pct} onChange={(e) => setDescuento(tierId, 'pct', e.target.value)}
                    disabled={!d.override} className="w-16 bg-surface2 border border-border rounded px-2 py-1 text-xs disabled:opacity-50" />
                  <label className="flex items-center gap-1 text-[11px] text-textSec">
                    <input type="checkbox" checked={d.override} onChange={(e) => setDescuento(tierId, 'override', e.target.checked)} />
                    Fijo (no seguir el general)
                  </label>
                  <button onClick={() => quitarDescuento(tierId)} className="text-dangerText text-xs ml-auto">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap mb-4">
              {config.filter((t) => !form.descuentos[t.tierId]).map((t) => (
                <button key={t.tierId} onClick={() => agregarDescuento(t.tierId)} className="text-[11px] px-2.5 py-1 rounded-full bg-surface2 border border-border text-textSec">+ {t.label}</button>
              ))}
            </div>

            <p className="text-xs font-semibold text-textSec mb-2">Cuotas escalonadas (opcional)</p>
            <div className="space-y-1.5 mb-2">
              {form.cuotasEscalonadas.map((t, i) => (
                <div key={i} className="grid grid-cols-4 gap-1.5 items-center">
                  <input value={t.tramo} onChange={(e) => editarTramo(i, 'tramo', e.target.value)} placeholder="Tramo (ej: Cuota 1)"
                    className="bg-bg border border-border rounded px-2 py-1.5 text-xs col-span-2" />
                  <input type="text" inputMode="decimal" value={t.pctDto} onChange={(e) => editarTramo(i, 'pctDto', e.target.value)} placeholder="% dto"
                    className="bg-bg border border-border rounded px-2 py-1.5 text-xs" />
                  <div className="flex gap-1">
                    <input type="text" inputMode="decimal" value={t.valor} onChange={(e) => editarTramo(i, 'valor', e.target.value)} placeholder="Valor $"
                      className="bg-bg border border-border rounded px-2 py-1.5 text-xs flex-1" />
                    <button onClick={() => quitarTramo(i)} className="text-dangerText text-xs shrink-0">✕</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={agregarTramo} className="text-[11px] px-2.5 py-1 rounded-full bg-surface2 border border-border text-textSec mb-4">+ Agregar tramo</button>

            <p className="text-xs font-semibold text-textSec mb-2">Medios de pago</p>
            <div className="space-y-1.5 mb-2">
              {Object.entries(form.mediosDePago).map(([clave, m]) => (
                <div key={clave} className="flex items-center gap-2 bg-bg border border-border rounded-lg px-3 py-2">
                  <span className="text-xs w-32 shrink-0">{MEDIOS_CONOCIDOS.find(([k]) => k === clave)?.[1] || clave}</span>
                  <input value={m.link} onChange={(e) => setMedio(clave, 'link', e.target.value)} placeholder="Link de pago"
                    className="flex-1 bg-surface2 border border-border rounded px-2 py-1 text-xs" />
                  {clave === 'exterior' && (
                    <input type="text" inputMode="decimal" value={m.valor ?? ''} onChange={(e) => setMedio(clave, 'valor', e.target.value)} placeholder="USD"
                      className="w-16 bg-surface2 border border-border rounded px-2 py-1 text-xs" />
                  )}
                  <button onClick={() => quitarMedio(clave)} className="text-dangerText text-xs">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap mb-4">
              {MEDIOS_CONOCIDOS.filter(([k]) => !form.mediosDePago[k]).map(([k, label]) => (
                <button key={k} onClick={() => setMedio(k, 'link', '')} className="text-[11px] px-2.5 py-1 rounded-full bg-surface2 border border-border text-textSec">+ {label}</button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-textSec mb-2 cursor-pointer">
              <input type="checkbox" checked={form.esVariante} onChange={(e) => setForm((f) => ({ ...f, esVariante: e.target.checked }))} />
              Es una variante de otro producto (cambio de cursada, re cursada, etc.)
            </label>
            {form.esVariante && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <input value={form.varianteDeId} onChange={(e) => setForm((f) => ({ ...f, varianteDeId: e.target.value }))}
                  placeholder="ID del producto padre" className="bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
                <input value={form.motivo} onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
                  placeholder="Motivo (ej: Cambio de cursada)" className="bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
            )}

            <label className="flex items-center gap-2 text-xs text-textSec mb-4 cursor-pointer">
              <input type="checkbox" checked={form.archivado} onChange={(e) => setForm((f) => ({ ...f, archivado: e.target.checked }))} />
              Archivado (oculto por defecto del listado)
            </label>

            {errorForm && <p className="text-dangerText text-xs mb-3">✕ {errorForm}</p>}
            <div className="flex gap-2">
              <button onClick={() => setEditando(null)} className="text-sm px-4 py-2 rounded-lg bg-surface border border-border flex-1">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold flex-1 disabled:opacity-60">
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmarBorrar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setConfirmarBorrar(null)}>
          <div className="bg-surface2 border border-border rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold mb-2">¿Eliminar "{confirmarBorrar.nombre}"?</p>
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
