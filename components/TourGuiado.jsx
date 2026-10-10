'use client';
// Recorrido guiado ("❓ Necesito ayuda"), portado de Fichas ILCE. Diferencia clave: esta app
// es multi-página (rutas), no una sola página con pestañas — así que en vez de cambiar de
// pestaña, cada paso navega a su ruta con el router. Se monta en el layout para que el tour
// sobreviva a los cambios de página.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '../lib/useSession';
import { APP_VERSION } from '../lib/version';
import { buscarAyuda } from '../lib/ayudaBusqueda';
import {
  tienePermisoCrearLeads, tienePermisoOperativo, tienePermisoEstudiantes, tienePermisoResumenEstudiantes,
  tienePermisoAcademicoVer, tienePermisoReportes, tienePermisoDiplomas, tienePermisoResumenDiario,
  tienePermisoInformesRRSS, tienePermisoAuditoria, tienePermisoBajas, tienePermisoAccesos,
  tienePermisoMensajesVer, tienePermisoEmails, tienePermisoBuscador
} from '../lib/permisos';

// "requiere" usa el mismo permiso real que protege cada página (ver AccesoDenegado en cada
// una) — así el recorrido guiado y las tareas puntuales nunca llevan a alguien a una sección
// a la que en realidad no tiene acceso. Se actualizó (sept. 2026) para cubrir todo el menú
// actual — antes solo tenía 6 de los ~17 ítems reales y algunos nombres ya no coincidían
// con el menú (ej: "Inscritos" ahora se llama "Estudiantes").
const PASOS = [
  { id: 'bienvenida', ruta: '/dashboard', selector: null, titulo: '¡Bienvenido/a a ILCE Gestión!', texto: 'Te mostramos rápido las secciones principales para hacer el seguimiento de leads y estudiantes.' },
  { id: 'dashboard', ruta: '/dashboard', selector: null, titulo: 'Dashboard', texto: 'Tu resumen del día y las acciones que necesitan atención ahora: a quién contactar, bienvenidas pendientes, etc.' },
  { id: 'nuevo-lead', ruta: '/dashboard', selector: 'a[href="/nuevo-lead"]', requiere: 'leads', titulo: 'Cargar un lead', texto: 'Desde este botón agregás un nuevo lead o interesado al sistema.' },
  { id: 'seguimiento', ruta: '/seguimiento', selector: null, requiere: 'operativo', titulo: 'Seguimiento', texto: 'El detalle de cada lead que todavía no compró: últimos contactos, próximo paso y filtros para organizar el trabajo del día.' },
  { id: 'estudiantes', ruta: '/inscritos', selector: null, requiere: 'estudiantes', titulo: 'Académico → Estudiantes', texto: 'El listado de estudiantes ya inscriptos, con sus datos, curso y estado.' },
  { id: 'inscripciones', ruta: '/resumen-estudiantes', selector: null, requiere: 'resumenEstudiantes', titulo: 'Académico → Inscripciones', texto: 'Resumen de altas y bienvenidas por edición: quién confirmó, quién falta.' },
  { id: 'academico', ruta: '/academico', selector: null, requiere: 'academicoVer', titulo: 'Académico → Académico', texto: 'Situación académica de cada estudiante por curso y edición (certificado, de baja, etc.), a cargo del equipo académico.' },
  { id: 'diplomas', ruta: '/diplomas', selector: null, requiere: 'diplomas', titulo: 'Académico → Diplomas', texto: 'Seguimiento de las solicitudes y la emisión de diplomas.' },
  { id: 'reportes', ruta: '/reportes', selector: null, requiere: 'reportes', titulo: 'Reportes → Ver todo', texto: 'Métricas y análisis: leads, conversión, inscripciones por curso y evolución en el tiempo.' },
  { id: 'resumen-diario', ruta: '/resumen-diario', selector: null, requiere: 'resumenDiario', titulo: 'Reportes → Resumen diario', texto: 'Los leads cargados y los contactos registrados en un día puntual — se puede exportar a Excel o imprimir.' },
  { id: 'informes-rrss', ruta: '/informes-rrss', selector: null, requiere: 'informesRRSS', titulo: 'Reportes → Informes RRSS', texto: 'Reporte mensual/anual de resultados de redes sociales.' },
  { id: 'auditoria', ruta: '/auditoria', selector: null, requiere: 'auditoria', titulo: 'Reportes → Historial de acciones', texto: 'Registro de quién hizo qué en el sistema (altas, ediciones, ventas), para auditar cualquier cambio.' },
  { id: 'bajas', ruta: '/bajas', selector: null, requiere: 'bajas', titulo: 'Reportes → Bajas', texto: 'Registro y seguimiento de las bajas de la cursada.' },
  { id: 'accesos', ruta: '/accesos', selector: null, requiere: 'accesos', titulo: 'Reportes → Accesos', texto: 'Quién entra al sistema y con qué permisos (solo Admin).' },
  { id: 'productos-valores', ruta: '/productos-valores', selector: null, titulo: 'Configuración → Productos y Valores', texto: 'Los cursos, sus precios y modalidades de pago vigentes.' },
  { id: 'mensajes', ruta: '/mensajes', selector: null, requiere: 'mensajesVer', titulo: 'Configuración → Mensajes frecuentes', texto: 'Mensajes ya redactados para copiar y pegar en las conversaciones con leads y estudiantes.' },
  { id: 'emails', ruta: '/emails', selector: null, requiere: 'emails', titulo: 'Configuración → Emails', texto: 'Los correos automáticos que envía el sistema y el registro de envíos.' },
  { id: 'fichas-enviadas', ruta: '/fichas-enviadas', selector: null, requiere: 'operativo', titulo: 'Configuración → Fichas enviadas', texto: 'Registro de las fichas de estudiante que se compartieron, y con quién.' },
  { id: 'buscador', ruta: '/buscador', selector: 'a[href="/buscador"]', requiere: 'buscador', titulo: 'Buscador', texto: 'Buscá a cualquier lead o estudiante por nombre, WhatsApp o email y entrá directo a su ficha.' },
  { id: 'fin', ruta: null, selector: null, titulo: '¡Listo!', texto: 'Eso es lo principal. Podés volver a abrir esta ayuda cuando quieras, desde el botón “ Necesito ayuda”.' },
  // ---- Pasos que solo se muestran dentro de una tarea (no en el recorrido completo) ----
  // "requiere: 'admin'" = solo se muestra a los Admin. ("excepto: 'admin'" = solo a quien NO es Admin; hoy no se usa.)
  { id: 'el-1', soloTarea: true, ruta: null, selector: null, requiere: 'admin', titulo: 'Eliminar un lead, uno por uno', texto: 'Entrá al Buscador, buscá al lead y abrí su ficha: ahí está el botón "Eliminar". Te pide confirmar. Se borra el lead y todo su historial de seguimiento, y no se puede deshacer.' },
  { id: 'el-2', soloTarea: true, ruta: null, selector: null, requiere: 'admin', titulo: 'Eliminar varios a la vez', texto: 'En Seguimiento, tildá los leads que quieras y apretá "Eliminar seleccionados". Te pide confirmar: se eliminan los leads junto con su seguimiento.' },
  { id: 'el-3', soloTarea: true, ruta: null, selector: null, requiere: 'admin', titulo: 'Leads que ya compraron', texto: 'Un lead con venta confirmada está protegido y no se elimina con el botón común. Un Admin puede forzarlo desde el Buscador con "Eliminar igual (tiene venta)". Pensalo bien: no se puede deshacer.' }
];

const TAREAS = [
  { id: 't-eliminar-lead', requiere: 'admin', secuencia: ['el-1', 'el-2', 'el-3'], label: '¿Cómo elimino un lead?', palabras: ['borrar', 'quitar', 'sacar', 'duplicado', 'cargado por error', 'eliminar lead'] },
  { id: 't-lead', pasoInicial: 'nuevo-lead', requiere: 'leads', label: '¿Cómo cargo un lead nuevo?', palabras: ['agregar', 'crear', 'nuevo', 'alta'] },
  { id: 't-rep', pasoInicial: 'reportes', requiere: 'reportes', label: '¿Dónde veo los reportes?' },
  { id: 't-dip', pasoInicial: 'diplomas', requiere: 'diplomas', label: '¿Dónde están los diplomas?' },
  { id: 't-baja', pasoInicial: 'bajas', requiere: 'bajas', label: '¿Dónde registro una baja?', palabras: ['dar de baja', 'abandono', 'dejo de cursar'] },
  { id: 't-buscador', pasoInicial: 'buscador', requiere: 'buscador', label: '¿Cómo busco a un estudiante?', palabras: ['encontrar', 'ubicar', 'lead'] }
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

  const CHEQUEOS = useMemo(() => ({
    leads: () => tienePermisoCrearLeads(usuario),
    operativo: () => tienePermisoOperativo(usuario),
    estudiantes: () => tienePermisoEstudiantes(usuario),
    resumenEstudiantes: () => tienePermisoResumenEstudiantes(usuario),
    academicoVer: () => tienePermisoAcademicoVer(usuario),
    reportes: () => tienePermisoReportes(usuario),
    diplomas: () => tienePermisoDiplomas(usuario),
    resumenDiario: () => tienePermisoResumenDiario(usuario),
    informesRRSS: () => tienePermisoInformesRRSS(usuario),
    auditoria: () => tienePermisoAuditoria(usuario),
    bajas: () => tienePermisoBajas(usuario),
    accesos: () => tienePermisoAccesos(usuario),
    mensajesVer: () => tienePermisoMensajesVer(usuario),
    emails: () => tienePermisoEmails(usuario),
    buscador: () => tienePermisoBuscador(usuario),
    admin: () => !!(usuario && usuario.roles && usuario.roles.includes('Admin'))
  }), [usuario]);
  const permitido = useCallback((p) => (!p.requiere || (CHEQUEOS[p.requiere]?.() ?? true)) && (!p.excepto || !(CHEQUEOS[p.excepto]?.() ?? false)), [CHEQUEOS]);
  // `pasosTodos` incluye los pasos que solo viven dentro de una tarea; el recorrido completo no los usa.
  const pasosTodos = useMemo(() => PASOS.filter(permitido), [permitido]);
  const pasos = useMemo(() => pasosTodos.filter((p) => !p.soloTarea), [pasosTodos]);
  const tareas = useMemo(() => TAREAS.filter((t) => permitido(t) && (!t.secuencia || t.secuencia.some((id) => pasosTodos.some((p) => p.id === id)))), [permitido, pasosTodos]);

  // Búsqueda dentro de la ayuda (pedido de Diego): la persona escribe lo que quiere hacer y aparecen las tareas y secciones que coinciden.
  const [consulta, setConsulta] = useState('');
  const [aviso, setAviso] = useState({ estado: '', texto: '' });
  const [secuencia, setSecuencia] = useState([]);
  const resultados = useMemo(() => {
    if (!consulta.trim()) return null;
    const items = [
      ...tareas.map((t) => ({ id: t.id, tipo: 'tarea', titulo: t.label, palabras: t.palabras, tarea: t })),
      ...pasos.map((p) => ({ id: p.id, tipo: 'paso', titulo: p.titulo, texto: p.texto }))
    ];
    return buscarAyuda(consulta, items);
  }, [consulta, tareas, pasos]);

  const lista = modoTarea ? pasosTodos : pasos;
  const idx = pasoId ? lista.findIndex((p) => p.id === pasoId) : -1;
  const pasoActual = idx >= 0 ? lista[idx] : null;
  const total = pasos.length;
  const posTarea = modoTarea ? secuencia.indexOf(pasoId) : -1; // posición dentro de la tarea ("1 de 3")

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

  // Esc cierra el menú de ayuda o el recorrido guiado (accesibilidad por teclado).
  useEffect(() => {
    if (!menuAbierto && !activo) return undefined;
    const alTeclear = (e) => {
      if (e.key !== 'Escape') return;
      if (activo) cerrar();
      else setMenuAbierto(false);
    };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  });

  // Al cerrar el menú se limpia lo que se había escrito.
  useEffect(() => { if (!menuAbierto) { setConsulta(''); setAviso({ estado: '', texto: '' }); } }, [menuAbierto]);

  if (!usuario) return null;

  async function avisarFalta() {
    setAviso({ estado: 'enviando', texto: '' });
    try {
      const res = await fetch('/api/ayuda', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: consulta, solicitanteEmail: usuario.email }) });
      const d = await res.json();
      setAviso(res.ok && d.ok ? { estado: 'ok', texto: '' } : { estado: 'error', texto: d.error || 'No se pudo avisar. Probá de nuevo.' });
    } catch { setAviso({ estado: 'error', texto: 'No se pudo conectar. Probá de nuevo.' }); }
  }

  function iniciarCompleto() { setMenuAbierto(false); setModoTarea(false); setActivo(true); setPasoId(pasos[0].id); }
  function iniciarSecuencia(ids) {
    const seq = ids.filter((id) => pasosTodos.some((p) => p.id === id));
    if (seq.length === 0) return;
    setMenuAbierto(false); setModoTarea(true); setSecuencia(seq); setActivo(true); setPasoId(seq[0]);
  }
  function iniciarTarea(t) { iniciarSecuencia(t.secuencia || [t.pasoInicial]); }
  function siguiente() {
    if (modoTarea) { const next = secuencia[secuencia.indexOf(pasoId) + 1]; if (next) setPasoId(next); else cerrar(); return; }
    const next = pasos[idx + 1]; if (!next) { cerrar(); return; } setPasoId(next.id);
  }
  function anterior() {
    if (modoTarea) { const prev = secuencia[secuencia.indexOf(pasoId) - 1]; if (prev) setPasoId(prev); return; }
    const prev = pasos[idx - 1]; if (prev) setPasoId(prev.id);
  }
  function cerrar() { setActivo(false); setPasoId(null); setRect(null); }

  return (
    <>
      <button
        onClick={() => setMenuAbierto((v) => !v)}
        aria-label="Necesito ayuda"
        aria-expanded={menuAbierto}
        className="fixed bottom-14 right-4 z-[90] h-12 w-12 sm:w-auto sm:px-4 justify-center bg-surface text-text border border-border text-sm font-semibold rounded-full shadow-lg flex items-center gap-2 hover:bg-surface2 transition-colors no-print"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accentMagenta shrink-0" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
        </svg>
        <span className="hidden sm:inline">Necesito ayuda</span>
      </button>

      {menuAbierto && !activo && (
        <div className="fixed inset-0 z-[91] flex items-end justify-end p-5" onClick={() => setMenuAbierto(false)}>
          <div className="bg-surface2 border border-border rounded-2xl p-4 w-80 max-w-[calc(100vw-40px)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-1">Te mostramos cómo funciona ILCE Gestión</h3>
            <p className="text-xs text-textSec mb-3">Escribí lo que querés hacer, o recorré las secciones principales.</p>
            <input type="search" value={consulta} onChange={(e) => { setConsulta(e.target.value); setAviso({ estado: '', texto: '' }); }}
              placeholder="Ej: eliminar un lead" aria-label="Buscar en la ayuda" autoComplete="off"
              className="w-full mb-3 bg-bg border border-border rounded-lg px-3 py-2 text-sm placeholder:text-textMuted focus:outline-none focus:border-accentTeal" />
            {resultados && (
              <div className="mb-1" aria-live="polite">
                {resultados.length > 0 ? (
                  <>
                    <p className="text-[12px] text-textMuted mb-1.5 font-semibold">Encontramos esto:</p>
                    <div className="flex flex-col gap-1">
                      {resultados.map((r) => (
                        <button key={r.tipo + r.id} className="boton boton-chico text-left text-textSec hover:text-text bg-bg border border-border"
                          onClick={() => (r.tipo === 'tarea' ? iniciarTarea(r.tarea) : iniciarSecuencia([r.id]))}>
                          {r.titulo}{r.tipo === 'paso' && <span className="text-textMuted"> · sección</span>}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-textSec mb-2">No encontramos nada sobre “{consulta.trim()}”. Probá con otras palabras (por ejemplo “eliminar”, “baja”, “cargar”).</p>
                )}
                <div className="mt-2">
                  {aviso.estado === 'ok'
                    ? <p className="text-xs text-successText">Listo, lo anotamos para sumarlo a la ayuda. Gracias.</p>
                    : <button className="text-xs text-accentTeal underline disabled:opacity-60" onClick={avisarFalta} disabled={aviso.estado === 'enviando'}>
                        {aviso.estado === 'enviando' ? 'Avisando…' : (resultados.length > 0 ? '¿No es lo que buscabas? Avisar que falta' : 'Avisar que falta esto')}
                      </button>}
                  {aviso.estado === 'error' && <p className="text-xs text-dangerText mt-1">{aviso.texto}</p>}
                </div>
              </div>
            )}
            {!resultados && <>
            <button className="boton boton-solido w-full bg-gradient-to-r from-accentPurple to-accentMagenta text-white mb-3" onClick={iniciarCompleto}>
              Comenzar recorrido
            </button>
            {tareas.length > 0 && (
            <>
            <p className="text-[12px] text-textMuted mb-1.5 font-semibold">O elegí una tarea puntual:</p>
            <div className="flex flex-col gap-1">
              {tareas.map((t) => (
                <button key={t.id} className="boton boton-chico text-left text-textSec hover:text-text bg-bg border border-border" onClick={() => iniciarTarea(t)}>
                  {t.label}
                </button>
              ))}
            </div>
            </>
            )}
            </>}
            <button
              className="mt-3 w-full flex items-center justify-between text-left text-[13px] text-textSec hover:text-text border-t border-border pt-3"
              onClick={() => {
                setMenuAbierto(false);
                window.dispatchEvent(new Event('ilce:novedades'));
              }}
            >
              <span>Novedades de la app</span>
              <span className="text-textMuted">v{APP_VERSION}</span>
            </button>
          </div>
        </div>
      )}

      {activo && pasoActual && (
        <TourOverlay paso={pasoActual} idx={idx} total={total} posTarea={posTarea} largoTarea={secuencia.length} rect={rect} buscando={buscando} modoTarea={modoTarea}
          onSiguiente={siguiente} onAnterior={anterior} onSalir={cerrar} />
      )}
    </>
  );
}

function TourOverlay({ paso, idx, total, posTarea, largoTarea, rect, buscando, modoTarea, onSiguiente, onAnterior, onSalir }) {
  // En una tarea de varios pasos: "1 de 4" y "Listo" recién en el último. En una de un solo paso: sin contador.
  const esFinal = modoTarea ? posTarea >= largoTarea - 1 : idx === total - 1;
  const hayAtras = modoTarea ? posTarea > 0 : idx > 0;
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
        {modoTarea
          ? (largoTarea > 1 && <p className="text-[12px] text-textMuted mb-1.5 font-semibold">{posTarea + 1} de {largoTarea}</p>)
          : (!esFinal && <p className="text-[12px] text-textMuted mb-1.5 font-semibold">{idx + 1} de {total}</p>)}
        <h3 className="text-sm font-semibold mb-1.5">{paso.titulo}</h3>
        {buscando ? (
          <p className="text-xs text-textSec mb-3">Cargando…</p>
        ) : (
          <p className="text-xs text-textSec mb-3">{paso.texto}</p>
        )}
        <div className="flex items-center justify-between gap-2 mt-1">
          <button className="text-xs text-textMuted" onClick={onSalir}>Salir</button>
          <div className="flex gap-1.5">
            {hayAtras && (
              <button className="boton boton-chico bg-transparent text-textSec border border-border" onClick={onAnterior}> Atrás</button>
            )}
            <button className="boton boton-chico boton-solido bg-gradient-to-r from-accentPurple to-accentMagenta text-white" onClick={onSiguiente}>
              {esFinal ? 'Listo' : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
