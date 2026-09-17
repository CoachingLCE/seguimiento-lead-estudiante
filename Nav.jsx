'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import ThemeSelector from './ThemeSelector';
import Logo from './Logo';
import { tienePermisoOperativo } from '../lib/permisos';
import { nombreVisibleRoles } from '../lib/constants';

// Se mantiene por compatibilidad con imports viejos (`import { puedeVerOperativo } from '.../Nav'`)
// — Dashboard y Seguimiento la usan como su chequeo real de acceso (ya no para ocultar del menú,
// que ahora se muestra completo a cualquier usuario logueado).
export const puedeVerOperativo = tienePermisoOperativo;

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
function Chip({ href, label, pathname, onClick, destacado }) {
  const activo = pathname === href;
  return (
    <Link href={href} onClick={onClick}
      className={`h-8 flex items-center px-3 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${
        activo ? 'bg-accentPurple/15 text-accentPurple' : destacado ? 'text-text font-semibold hover:bg-surface2' : 'text-textSec hover:text-text hover:bg-surface2'
      }`}>
      {label}
    </Link>
  );
}

// Un grupo (Gestión / Reportes / Configuración): etiqueta chica + todos sus ítems ya abiertos,
// nunca hay que clickear nada para verlos.
function Grupo({ grupo, pathname, onClick }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-textMuted text-[11px] uppercase tracking-wide font-semibold mr-0.5">{grupo.label}</span>
      {grupo.principal && <Chip href={grupo.principal} label="Ver todo" pathname={pathname} onClick={onClick} destacado />}
      {grupo.items.map((it) => <Chip key={it.href} href={it.href} label={it.label} pathname={pathname} onClick={onClick} />)}
    </div>
  );
}

function Divisor() {
  return <span className="hidden lg:block w-px h-5 bg-border shrink-0" />;
}

export default function Nav({ usuario, onLogout }) {
  const pathname = usePathname();
  const [menuMovil, setMenuMovil] = useState(false);

  return (
    <div className="border-b border-border no-print">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* LOGO */}
          <Link href="/dashboard" className="shrink-0">
            <Logo height={36} />
          </Link>

          {/* ACCIONES — buscador, herramientas y tema: SIEMPRE visibles (aunque la ventana sea
              angosta, ej. usada al lado de WhatsApp Web) — antes se ocultaban del todo por debajo
              de "lg" y solo quedaban accesibles abriendo el menú hamburguesa. */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Link href="/buscador" title="Buscador"
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-base transition-colors ${
                pathname === '/buscador' ? 'bg-accentPurple text-white' : 'bg-surface2 border border-border text-textSec hover:text-text hover:border-accentTeal'
              }`}>
              🔍
            </Link>
            <Link href="/herramientas" title="Herramientas"
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-base transition-colors ${
                pathname === '/herramientas' ? 'bg-accentPurple text-white' : 'bg-surface2 border border-border text-textSec hover:text-text hover:border-accentTeal'
              }`}>
              ⚡
            </Link>
            <ThemeSelector />
            {usuario && (
              <div className="hidden md:block text-right text-sm pl-2 border-l border-border">
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

        {/* NAV — desktop: todo a la vista, sin clics para desplegar nada */}
        <nav className="hidden lg:flex items-center gap-2.5 flex-wrap pb-3">
          <Link href="/nuevo-lead"
            className={`h-8 flex items-center px-3.5 rounded-lg text-[13px] font-semibold whitespace-nowrap shadow-sm transition-all ${
              pathname === '/nuevo-lead'
                ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white shadow-accentPurple/30'
                : 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white opacity-90 hover:opacity-100'
            }`}>
            + Nuevo lead
          </Link>
          {NAV_PRINCIPAL.map((item) => <Chip key={item.href} href={item.href} label={item.label} pathname={pathname} destacado />)}
          <Divisor />
          <Grupo grupo={GESTION} pathname={pathname} />
          <Divisor />
          <Grupo grupo={REPORTES} pathname={pathname} />
          <Divisor />
          <Grupo grupo={CONFIGURACION} pathname={pathname} />
        </nav>
      </div>

      {/* MENÚ MOBILE — todo apilado */}
      {menuMovil && (
        <div className="lg:hidden border-t border-border px-4 pb-4 pt-3 space-y-4 max-h-[75vh] overflow-y-auto">
          <Link href="/nuevo-lead" onClick={() => setMenuMovil(false)}
            className="flex items-center justify-center h-10 rounded-lg text-sm font-semibold bg-gradient-to-r from-accentPurple to-accentMagenta text-white">
            + Nuevo lead
          </Link>

          <div className="flex flex-wrap gap-1.5">
            {NAV_PRINCIPAL.map((item) => <Chip key={item.href} href={item.href} label={item.label} pathname={pathname} onClick={() => setMenuMovil(false)} destacado />)}
          </div>

          {[GESTION, REPORTES, CONFIGURACION].map((grupo) => (
            <div key={grupo.label}>
              <p className="text-textMuted text-[11px] uppercase tracking-wide font-semibold mb-1.5">{grupo.label}</p>
              <div className="flex flex-col gap-0.5">
                {grupo.principal && (
                  <Link href={grupo.principal} onClick={() => setMenuMovil(false)}
                    className={`px-3 py-2 rounded-lg text-sm ${pathname === grupo.principal ? 'bg-accentPurple/15 text-accentPurple font-semibold' : 'text-textSec hover:bg-surface2'}`}>
                    Ver todo
                  </Link>
                )}
                {grupo.items.map((it) => (
                  <Link key={it.href} href={it.href} onClick={() => setMenuMovil(false)}
                    className={`px-3 py-2 rounded-lg text-sm ${pathname === it.href ? 'bg-accentPurple/15 text-accentPurple font-semibold' : 'text-textSec hover:bg-surface2'}`}>
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
                <p className="text-textSec text-[11px] leading-tight">{nombreVisibleRoles(usuario.roles)}</p>
                <button onClick={onLogout} className="text-[11px] text-textMuted underline">Salir</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
