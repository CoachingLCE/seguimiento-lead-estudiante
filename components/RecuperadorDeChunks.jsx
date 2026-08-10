'use client';
import { useEffect } from 'react';

const CLAVE_RECARGA = 'ilce-recarga-por-chunk';

function pareceErrorDeChunkViejo(mensaje) {
  const m = (mensaje || '').toLowerCase();
  return m.includes('chunkloaderror') || m.includes('loading chunk') ||
    m.includes('failed to fetch dynamically imported module') || m.includes('importing a module script failed');
}

// Si alguien tiene la app abierta y en el medio se sube una actualización nueva, el navegador
// puede intentar pedir un archivo de código que ya no existe en el servidor (porque cambió de nombre
// con el deploy nuevo) — eso deja la pantalla en blanco. Esto lo detecta y recarga la página una sola
// vez automáticamente, para que la persona nunca vea la pantalla blanca sin explicación.
export default function RecuperadorDeChunks() {
  useEffect(() => {
    function intentarRecargar(mensaje) {
      if (!pareceErrorDeChunkViejo(mensaje)) return;
      // Guard para no quedar en un loop infinito si el error persiste por otra razón.
      if (sessionStorage.getItem(CLAVE_RECARGA)) return;
      sessionStorage.setItem(CLAVE_RECARGA, '1');
      window.location.reload();
    }

    function onError(e) {
      intentarRecargar(e?.message || e?.error?.message);
    }
    function onRejection(e) {
      intentarRecargar(e?.reason?.message || String(e?.reason || ''));
    }

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    // Si la página cargó bien, se libera el guard para la próxima vez que haga falta.
    const t = setTimeout(() => sessionStorage.removeItem(CLAVE_RECARGA), 5000);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      clearTimeout(t);
    };
  }, []);

  return null;
}
