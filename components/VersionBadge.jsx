'use client';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { APP_VERSION, APP_UPDATED_AT } from '../lib/version';
import { CHANGELOG } from '../lib/changelog';

const CLAVE_ULTIMA_VISTA = 'ilce-seg-ultima-version-vista';

export default function VersionBadge() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [hayNovedades, setHayNovedades] = useState(false);
  const [verAnteriores, setVerAnteriores] = useState(false);
  const fecha = new Date(APP_UPDATED_AT + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  // El botón "parpadea" (ver .version-badge-novedad en globals.css) mientras la versión que la
  // persona vio por última vez sea distinta de la actual — arranca "apagado" e ilumina en loop
  // hasta que hace clic, ahí se guarda la versión actual como vista y se apaga.
  useEffect(() => {
    try {
      const vista = localStorage.getItem(CLAVE_ULTIMA_VISTA);
      if (vista !== APP_VERSION) setHayNovedades(true);
    } catch { /* localStorage no disponible: el botón simplemente no parpadea */ }
  }, []);

  // Efecto de lectura (pedido de Diego; igual en TODAS las apps de ILCE): el panel de Novedades arranca "apagado" y se va
  // "prendiendo" renglón por renglón a medida que se lee. Es por renglón y atado al scroll: cada ítem empieza atenuado y se
  // ilumina cuando entra a la franja de lectura de arriba del cuadro; una vez iluminado se queda así. Sin IntersectionObserver
  // (navegadores muy viejos) se muestran todos encendidos: nunca queda texto apagado. Estilos: .nov-line en globals.css.
  const scrollRef = useRef(null);
  useEffect(() => {
    const root = scrollRef.current;
    if (!abierto || !root) return undefined;
    const lineas = root.querySelectorAll('.nov-line');
    if (typeof IntersectionObserver === 'undefined') { lineas.forEach((el) => el.classList.add('nov-lit')); return undefined; }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('nov-lit'); obs.unobserve(entry.target); }
      });
    }, { root, rootMargin: '0px 0px -40% 0px', threshold: 0.15 });
    lineas.forEach((el) => obs.observe(el));
    // Los renglones que quedan en la parte de abajo del cuadro nunca llegan a la franja de lectura de arriba: al llegar al
    // final de la lista (o si no hay scroll) se encienden todos los que faltan, para que el último renglón no quede apagado.
    const alFondo = () => {
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 8) root.querySelectorAll('.nov-line:not(.nov-lit)').forEach((el) => el.classList.add('nov-lit'));
    };
    root.addEventListener('scroll', alFondo, { passive: true });
    alFondo();
    return () => { obs.disconnect(); root.removeEventListener('scroll', alFondo); };
  }, [abierto, verAnteriores]);

  // "Novedades" también se abre desde el botón de Ayuda (en celular el badge flotante no se muestra).
  useEffect(() => {
    const abrirDesdeAyuda = () => abrir();
    window.addEventListener('ilce:novedades', abrirDesdeAyuda);
    return () => window.removeEventListener('ilce:novedades', abrirDesdeAyuda);
  });

  function abrir() {
    setAbierto(true);
    setHayNovedades(false);
    try { localStorage.setItem(CLAVE_ULTIMA_VISTA, APP_VERSION); } catch { /* */ }
  }

  // Pantalla pública para estudiantes — no tiene sentido mostrar acá cosas del equipo interno.
  if (pathname === '/confirmar-recepcion') return null;

  // Por defecto se muestran solo las novedades del mes en curso — el resto queda atrás de "Ver
  // novedades anteriores" para no abrir un cartel gigante con meses de historial.
  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const delMes = CHANGELOG.filter((e) => (e.fecha || '').slice(0, 7) === mesActual);
  // Si todavía no se cargó nada este mes (recién empezó uno), mostramos al menos la entrada
  // más reciente para que el cartel nunca aparezca vacío.
  const paraMostrar = verAnteriores ? CHANGELOG : (delMes.length ? delMes : CHANGELOG.slice(0, 1));
  const hayMasParaVer = !verAnteriores && paraMostrar.length < CHANGELOG.length;

  return (
    <>
      <button
        onClick={abrir}
        className={
          'hidden md:block fixed bottom-3 right-4 text-[12px] text-textMuted bg-surface2 border border-border rounded-full px-3 py-1 z-40 no-print hover:text-text hover:border-accentTeal transition-colors' +
          (hayNovedades ? ' version-badge-novedad' : '')
        }
        title="Ver novedades"
      >
        v{APP_VERSION} · Actualizado {fecha}
      </button>

      {abierto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setAbierto(false)}>
          <div ref={scrollRef} className="relative bg-surface2 border border-border rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-bold"> Novedades de la app</p>
              <button onClick={() => setAbierto(false)} className="text-textMuted hover:text-text"></button>
            </div>
            <div className="space-y-5">
              {paraMostrar.map((entrada) => (
                <div key={entrada.version}>
                  <p className="text-sm font-semibold text-accentTeal mb-1.5">
                    v{entrada.version} · {new Date(entrada.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                  <ul className="space-y-1">
                    {entrada.cambios.map((c, i) => (
                      <li key={i} className="nov-line text-textSec text-xs flex gap-2">
                        <span className="text-accentPurpleTxt">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {hayMasParaVer && (
              <button onClick={() => setVerAnteriores(true)} className="mt-4 text-xs text-accentTeal hover:underline">
                Ver novedades anteriores →
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
