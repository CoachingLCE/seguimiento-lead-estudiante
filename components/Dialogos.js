'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Reemplaza los confirm() y alert() nativos del navegador por un cuadro y avisos de la app:
// respetan el tema claro/oscuro, se cierran con Esc y no rompen el diseño.
//
//   const { confirmar, avisar } = useDialogos();
//   if (!(await confirmar({ titulo, mensaje, textoConfirmar, peligro: true }))) return;
//   avisar('Guardado');            // o avisar('Algo falló', 'error')

const Ctx = createContext(null);

// Si por algún motivo no hay proveedor, se vuelve al cuadro del navegador en vez de romper.
const RESPALDO = {
  confirmar: async (o) => window.confirm(typeof o === 'string' ? o : (o && o.mensaje) || ''),
  avisar: (m) => window.alert(m)
};

export function useDialogos() {
  return useContext(Ctx) || RESPALDO;
}

export function DialogosProvider({ children }) {
  const [dialogo, setDialogo] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const dialogoRef = useRef(null);
  const idRef = useRef(0);
  const cancelarRef = useRef(null);
  const confirmarRef = useRef(null);

  const cerrar = useCallback((valor) => {
    const d = dialogoRef.current;
    if (!d) return;
    dialogoRef.current = null;
    setDialogo(null);
    d.resolver(valor);
  }, []);

  const confirmar = useCallback((opciones) => new Promise((resolve) => {
    if (dialogoRef.current) dialogoRef.current.resolver(false); // si había uno abierto, se cancela
    const o = typeof opciones === 'string' ? { mensaje: opciones } : (opciones || {});
    const d = { ...o, resolver: resolve };
    dialogoRef.current = d;
    setDialogo(d);
  }), []);

  const avisar = useCallback((mensaje, tipo = 'ok') => {
    const id = ++idRef.current;
    setAvisos((a) => [...a.slice(-2), { id, mensaje, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 4500);
  }, []);

  // Esc cancela; el foco arranca en "Cancelar" (la opción segura) y Tab no se escapa del cuadro.
  useEffect(() => {
    if (!dialogo) return undefined;
    const previo = document.activeElement;
    setTimeout(() => cancelarRef.current && cancelarRef.current.focus(), 0);
    function teclas(e) {
      if (e.key === 'Escape') { e.preventDefault(); cerrar(false); return; }
      if (e.key === 'Tab') {
        const a = cancelarRef.current, b = confirmarRef.current;
        if (!a || !b) return;
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
        else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
      }
    }
    document.addEventListener('keydown', teclas);
    return () => { document.removeEventListener('keydown', teclas); if (previo && previo.focus) previo.focus(); };
  }, [dialogo, cerrar]);

  const valor = useMemo(() => ({ confirmar, avisar }), [confirmar, avisar]);
  const parrafos = dialogo ? String(dialogo.mensaje || '').split('\n\n').filter(Boolean) : [];

  return (
    <Ctx.Provider value={valor}>
      {children}

      {dialogo && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 no-print"
          onClick={(e) => { if (e.target === e.currentTarget) cerrar(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialogo-titulo"
            className="w-full max-w-md bg-surface text-text border border-border rounded-2xl shadow-2xl p-6"
          >
            <h2 id="dialogo-titulo" className="text-lg font-bold mb-2.5">{dialogo.titulo || 'Confirmar'}</h2>
            <div className="grid gap-2 mb-5">
              {parrafos.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-textSec whitespace-pre-line">{p}</p>
              ))}
            </div>
            <div className="flex justify-end gap-2.5 flex-wrap">
              <button
                ref={cancelarRef}
                type="button"
                onClick={() => cerrar(false)}
                className="h-10 px-5 rounded-full border border-border text-sm font-semibold hover:bg-surface2 transition-colors"
              >
                {dialogo.textoCancelar || 'Cancelar'}
              </button>
              <button
                ref={confirmarRef}
                type="button"
                onClick={() => cerrar(true)}
                className={`h-10 px-5 rounded-full text-sm font-bold transition-opacity hover:opacity-90 ${
                  dialogo.peligro ? 'bg-dangerText text-bg' : 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white'
                }`}
              >
                {dialogo.textoConfirmar || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div aria-live="polite" className="fixed top-4 left-1/2 -translate-x-1/2 z-[310] grid gap-2 w-[min(92vw,420px)] pointer-events-none no-print">
        {avisos.map((a) => (
          <div
            key={a.id}
            role="status"
            className={`pointer-events-auto bg-surface text-text border border-border border-l-4 rounded-xl px-3.5 py-3 text-sm shadow-xl ${
              a.tipo === 'error' ? 'border-l-dangerText' : 'border-l-successText'
            }`}
          >
            {a.mensaje}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
