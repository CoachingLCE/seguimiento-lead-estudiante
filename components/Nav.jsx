'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import ThemeSelector from './ThemeSelector';
import { tienePermisoOperativo } from '../lib/permisos';
import { nombreVisibleRoles } from '../lib/constants';

// Se mantiene por compatibilidad con imports viejos (`import { puedeVerOperativo } from '.../Nav'`)
// — Dashboard y Seguimiento la usan como su chequeo real de acceso (ya no para ocultar del menú,
// que ahora se muestra completo a cualquier usuario logueado).
export const puedeVerOperativo = tienePermisoOperativo;

const NAV_PRINCIPAL = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/seguimiento', label: 'Seguimiento' },
  { href: '/buscador', label: 'Leads' }
];

const GESTION = [
  { href: '/inscritos', label: 'Estudiantes' },
  { href: '/resumen-estudiantes', label: 'Inscripciones' },
  { href: '/academico', label: 'Académico' },
  { href: '/diplomas', label: 'Diplomas' }
];

const REPORTES_MENU = [
  { href: '/resumen-diario', label: 'Resumen diario' },
  { href: '/informes-rrss', label: 'Informes RRSS' },
  { href: '/auditoria', label: 'Historial de acciones' },
  { href: '/bajas', label: 'Bajas' },
  { href: '/accesos', label: 'Accesos' }
];

const CONFIGURACION = [
  { href: '/productos-valores', label: 'Productos y Valores' },
  { href: '/mensajes', label: 'Mensajes frecuentes' },
  { href: '/emails', label: 'Emails' },
  { href: '/fichas-enviadas', label: 'Fichas enviadas' },
  { href: '/herramientas', label: 'Herramientas' }
];

function estaActivo(pathname, href, items) {
  if (pathname === href) return true;
  return items?.some((i) => i.href === pathname) || false;
}

// Botón de nav simple (Dashboard, Seguimiento, Leads).
function ItemSimple({ item, pathname, onClick }) {
  const activo = pathname === item.href;
  return (
    <Link href={item.href} onClick={onClick}
      className={`h-9 flex items-center px-3.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
        activo ? 'bg-accentPurple/15 text-accentPurple' : 'text-textSec hover:text-text hover:bg-surface2'
      }`}>
      {item.label}
    </Link>
  );
}

// Botón con submenú desplegable (Gestión, Reportes, Configuración) — clic para abrir/cerrar,
// clic afuera cierra, y elegir un ítem también cierra. La sección queda marcada como "activa" si
// la URL actual coincide con ella o con cualquiera de sus ítems.
function ItemConMenu({ label, principal, items, pathname, abierto, onToggle, onClose }) {
  const ref = useRef(null);
  const activo = estaActivo(pathname, principal, items);

  useEffect(() => {
    if (!abierto) return;
    function alClickearAfuera(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', alClickearAfuera);
    return () => document.removeEventListener('mousedown', alClickearAfuera);
  }, [abierto, onClose]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={onToggle}
        className={`h-9 flex items-center gap-1 px-3.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
          activo ? 'bg-accentPurple/15 text-accentPurple' : 'text-textSec hover:text-text hover:bg-surface2'
        }`}>
        {label}
        <span className={`text-[10px] transition-transform ${abierto ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {abierto && (
        <div className="absolute top-full left-0 mt-1.5 w-56 bg-surface2 border border-border rounded-xl shadow-lg py-1.5 z-50">
          {principal && (
            <Link href={principal} onClick={onClose}
              className={`block px-4 py-2 text-sm border-b border-border mb-1 ${
                pathname === principal ? 'text-accentPurple font-semibold' : 'text-text font-semibold hover:bg-bg'
              }`}>
              Ver {label.toLowerCase()}
            </Link>
          )}
          {items.map((it) => (
            <Link key={it.href} href={it.href} onClick={onClose}
              className={`block px-4 py-2 text-sm transition-colors ${
                pathname === it.href ? 'text-accentPurple font-semibold bg-accentPurple/10' : 'text-textSec hover:text-text hover:bg-bg'
              }`}>
              {it.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Nav({ usuario, onLogout }) {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(null); // 'gestion' | 'reportes' | 'config' | null
  const [menuMovil, setMenuMovil] = useState(false);

  function toggleMenu(nombre) {
    setMenuAbierto((actual) => (actual === nombre ? null : nombre));
  }
  function cerrarMenu() {
    setMenuAbierto(null);
  }

  return (
    <div className="border-b border-border no-print">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* LOGO */}
          <Link href="/dashboard" className="shrink-0">
            <p className="text-accentTeal uppercase text-[10px] tracking-widest font-semibold leading-none mb-0.5">
              Instituto ILCE
            </p>
            <h1 className="text-lg font-bold leading-none">ILCE Gestión</h1>
          </Link>

          {/* NAV PRINCIPAL — desktop */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {NAV_PRINCIPAL.map((item) => <ItemSimple key={item.href} item={item} pathname={pathname} />)}
            <ItemConMenu label="Gestión" principal={null} items={GESTION} pathname={pathname}
              abierto={menuAbierto === 'gestion'} onToggle={() => toggleMenu('gestion')} onClose={cerrarMenu} />
            <ItemConMenu label="Reportes" principal="/reportes" items={REPORTES_MENU} pathname={pathname}
              abierto={menuAbierto === 'reportes'} onToggle={() => toggleMenu('reportes')} onClose={cerrarMenu} />
            <ItemConMenu label="Configuración" principal={null} items={CONFIGURACION} pathname={pathname}
              abierto={menuAbierto === 'config'} onToggle={() => toggleMenu('config')} onClose={cerrarMenu} />
          </nav>

          {/* ACCIONES + USUARIO — desktop */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <ThemeSelector />
            <Link href="/nuevo-lead"
              className={`h-9 flex items-center px-4 rounded-lg text-sm font-semibold whitespace-nowrap shadow-sm transition-all ${
                pathname === '/nuevo-lead'
                  ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white shadow-accentPurple/30'
                  : 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white opacity-90 hover:opacity-100'
              }`}>
              + Nuevo lead
            </Link>
            {usuario && (
              <div className="text-right text-sm pl-2 border-l border-border">
                <p className="font-semibold leading-tight">{usuario.nombre}</p>
                <p className="text-textSec text-[11px] leading-tight">{nombreVisibleRoles(usuario.roles)}</p>
                <button onClick={onLogout} className="text-[11px] text-textMuted underline">Salir</button>
              </div>
            )}
          </div>

          {/* BOTÓN HAMBURGUESA — mobile/tablet */}
          <button onClick={() => setMenuMovil((v) => !v)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-surface2 border border-border text-lg shrink-0">
            {menuMovil ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* MENÚ MOBILE — todo apilado, sin submenús colapsables (ya está todo a un clic) */}
      {menuMovil && (
        <div className="lg:hidden border-t border-border px-4 pb-4 pt-3 space-y-4 max-h-[75vh] overflow-y-auto">
          <Link href="/nuevo-lead" onClick={() => setMenuMovil(false)}
            className="flex items-center justify-center h-10 rounded-lg text-sm font-semibold bg-gradient-to-r from-accentPurple to-accentMagenta text-white">
            + Nuevo lead
          </Link>

          <div className="flex flex-wrap gap-1.5">
            {NAV_PRINCIPAL.map((item) => <ItemSimple key={item.href} item={item} pathname={pathname} onClick={() => setMenuMovil(false)} />)}
          </div>

          {[['Gestión', GESTION, null], ['Reportes', REPORTES_MENU, '/reportes'], ['Configuración', CONFIGURACION, null]].map(([titulo, items, principal]) => (
            <div key={titulo}>
              <p className="text-textMuted text-[11px] uppercase tracking-wide font-semibold mb-1.5">{titulo}</p>
              <div className="flex flex-col gap-0.5">
                {principal && (
                  <Link href={principal} onClick={() => setMenuMovil(false)}
                    className={`px-3 py-2 rounded-lg text-sm ${pathname === principal ? 'bg-accentPurple/15 text-accentPurple font-semibold' : 'text-textSec hover:bg-surface2'}`}>
                    Ver {titulo.toLowerCase()}
                  </Link>
                )}
                {items.map((it) => (
                  <Link key={it.href} href={it.href} onClick={() => setMenuMovil(false)}
                    className={`px-3 py-2 rounded-lg text-sm ${pathname === it.href ? 'bg-accentPurple/15 text-accentPurple font-semibold' : 'text-textSec hover:bg-surface2'}`}>
                    {it.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <ThemeSelector />
            {usuario && (
              <div className="text-right text-sm">
                <p className="font-semibold leading-tight">{usuario.nombre}</p>
                <p className="text-textSec text-[11px] leading-tight">{nombreVisibleRoles(usuario.roles)}</p>
                <button onClick={onLogout} className="text-[11px] text-textMuted underline">Salir</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
