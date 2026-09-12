'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { useSession } from '../../lib/useSession';
import { tienePermisoProductosVer, tienePermisoProductosEditar } from '../../lib/permisos';

const FORM_VACIO = {
  nombre: '', modalidad: '', valorCuota: '', cantCuotas: '', estado: 'Activo',
  descuento1Pct: '', descuento1Horas: '48',
  descuento2Pct: '', descuento2Dias: '30',
  descuentoDocentePct: '', descuentoComunidadPct: '', descuentoPagoUnicoPct: '',
  mercadoPagoLink: '', paypalLink: ''
};

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function money(n) {
  return `$${Math.round(n).toLocaleString('es-AR')}`;
}
// Total de lista = cuotas × valor de cada cuota.
function totalLista(p) {
  return num(p.valorCuota) * num(p.cantCuotas || 1);
}
function conDescuento(total, pct) {
  return total * (1 - num(pct) / 100);
}

export default function ProductosValoresPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();

  const [productos, setProductos] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [mostrarArchivados, setMostrarArchivados] = useState(false);

  const [editando, setEditando] = useState(null); // null = cerrado, {} = nuevo, {...producto} = editar
  const [form, setForm] = useState(FORM_VACIO);
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(null);
  const [aviso, setAviso] = useState(null);

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
      if (!res.ok || r.error) { setErrorCarga(r.error || 'No se pudo cargar el catálogo.'); setProductos([]); }
      else setProductos(r.productos || []);
    } catch (err) {
      setErrorCarga('No se pudo conectar con el servidor.');
      setProductos([]);
    }
  }

  function abrirNuevo() {
    setForm(FORM_VACIO);
    setErrorForm('');
    setEditando({});
  }
  function abrirEdicion(p) {
    setForm({
      nombre: p.nombre || '', modalidad: p.modalidad || '', valorCuota: p.valorCuota || '', cantCuotas: p.cantCuotas || '',
      estado: p.estado || 'Activo',
      descuento1Pct: p.descuento1Pct || '', descuento1Horas: p.descuento1Horas || '48',
      descuento2Pct: p.descuento2Pct || '', descuento2Dias: p.descuento2Dias || '30',
      descuentoDocentePct: p.descuentoDocentePct || '', descuentoComunidadPct: p.descuentoComunidadPct || '',
      descuentoPagoUnicoPct: p.descuentoPagoUnicoPct || '',
      mercadoPagoLink: p.mercadoPagoLink || '', paypalLink: p.paypalLink || ''
    });
    setErrorForm('');
    setEditando(p);
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

  if (!usuario || !puedeVer) return null;

  const productosVisibles = (productos || []).filter((p) => mostrarArchivados || p.estado !== 'Archivado');

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pb-16">

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
        <p className="text-textMuted text-xs mb-4">Precios, descuentos y botones de pago de cada curso. La app calcula los precios con descuento sola.</p>

        <label className="flex items-center gap-2 text-xs text-textSec mb-4 cursor-pointer w-fit">
          <input type="checkbox" checked={mostrarArchivados} onChange={(e) => setMostrarArchivados(e.target.checked)} />
          Mostrar archivados
        </label>

        {errorCarga ? (
          <div className="bg-dangerBg border border-dangerText/30 rounded-2xl p-6 text-center">
            <p className="text-dangerText text-sm font-semibold mb-3">✕ {errorCarga}</p>
            <button onClick={cargar} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold">Reintentar</button>
          </div>
        ) : productos === null ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : productosVisibles.length === 0 ? (
          <p className="text-textMuted text-sm">Sin productos cargados todavía.</p>
        ) : (
          <div className="space-y-3">
            {productosVisibles.map((p) => {
              const total = totalLista(p);
              const filas = [
                num(p.descuento1Pct) > 0 && { label: `Descuento 1 (${p.descuento1Horas || 48}hs)`, valor: conDescuento(total, p.descuento1Pct), pct: p.descuento1Pct },
                num(p.descuento2Pct) > 0 && { label: `A los ${p.descuento2Dias || 30} días (pago único)`, valor: conDescuento(total, p.descuento2Pct), pct: p.descuento2Pct },
                num(p.descuentoDocentePct) > 0 && { label: 'Docente (por cuota)', valor: conDescuento(num(p.valorCuota), p.descuentoDocentePct), pct: p.descuentoDocentePct, porCuota: true },
                num(p.descuentoComunidadPct) > 0 && { label: 'Comunidad', valor: conDescuento(total, p.descuentoComunidadPct), pct: p.descuentoComunidadPct },
                num(p.descuentoPagoUnicoPct) > 0 && { label: 'Pago único', valor: conDescuento(total, p.descuentoPagoUnicoPct), pct: p.descuentoPagoUnicoPct }
              ].filter(Boolean);

              return (
                <div key={p.id} className="bg-surface border border-border rounded-2xl p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {p.nombre}
                        {p.estado === 'Archivado' && <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-surface2 text-textMuted">Archivado</span>}
                      </p>
                      <p className="text-textMuted text-xs">{p.modalidad}</p>
                    </div>
                    {puedeEditar && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => abrirEdicion(p)} className="text-xs text-accentTeal font-semibold">✏️ Editar</button>
                        <button onClick={() => setConfirmarBorrar(p)} className="text-xs text-dangerText font-semibold">🗑</button>
                      </div>
                    )}
                  </div>

                  <p className="text-sm mb-2">
                    Lista: <b>{p.cantCuotas} cuota{Number(p.cantCuotas) !== 1 ? 's' : ''} de {money(num(p.valorCuota))}</b>
                    <span className="text-textMuted"> (total {money(total)})</span>
                  </p>

                  {filas.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-1.5 mb-3">
                      {filas.map((f) => (
                        <div key={f.label} className="flex items-center justify-between bg-bg border border-border rounded-lg px-3 py-1.5 text-xs">
                          <span className="text-textSec">{f.label} <span className="text-warningText">(-{f.pct}%)</span></span>
                          <b className="text-successText">{money(f.valor)}{f.porCuota ? ' /cuota' : ''}</b>
                        </div>
                      ))}
                    </div>
                  )}

                  {(p.mercadoPagoLink || p.paypalLink) && (
                    <div className="flex gap-2 flex-wrap">
                      {p.mercadoPagoLink && (
                        <a href={p.mercadoPagoLink} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 rounded-lg bg-infoBg text-infoText font-semibold">💳 MercadoPago</a>
                      )}
                      {p.paypalLink && (
                        <a href={p.paypalLink} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 rounded-lg bg-infoBg text-infoText font-semibold">💳 PayPal</a>
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setEditando(null)}>
          <div className="bg-surface2 border border-border rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold mb-4">{editando.id ? `Editar ${editando.nombre}` : 'Nuevo producto'}</p>

            <label className="text-[11px] text-textSec block mb-1">Nombre</label>
            <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />

            <label className="text-[11px] text-textSec block mb-1">Modalidad (opcional)</label>
            <input value={form.modalidad} onChange={(e) => setForm((f) => ({ ...f, modalidad: e.target.value }))}
              placeholder="Ej: Online en vivo" className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-textSec block mb-1">Cantidad de cuotas</label>
                <input type="text" inputMode="numeric" value={form.cantCuotas} onChange={(e) => setForm((f) => ({ ...f, cantCuotas: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[11px] text-textSec block mb-1">Valor de cada cuota ($)</label>
                <input type="text" inputMode="decimal" value={form.valorCuota} onChange={(e) => setForm((f) => ({ ...f, valorCuota: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <p className="text-xs font-semibold text-textSec mb-2 mt-2">Descuentos (dejar vacío el % si no aplica)</p>

            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="text-[11px] text-textSec block mb-1">Descuento 1 — %</label>
                <input type="text" inputMode="decimal" value={form.descuento1Pct} onChange={(e) => setForm((f) => ({ ...f, descuento1Pct: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[11px] text-textSec block mb-1">Descuento 1 — dentro de (horas)</label>
                <input type="text" inputMode="numeric" value={form.descuento1Horas} onChange={(e) => setForm((f) => ({ ...f, descuento1Horas: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="text-[11px] text-textSec block mb-1">Descuento 2 (pago único) — %</label>
                <input type="text" inputMode="decimal" value={form.descuento2Pct} onChange={(e) => setForm((f) => ({ ...f, descuento2Pct: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[11px] text-textSec block mb-1">Descuento 2 — a los (días)</label>
                <input type="text" inputMode="numeric" value={form.descuento2Dias} onChange={(e) => setForm((f) => ({ ...f, descuento2Dias: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-textSec block mb-1">Docente — % (por cuota)</label>
                <input type="text" inputMode="decimal" value={form.descuentoDocentePct} onChange={(e) => setForm((f) => ({ ...f, descuentoDocentePct: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-2 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[11px] text-textSec block mb-1">Comunidad — %</label>
                <input type="text" inputMode="decimal" value={form.descuentoComunidadPct} onChange={(e) => setForm((f) => ({ ...f, descuentoComunidadPct: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-2 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[11px] text-textSec block mb-1">Pago único — %</label>
                <input type="text" inputMode="decimal" value={form.descuentoPagoUnicoPct} onChange={(e) => setForm((f) => ({ ...f, descuentoPagoUnicoPct: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-2 py-2 text-sm" />
              </div>
            </div>

            <p className="text-xs font-semibold text-textSec mb-2">Botones de pago</p>
            <label className="text-[11px] text-textSec block mb-1">Link de MercadoPago</label>
            <input value={form.mercadoPagoLink} onChange={(e) => setForm((f) => ({ ...f, mercadoPagoLink: e.target.value }))}
              placeholder="https://..." className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />
            <label className="text-[11px] text-textSec block mb-1">Link de PayPal</label>
            <input value={form.paypalLink} onChange={(e) => setForm((f) => ({ ...f, paypalLink: e.target.value }))}
              placeholder="https://..." className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />

            <label className="text-[11px] text-textSec block mb-1">Estado</label>
            <select value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-4">
              <option value="Activo">Activo</option>
              <option value="Archivado">Archivado</option>
            </select>

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
