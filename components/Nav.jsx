'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  tienePermisoOperativo,
  tienePermisoCrearLeads,
  tienePermisoReportes,
  tienePermisoEstudiantes,
  tienePermisoResumenEstudiantes,
  tienePermisoResumenDiario,
  tienePermisoAccesos,
  tienePermisoAuditoria,
  tienePermisoDiplomas,
  tienePermisoBuscador
} from '../lib/permisos';

// Reexport para no romper imports existentes en otras páginas (`import { puedeVerOperativo } from '.../Nav'`)
export const puedeVerOperativo = tienePermisoOperativo;

function itemNav(href, label, pathname) {
  return (
    <Link
      key={href}
      href={href}
      className={`h-9 flex items-center px-4 rounded-lg text-sm font-medium border whitespace-nowrap ${
        pathname === href
          ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent'
          : 'bg-surface2 border-border text-textSec hover:text-text hover:border-accentTeal'
      }`}
    >
      {label}
    </Link>
  );
}

export default function Nav({ usuario, onLogout }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');

  function buscar(e) {
    e.preventDefault();
    if (busqueda.trim()) router.push(`/buscador?q=${encodeURIComponent(busqueda.trim())}`);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pt-6 no-print">
      <div className="flex items-center justify-between mb-3 gap-4">
        <div>
          <p className="text-accentTeal uppercase text-xs tracking-widest font-semibold mb-1">
            Instituto ILCE
          </p>
          <h1 className="text-2xl font-bold">Seguimiento de LEAD-Estudiante</h1>
        </div>

        <div className="flex items-center gap-4">
          {usuario && (
            <div className="text-right text-sm">
              <p className="font-semibold">{usuario.nombre}</p>
              <p className="text-textSec text-xs">{usuario.roles.join(' + ')}</p>
              <button onClick={onLogout} className="text-xs text-textMuted underline mt-1">
                Salir
              </button>
            </div>
          )}
        </div>
      </div>

      <nav className="mb-3">
        <div className="flex gap-2 flex-wrap mb-[11px]">
          {tienePermisoOperativo(usuario) && itemNav('/dashboard', 'Dashboard', pathname)}
          {tienePermisoOperativo(usuario) && itemNav('/seguimiento', 'Seguimiento', pathname)}
          {tienePermisoReportes(usuario) && itemNav('/reportes', 'Reportes', pathname)}
          {tienePermisoEstudiantes(usuario) && itemNav('/inscritos', 'Estudiantes', pathname)}
          {tienePermisoResumenEstudiantes(usuario) && itemNav('/resumen-estudiantes', 'Resumen Estudiantes', pathname)}
          {tienePermisoResumenDiario(usuario) && itemNav('/resumen-diario', 'Resumen diario', pathname)}
          {tienePermisoDiplomas(usuario) && itemNav('/diplomas', 'Diplomas', pathname)}
          {tienePermisoAuditoria(usuario) && itemNav('/auditoria', 'Historial de acciones', pathname)}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {tienePermisoCrearLeads(usuario) && itemNav('/nuevo-lead', 'Nuevo lead', pathname)}
          {tienePermisoAccesos(usuario) && itemNav('/accesos', 'Accesos', pathname)}
          {tienePermisoBuscador(usuario) && (
            <form onSubmit={buscar} className="ml-auto">
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="🔍 Buscar alumno…"
                className="h-9 bg-surface2 border border-border rounded-lg px-3 text-sm w-48"
              />
            </form>
          )}
        </div>
      </nav>
    </div>
  );
}
