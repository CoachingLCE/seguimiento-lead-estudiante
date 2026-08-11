'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { APP_VERSION, APP_UPDATED_AT } from '../lib/version';
import { CHANGELOG } from '../lib/changelog';

export default function VersionBadge() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const fecha = new Date(APP_UPDATED_AT + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  // Pantalla pública para estudiantes — no tiene sentido mostrar acá cosas del equipo interno.
  if (pathname === '/confirmar-recepcion') return null;

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="fixed bottom-3 right-4 text-[11px] text-textMuted bg-surface2/80 border border-border rounded-full px-3 py-1 z-40 no-print hover:text-text hover:border-accentTeal transition-colors"
        title="Ver novedades"
      >
        v{APP_VERSION} · Actualizado {fecha}
      </button>

      {abierto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setAbierto(false)}>
          <div className="bg-surface2 border border-border rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-bold">📋 Novedades de la app</p>
              <button onClick={() => setAbierto(false)} className="text-textMuted hover:text-text">✕</button>
            </div>
            <div className="space-y-5">
              {CHANGELOG.map((entrada) => (
                <div key={entrada.version}>
                  <p className="text-sm font-semibold text-accentTeal mb-1.5">
                    v{entrada.version} · {new Date(entrada.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                  <ul className="space-y-1">
                    {entrada.cambios.map((c, i) => (
                      <li key={i} className="text-textSec text-xs flex gap-2">
                        <span className="text-accentPurple">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
