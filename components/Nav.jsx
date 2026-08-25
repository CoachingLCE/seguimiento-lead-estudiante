'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeSelector from './ThemeSelector';
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
  tienePermisoBuscador,
  tienePermisoMensajesVer,
  tienePermisoBajas,
  tienePermisoAcademico
} from '../lib/permisos';
import { nombreVisibleRoles } from '../lib/constants';

// Reexport para no romper imports existentes en otras páginas (`import { puedeVerOperativo } from '.../Nav'`)
export const puedeVerOperativo = tienePermisoOperativo;

function itemNav(href, label, pathname) {
  return (
    <Link
      key={href}
      href={href}
      className={`h-9 flex items-center px-4 rounded-lg text-sm font-medium border whitespace-nowrap transition-colors ${
        pathname === href
          ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent'
          : 'bg-surface2 border-border text-textSec hover:text-text hover:border-accentTeal'
      }`}
    >
      {label}
    </Link>
  );
}

// Nuevo lead es la acción principal de la app: siempre violeta, no solo cuando está activa.
function itemNavPrimario(href, label, pathname) {
  return (
    <Link
      key={href}
      href={href}
      className={`h-9 flex items-center px-4 rounded-lg text-sm font-semibold whitespace-nowrap transition-all shadow-sm ${
        pathname === href
          ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white shadow-accentPurple/30'
          : 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white opacity-90 hover:opacity-100 hover:shadow-accentPurple/20'
      }`}
    >
      {label}
    </Link>
  );
}

// Un separador vertical sutil entre categorías — solo se muestra si hay algo de cada lado.
function Divisor() {
  return <span className="w-px h-6 bg-border shrink-0" />;
}

export default function Nav({ usuario, onLogout }) {
  const pathname = usePathname();

  const operativo = [
    tienePermisoOperativo(usuario) && itemNav('/dashboard', 'Dashboard', pathname),
    tienePermisoOperativo(usuario) && itemNav('/seguimiento', 'Seguimiento', pathname),
    tienePermisoCrearLeads(usuario) && itemNavPrimario('/nuevo-lead', 'Nuevo lead', pathname)
  ].filter(Boolean);

  const analisis = [
    tienePermisoReportes(usuario) && itemNav('/reportes', 'Reportes', pathname),
    tienePermisoEstudiantes(usuario) && itemNav('/inscritos', 'Estudiantes', pathname),
    tienePermisoResumenEstudiantes(usuario) && itemNav('/resumen-estudiantes', 'Resumen Estudiantes', pathname),
    tienePermisoResumenDiario(usuario) && itemNav('/resumen-diario', 'Resumen diario', pathname),
    tienePermisoDiplomas(usuario) && itemNav('/diplomas', 'Diplomas', pathname),
    tienePermisoAcademico(usuario) && itemNav('/academico', '🎓 Académico', pathname)
  ].filter(Boolean);

  const administracion = [
    tienePermisoAuditoria(usuario) && itemNav('/auditoria', 'Historial de acciones', pathname),
    tienePermisoBajas(usuario) && itemNav('/bajas', '🔴 Bajas', pathname),
    tienePermisoAccesos(usuario) && itemNav('/accesos', 'Accesos', pathname)
  ].filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto px-6 pt-6 no-print">
      <div className="flex items-center justify-between mb-4 gap-4">
        <div>
          <p className="text-accentTeal uppercase text-xs tracking-widest font-semibold mb-1">
            Instituto ILCE
          </p>
          <h1 className="text-2xl font-bold">Seguimiento de LEAD-Estudiante</h1>
        </div>

        <div className="flex items-center gap-2">
          <ThemeSelector />
          {tienePermisoBuscador(usuario) && (
            <Link href="/buscador" title="Buscador"
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-base transition-colors ${
                pathname === '/buscador'
                  ? 'bg-accentPurple text-white'
                  : 'bg-surface2 border border-border text-textSec hover:text-text hover:border-accentTeal'
              }`}>
              🔍
            </Link>
          )}
          {tienePermisoMensajesVer(usuario) && (
            <Link href="/mensajes" title="Mensajes frecuentes"
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-base transition-colors ${
                pathname === '/mensajes'
                  ? 'bg-accentPurple text-white'
                  : 'bg-surface2 border border-border text-textSec hover:text-text hover:border-accentTeal'
              }`}>
              💬
            </Link>
          )}
          <Link href="/herramientas" title="Herramientas"
            className={`w-9 h-9 flex items-center justify-center rounded-lg text-base transition-colors ${
              pathname === '/herramientas'
                ? 'bg-accentPurple text-white'
                : 'bg-surface2 border border-border text-textSec hover:text-text hover:border-accentTeal'
            }`}>
            ⚡
          </Link>
          {usuario && (
            <div className="text-right text-sm ml-2">
              <p className="font-semibold">{usuario.nombre}</p>
              <p className="text-textSec text-xs">{nombreVisibleRoles(usuario.roles)}</p>
              <button onClick={onLogout} className="text-xs text-textMuted underline mt-1">
                Salir
              </button>
            </div>
          )}
        </div>
      </div>

      <nav className="mb-4 flex items-center gap-3 flex-wrap">
        {operativo.length > 0 && <div className="flex items-center gap-2 flex-wrap">{operativo}</div>}
        {operativo.length > 0 && analisis.length > 0 && <Divisor />}
        {analisis.length > 0 && <div className="flex items-center gap-2 flex-wrap">{analisis}</div>}
        {(operativo.length > 0 || analisis.length > 0) && administracion.length > 0 && <Divisor />}
        {administracion.length > 0 && <div className="flex items-center gap-2 flex-wrap">{administracion}</div>}
      </nav>
    </div>
  );
}
