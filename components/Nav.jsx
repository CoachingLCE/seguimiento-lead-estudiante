'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import ThemeSelector from './ThemeSelector';
import Logo from './Logo';
import {
  tienePermisoOperativo, tienePermisoEstudiantes, tienePermisoResumenEstudiantes,
  tienePermisoAcademicoVer, tienePermisoDiplomas, tienePermisoComunidades,
  tienePermisoReportes, tienePermisoResumenDiario, tienePermisoInformesRRSS,
  tienePermisoAuditoria, tienePermisoBajas, tienePermisoAccesos,
  tienePermisoProductosVer, tienePermisoMensajesVer, tienePermisoEmails
} from '../lib/permisos';
import { nombreVisibleRoles } from '../lib/constants';
import { leerUsuarioReal, getVerComo, aplicarVerComo, quitarVerComo, EMAIL_VERCOMO } from '../lib/useSession';

// Se mantiene por compatibilidad con imports viejos (`import { puedeVerOperativo } from '.../Nav'`)
// — Dashboard y Seguimiento la usan como su chequeo real de acceso (ya no para ocultar del menú,
// que ahora se muestra completo a cualquier usuario logueado).
export const puedeVerOperativo = tienePermisoOperativo;

// Pedido de Diego (02/10/2026): las opciones del menú para las que el usuario NO tiene acceso se
// ven atenuadas (en vez de verse como un link normal más, que recién al hacer clic avisa "No
// tenés acceso") — así se nota de entrada qué puede usar y qué no.
const PERMISO_POR_RUTA = {
  '/dashboard': tienePermisoOperativo,
  '/seguimiento': tienePermisoOperativo,
  '/inscritos': tienePermisoEstudiantes,
  '/resumen-estudiantes': tienePermisoResumenEstudiantes,
  '/academico': tienePermisoAcademicoVer,
  '/diplomas': tienePermisoDiplomas,
  '/comunidades': tienePermisoComunidades,
  '/reportes': tienePermisoReportes,
  '/resumen-diario': tienePermisoResumenDiario,
  '/informes-rrss': tienePermisoInformesRRSS,
  '/auditoria': tienePermisoAuditoria,
  '/bajas': tienePermisoBajas,
  '/accesos': tienePermisoAccesos,
  '/productos-valores': tienePermisoProductosVer,
  '/mensajes': tienePermisoMensajesVer,
  '/emails': tienePermisoEmails,
  '/fichas-enviadas': tienePermisoOperativo
};
// Rutas sin restricción conocida en esta tabla (ej: /buscador, /herramientas) quedan siempre habilitadas.
function tieneAccesoARuta(href, usuario) {
  const check = PERMISO_POR_RUTA[href];
  return check ? !!check(usuario) : true;
}

const NAV_PRINCIPAL = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/seguimiento', label: 'Seguimiento' }
];

const GESTION = { label: 'Académico', principal: null, items: [
  { href: '/inscritos', label: 'Estudiantes' },
  { href: '/resumen-estudiantes', label: 'Inscripciones' },
  { href: '/academico', label: 'Académico' },
  { href: '/diplomas', label: 'Diplomas' },
  { href: '/comunidades', label: 'Comunidades' }
] };

const REPORTES = { label: 'Reportes', principal: '/reportes', items: [
  { href: '/resumen-diario', label: 'Resumen diario' },
  { href: '/informes-rrss', label: 'Informes RRSS' },
  { href: '/auditoria', label: 'Historial de acciones' },
  { href: '/bajas', label: 'Bajas' },
  { href: '/accesos', label: 'Accesos' }
] };

const CONFIGURACION = { label: 'Configuración', principal: null, items: [
  { href: '/productos-valores', label: 'Productos y Valores' },
  { href: '/mensajes', label: 'Mensajes frecuentes' },
  { href: '/emails', label: 'Emails' },
  { href: '/fichas-enviadas', label: 'Fichas enviadas' }
] };

// Chip individual — mismo look para todo (principal, ítems sueltos y de grupo).
function Chip({ href, label, pathname, onClick, destacado, deshabilitado }) {
  const activo = pathname === href;
  return (
    <Link href={href} onClick={onClick}
      title={deshabilitado ? 'No tenés acceso a esta sección' : undefined}
      className={`h-8 flex items-center px-3.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${
        deshabilitado ? 'text-textMuted opacity-50 hover:opacity-70'
        : activo ? 'bg-accentPurple/15 text-accentPurpleTxt' : destacado ? 'text-text font-semibold hover:bg-surface2' : 'text-textSec hover:text-text hover:bg-surface2'
      }`}>
      {label}
    </Link>
  );
}

// ---- Barra lateral (escritorio) ----------------------------------------------------------------
// Pedido de Diego (04/10/2026): navegación "más estética y prolija". Los 14 destinos pasan a una
// barra lateral fija con los grupos siempre abiertos (sin desplegables, como se había pedido), el
// botón "+ Nuevo lead" a mano, las secciones sin acceso atenuadas y el usuario abajo. En celular y
// tablet (< lg) sigue el menú desplegable de siempre.
const ICONOS = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
  seguimiento: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  estudiantes: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  inscripciones: <><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></>,
  academico: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  diplomas: <><circle cx="12" cy="8" r="6" /><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11" /></>,
  comunidades: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
  reportes: <path d="M12 20V10M18 20V4M6 20v-4" />,
  calendario: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  tendencia: <><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></>,
  reloj: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  bajas: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="m17 8 5 5M22 8l-5 5" /></>,
  llave: <><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" /><circle cx="7.5" cy="15.5" r="5.5" /></>,
  etiqueta: <><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><path d="M7 7h.01" /></>,
  mensaje: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>,
  enviar: <><path d="m22 2-7 20-4-9-9-4 20-7z" /><path d="M22 2 11 13" /></>,
  mas: <path d="M12 5v14M5 12h14" />,
  buscar: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  rayo: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
};
const ICONO_POR_RUTA = {
  '/dashboard': 'dashboard', '/seguimiento': 'seguimiento', '/inscritos': 'estudiantes', '/resumen-estudiantes': 'inscripciones',
  '/academico': 'academico', '/diplomas': 'diplomas', '/comunidades': 'comunidades', '/reportes': 'reportes', '/resumen-diario': 'calendario',
  '/informes-rrss': 'tendencia', '/auditoria': 'reloj', '/bajas': 'bajas', '/accesos': 'llave', '/productos-valores': 'etiqueta',
  '/mensajes': 'mensaje', '/emails': 'mail', '/fichas-enviadas': 'enviar'
};
function Icono({ nombre, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      {ICONOS[nombre]}
    </svg>
  );
}

function ItemLateral({ href, label, pathname, deshabilitado }) {
  const activo = pathname === href;
  return (
    <Link href={href} aria-current={activo ? 'page' : undefined}
      title={deshabilitado ? 'No tenés acceso a esta sección' : undefined}
      className={`relative flex items-center gap-2.5 h-8 px-3 rounded-lg text-[14px] transition-colors ${
        deshabilitado ? 'text-textMuted opacity-50 hover:opacity-70 font-medium'
        : activo ? 'bg-accentPurple/15 text-accentPurpleTxt font-semibold'
        : 'text-textSec hover:text-text hover:bg-surface2 font-medium'
      }`}>
      {activo && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-accentPurple" />}
      <Icono nombre={ICONO_POR_RUTA[href]} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function Nav({ usuario, onLogout }) {
  const pathname = usePathname();
  const [menuMovil, setMenuMovil] = useState(false);
  const [real, setReal] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [vc, setVc] = useState(null);
  // Deja lugar a la barra lateral en pantallas grandes (ver .con-menu-lateral en globals.css).
  useEffect(() => {
    document.body.classList.add('con-menu-lateral');
    return () => document.body.classList.remove('con-menu-lateral');
  }, []);
  useEffect(() => {
    const r = leerUsuarioReal(); setReal(r); setVc(getVerComo());
    if (r && r.email === EMAIL_VERCOMO) {
      fetch(`/api/usuarios?list=true&solicitanteEmail=${encodeURIComponent(r.email)}`).then((x) => x.json())
        .then((d) => { if (d.usuarios) setPersonas(d.usuarios
          .filter((u) => u.Activo && u.Email && u.Email !== EMAIL_VERCOMO)
          .map((u) => ({ email: u.Email, nombre: u.Nombre, roles: (u.Roles || '').split(',').map((x) => x.trim()).filter(Boolean) }))); }).catch(() => {});
    }
  }, []);
  const puedeVerComo = real && real.email === EMAIL_VERCOMO;
  function elegirVerComo(email) {
    if (!email) { quitarVerComo(); window.location.reload(); return; }
    const u = personas.find((x) => x.email === email);
    if (u) { aplicarVerComo(u); window.location.reload(); }
  }

  return (
    <>
    {/* BARRA LATERAL — solo escritorio (>= lg) */}
    <aside aria-label="Navegación principal" className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[248px] flex-col border-r border-border bg-surface no-print">
      <div className="px-5 pt-4 pb-2.5">
        <Link href="/dashboard" aria-label="Ir al Dashboard"><Logo height={30} /></Link>
        <p className="mt-1.5 text-[12px] font-semibold tracking-[0.14em] uppercase text-textMuted">Gestión</p>
      </div>
      <div className="px-4 pb-3">
        <Link href="/nuevo-lead"
          className={`flex items-center justify-center gap-2 h-10 rounded-lg text-[14px] font-semibold text-white bg-gradient-to-r from-accentPurple to-accentMagenta shadow-sm transition-opacity ${pathname === '/nuevo-lead' ? 'ring-2 ring-accentTeal ring-offset-2 ring-offset-surface' : 'hover:opacity-90'}`}>
          <Icono nombre="mas" size={16} /> Nuevo lead
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-4">
        <div className="space-y-0.5">
          {NAV_PRINCIPAL.map((item) => <ItemLateral key={item.href} href={item.href} label={item.label} pathname={pathname} deshabilitado={!tieneAccesoARuta(item.href, usuario)} />)}
        </div>
        {[GESTION, REPORTES, CONFIGURACION].map((grupo) => (
          <div key={grupo.label} className="space-y-0.5">
            <p className="px-3 mb-1 text-[12px] uppercase tracking-[0.12em] font-semibold text-textMuted">{grupo.label}</p>
            {grupo.principal && <ItemLateral href={grupo.principal} label="Ver todo" pathname={pathname} deshabilitado={!tieneAccesoARuta(grupo.principal, usuario)} />}
            {grupo.items.map((it) => <ItemLateral key={it.href} href={it.href} label={it.label} pathname={pathname} deshabilitado={!tieneAccesoARuta(it.href, usuario)} />)}
          </div>
        ))}
      </nav>
      {usuario && (
        <div className="border-t border-border px-4 py-3 flex items-center gap-3">
          <span aria-hidden="true" className="w-9 h-9 rounded-full bg-accentPurple/15 text-accentPurpleTxt font-bold flex items-center justify-center text-[14px] shrink-0">
            {(usuario.nombre || '?').trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-tight truncate">{usuario.nombre}</p>
            <p className="text-[12px] text-textSec leading-tight truncate">{nombreVisibleRoles(usuario.roles)}</p>
          </div>
          <button onClick={onLogout} className="text-[12px] text-textMuted hover:text-text underline shrink-0">Salir</button>
        </div>
      )}
    </aside>

    <div className="border-b border-border no-print">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        {/* Pedido de Diego (02/10/2026): "compactar y reubicar los controles superiores", "tiene
            que quedar todo junto arriba como antes" — el logo entra como el PRIMER elemento del
            mismo renglón que ya envuelve ("+ Nuevo lead", Dashboard, Seguimiento, etc.), en vez de
            vivir en un contenedor aparte — así queda realmente en la misma línea de arriba, no
            salta a su propia fila. Los controles de la derecha (buscador, herramientas, tema, ver
            como, usuario) se achicaron para alinearse con esa primera línea en vez de verse como
            una fila aparte. pb-6 mantiene el espacio contra el contenido de abajo que ya se había
            pedido (antes "pegado al nav"). */}
        <div className="flex items-start lg:items-center justify-between lg:justify-end gap-3 pt-2.5 pb-6 lg:pt-3 lg:pb-3">
          {/* LOGO — solo mobile/tablet (<lg): en desktop entra dentro del <nav> de abajo, como
              parte del mismo renglón que envuelve. */}
          <Link href="/dashboard" className="lg:hidden shrink-0">
            <Logo height={28} />
          </Link>

          {/* ACCIONES — buscador, herramientas y tema: SIEMPRE visibles (aunque la ventana sea
              angosta, ej. usada al lado de WhatsApp Web) — alineadas con la primera línea del
              menú, achicadas (h-8, como los chips) para que no se vean como una fila aparte. */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 pt-0.5">
            <Link href="/buscador" title="Buscador"
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
                pathname === '/buscador' ? 'bg-accentPurple text-white' : 'bg-surface2 border border-border text-textSec hover:text-text hover:border-accentTeal'
              }`}>
              <Icono nombre="buscar" size={16} />
            </Link>
            <Link href="/herramientas" title="Herramientas"
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
                pathname === '/herramientas' ? 'bg-accentPurple text-white' : 'bg-surface2 border border-border text-textSec hover:text-text hover:border-accentTeal'
              }`}>
              <Icono nombre="rayo" size={16} />
            </Link>
            <ThemeSelector />
            {puedeVerComo && (
              <select value={vc ? vc.email : ''} onChange={(e) => elegirVerComo(e.target.value)} title="Ver la app como otra persona (solo lectura)"
                className="hidden md:block bg-surface2 border border-border rounded-lg text-[12px] px-1.5 h-7 text-textSec hover:border-accentTeal max-w-[150px]">
                <option value="">Ver como…</option>
                {personas.map((p) => <option key={p.email} value={p.email}>{p.nombre}</option>)}
              </select>
            )}
            {usuario && (
              <div className="hidden md:block lg:hidden text-right text-xs leading-tight pl-2 border-l border-border">
                <p className="font-semibold leading-tight">{usuario.nombre}</p>
                <p className="text-textSec text-[12px] leading-tight">{nombreVisibleRoles(usuario.roles)}</p>
                <button onClick={onLogout} className="text-[12px] text-textMuted underline">Salir</button>
              </div>
            )}
          </div>

          {/* BOTÓN HAMBURGUESA — mobile/tablet */}
          <button onClick={() => setMenuMovil((v) => !v)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-surface2 border border-border text-base shrink-0">
            {menuMovil ? '' : ''}
          </button>
        </div>

        {puedeVerComo && vc && (
          <div className="no-print flex items-center gap-3 text-[12px] bg-accentPurple/15 border border-accentPurple/40 text-text rounded-lg px-3 py-1.5 mb-2">
            <span> Estás viendo la app <b>como {vc.nombre}</b> (solo lectura).</span>
            <button onClick={() => elegirVerComo('')} className="underline ml-auto whitespace-nowrap">Salir del modo vista</button>
          </div>
        )}
      </div>

      {/* MENÚ MOBILE — todo apilado */}
      {menuMovil && (
        <div className="lg:hidden border-t border-border px-4 pb-4 pt-3 space-y-4 max-h-[75vh] overflow-y-auto">
          <Link href="/nuevo-lead" onClick={() => setMenuMovil(false)}
            className="flex items-center justify-center h-10 rounded-lg text-sm font-semibold bg-gradient-to-r from-accentPurple to-accentMagenta text-white">
            + Nuevo lead
          </Link>

          <div className="flex flex-wrap gap-1.5">
            {NAV_PRINCIPAL.map((item) => <Chip key={item.href} href={item.href} label={item.label} pathname={pathname} onClick={() => setMenuMovil(false)} destacado deshabilitado={!tieneAccesoARuta(item.href, usuario)} />)}
          </div>

          {[GESTION, REPORTES, CONFIGURACION].map((grupo) => (
            <div key={grupo.label}>
              <p className="text-textMuted text-[12px] uppercase tracking-wide font-semibold mb-1.5">{grupo.label}</p>
              <div className="flex flex-col gap-0.5">
                {grupo.principal && (
                  <Link href={grupo.principal} onClick={() => setMenuMovil(false)}
                    title={!tieneAccesoARuta(grupo.principal, usuario) ? 'No tenés acceso a esta sección' : undefined}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      !tieneAccesoARuta(grupo.principal, usuario) ? 'text-textMuted opacity-50'
                      : pathname === grupo.principal ? 'bg-accentPurple/15 text-accentPurpleTxt font-semibold' : 'text-textSec hover:bg-surface2'
                    }`}>
                    Ver todo
                  </Link>
                )}
                {grupo.items.map((it) => (
                  <Link key={it.href} href={it.href} onClick={() => setMenuMovil(false)}
                    title={!tieneAccesoARuta(it.href, usuario) ? 'No tenés acceso a esta sección' : undefined}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      !tieneAccesoARuta(it.href, usuario) ? 'text-textMuted opacity-50'
                      : pathname === it.href ? 'bg-accentPurple/15 text-accentPurpleTxt font-semibold' : 'text-textSec hover:bg-surface2'
                    }`}>
                    {it.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* Buscador/Herramientas/Tema ya están siempre visibles arriba en el header — acá solo
              queda el usuario, para las pantallas angostas donde el header lo oculta (< md). */}
          {usuario && (
            <div className="flex items-center justify-end pt-3 border-t border-border md:hidden">
              <div className="text-right text-sm">
                <p className="font-semibold leading-tight">{usuario.nombre}</p>
                <p className="text-textSec text-[12px] leading-tight">{nombreVisibleRoles(usuario.roles)}</p>
                <button onClick={onLogout} className="text-[12px] text-textMuted underline">Salir</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
