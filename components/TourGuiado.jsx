'use client';
// Recorrido guiado ("❓ Necesito ayuda"), portado de Fichas ILCE. Diferencia clave: esta app
// es multi-página (rutas), no una sola página con pestañas — así que en vez de cambiar de
// pestaña, cada paso navega a su ruta con el router. Se monta en el layout para que el tour
// sobreviva a los cambios de página.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '../lib/useSession';

const PASOS = [
  { id: 'bienvenida', ruta: '/dashboard', selector: null, titulo: '¡Bienvenido/a a ILCE Gestión!', texto: 'Te mostramos rápido las secciones principales para hacer el seguimiento de leads y estudiantes.' },
  { id: 'dashboard', ruta: '/dashboard', selector: null, titulo: 'Dashboard', texto: 'Tu resumen del día y las acciones que necesitan atención ahora: a quién contactar, bienvenidas pendientes, etc.' },
  { id: 'nuevo-lead', ruta: '/dashboard', selector: 'a[href="/nuevo-lead"]', titulo: 'Cargar un lead', texto: 'Desde este botón agregás un nuevo lead o interesado al sistema.' },
  { id: 'inscritos', ruta: '/inscritos', selector: null, titulo: 'Inscritos', texto: 'El listado de estudiantes ya inscriptos, con sus datos, curso y estado.' },
  { id: 'reportes', ruta: '/reportes', selector: null, titulo: 'Reportes', texto: 'Métricas y análisis: leads, conversión, inscripciones por curso y evolución en el tiempo.' },
  { id: 'diplomas', ruta: '/diplomas', selector: null, titulo: 'Diplomas', texto: 'Seguimiento de las solicitudes y la emisión de diplomas.' },
  { id: 'emails', ruta: '/emails', selector: null, titulo: 'Emails', texto: 'Los correos automáticos que envía el sistema y el registro de envíos.' },
  { id: 'accesos', ruta: '/accesos', selector: null, requiere: 'admin', titulo: 'Accesos', texto: 'Quién entra al sistema y con qué permisos (solo Admin).' },
  { id: 'fin', ruta: null, selector: null, titulo: '¡Listo!', texto: 'Eso es lo principal. Podés volver a abrir esta ayuda cuando quieras, desde el botón “❓ Necesito ayuda”.' }
];
const TAREAS = [
  { id: 't-lead', pasoInicial: 'nuevo-lead', label: '¿Cómo cargo un lead nuevo?' },
  { id: 't-rep', pasoInicial: 'reportes', label: '¿Dónde veo los reportes?' },
  { id: 't-dip', pasoInicial: 'diplomas', label: '¿Dónde están los diplomas?' }
];

export default function TourGuiado() {
  const { usuario } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [activo, setActivo] = useState(false);
  const [pasoId, setPasoId] = useState(null);
  const [modoTarea, setModoTarea] = useState(false);
  const [rect, setRect] = useState(null);
  const [buscando, setBuscando] = useState(false);

  const esAdmin = !!(usuario && (usuario.roles || []).includes('Admin'));
  const permitido = useCallback((p) => !p.requiere || (p.requiere === 'admin' && esAdmin), [esAdmin]);
  const pasos = useMemo(() => PASOS.filter(permitido), [permitido]);

  const idx = pasoId ? pasos.findIndex((p) => p.id === pasoId) : -1;
  const pasoActual = idx >= 0 ? pasos[idx] : null;
  const total = pasos.length;

  const ubicarElemento = useCallback(() => {
    if (!pasoActual || !pasoActual.selector) { setRect(null); return; }
    const el = document.querySelector(pasoActual.selector);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else { setRect(null); }
  }, [pasoActual]);

  useEffect(() => {
    if (!activo || !pasoActual) return;
    if (pasoActual.ruta && pasoActual.ruta !== pathname) {
      setBuscando(true);
      router.push(pasoActual.ruta);
      return;
    }
    setBuscando(false);
    let intentos = 0;
    const id = setInterval(() => {
      intentos++;
      const listo = !pasoActual.selector || document.querySelector(pasoActual.selector);
      if (listo || intentos > 25) { clearInterval(id); ubicarElemento(); }
    }, 120);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, pasoActual, pathname]);

  useEffect(() => {
    if (!activo) return;
    const onCambio = () => ubicarElemento();
    window.addEventListener('resize', onCambio);
    window.addEventListener('scroll', onCambio, true);
    return () => { window.removeEventListener('resize', onCambio); window.removeEventListener('scroll', onCambio, true); };
  }, [activo, ubicarElemento]);

  if (!usuario) return null;

  function iniciarCompleto() { setMenuAbierto(false); setModoTarea(false); setActivo(true); setPasoId(pasos[0].id); }
  function iniciarTarea(t) { setMenuAbierto(false); setModoTarea(true); setActivo(true); setPasoId(t.pasoInicial); }
  function siguiente() { if (modoTarea) { cerrar(); return; } const next = pasos[idx + 1]; if (!next) { cerrar(); return; } setPasoId(next.id); }
  function anterior() { const prev = pasos[idx - 1]; if (prev) setPasoId(prev.id); }
  function cerrar() { setActivo(false); setPasoId(null); setRect(null); }

  return (
    <>
      <button
        onClick={() => setMenuAbierto((v) => !v)}
        className="fixed bottom-14 right-4 z-[90] bg-gradient-to-r from-accentPurple to-accentMagenta text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity no-print"
      >
        ❓ Necesito ayuda
      </button>

      {menuAbierto && !activo && (
        <div className="fixed inset-0 z-[91] flex items-end justify-end p-5" onClick={() => setMenuAbierto(false)}>
          <div className="bg-surface2 border border-border rounded-2xl p-4 w-80 max-w-[calc(100vw-40px)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-1">Te mostramos cómo funciona ILCE Gestión</h3>
            <p className="text-xs text-textSec mb-3">Vamos a recorrer juntos las secciones principales.</p>
            <button className="w-full bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-3 py-2 text-sm font-semibold mb-3" onClick={iniciarCompleto}>
              Comenzar recorrido
            </button>
            <p className="text-[11px] text-textMuted mb-1.5 font-semibold">O elegí una tarea puntual:</p>
            <div className="flex flex-col gap-1">
              {TAREAS.map((t) => (
                <button key={t.id} className="text-left text-xs text-textSec hover:text-text bg-bg border border-border rounded-lg px-2.5 py-1.5" onClick={() => iniciarTarea(t)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activo && pasoActual && (
        <TourOverlay paso={pasoActual} idx={idx} total={total} rect={rect} buscando={buscando} modoTarea={modoTarea}
          onSiguiente={siguiente} onAnterior={anterior} onSalir={cerrar} />
      )}
    </>
  );
}

function TourOverlay({ paso, idx, total, rect, buscando, modoTarea, onSiguiente, onAnterior, onSalir }) {
  const esFinal = idx === total - 1;
  const tooltipStyle = useMemo(() => {
    if (typeof window === 'undefined' || !rect) return null;
    const anchoTooltip = Math.min(320, window.innerWidth - 28);
    const altoAprox = 220;
    const debajo = rect.top + rect.height + altoAprox < window.innerHeight;
    const top = debajo ? rect.top + rect.height + 14 : Math.max(14, rect.top - 14 - altoAprox);
    const left = Math.min(Math.max(14, rect.left), window.innerWidth - anchoTooltip - 14);
    return { top, left, width: anchoTooltip };
  }, [rect]);

  return (
    <div className="fixed inset-0 z-[95] no-print">
      {rect ? (
        <>
          <div className="fixed bg-black/70 transition-all duration-200" style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top - 6) }} onClick={onSalir} />
          <div className="fixed bg-black/70 transition-all duration-200" style={{ top: rect.top - 6, left: 0, width: Math.max(0, rect.left - 6), height: rect.height + 12 }} onClick={onSalir} />
          <div className="fixed bg-black/70 transition-all duration-200" style={{ top: rect.top - 6, left: rect.left + rect.width + 6, right: 0, height: rect.height + 12 }} onClick={onSalir} />
          <div className="fixed bg-black/70 transition-all duration-200" style={{ top: rect.top + rect.height + 6, left: 0, right: 0, bottom: 0 }} onClick={onSalir} />
          <div className="fixed rounded-lg ring-2 ring-accentTeal pointer-events-none transition-all duration-200"
            style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, boxShadow: '0 0 0 4px rgba(45,212,191,0.25)' }} />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/70" onClick={onSalir} />
      )}

      <div className="fixed bg-surface2 border border-border rounded-2xl p-4 shadow-2xl"
        style={tooltipStyle || { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(320px, calc(100vw - 28px))' }}>
        {!esFinal && <p className="text-[11px] text-textMuted mb-1.5 font-semibold">{idx + 1} de {total}</p>}
        <h3 className="text-sm font-semibold mb-1.5">{paso.titulo}</h3>
        {buscando ? (
          <p className="text-xs text-textSec mb-3">Cargando…</p>
        ) : (
          <p className="text-xs text-textSec mb-3">{paso.texto}</p>
        )}
        <div className="flex items-center justify-between gap-2 mt-1">
          <button className="text-xs text-textMuted" onClick={onSalir}>Salir</button>
          <div className="flex gap-1.5">
            {idx > 0 && !modoTarea && (
              <button className="bg-transparent text-textSec border border-border rounded-lg px-2.5 py-1.5 text-xs" onClick={onAnterior}>← Atrás</button>
            )}
            <button className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-3 py-1.5 text-xs font-semibold" onClick={onSiguiente}>
              {esFinal || modoTarea ? 'Listo' : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
