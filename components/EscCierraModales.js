'use client';
import { useEffect } from 'react';

// Con la tecla Esc se cierra la ventana superpuesta que esté arriba de todo.
//
// En esta app hay muchas ventanas hechas a mano (detalle de una clase, cambiar contraseña,
// edición de filas...) y casi todas se cierran haciendo clic en el fondo oscuro. En vez de
// agregarle a cada una su propio manejo del teclado, Esc hace ese mismo clic sobre el fondo de la
// ventana de más arriba: si la ventana ya sabe cerrarse con el fondo, ahora también lo hace con
// Esc; si no sabe, no pasa nada.
//
// Por el mismo motivo (no tocar cada ventana), acá también se las declara como ventanas para los
// lectores de pantalla: role="dialog", aria-modal y un nombre tomado de su título. Las que ya
// traen role (los diálogos propios de Dialogos.js) no se tocan.
function declararVentanas() {
  document.querySelectorAll('div.fixed.inset-0 > div').forEach((panel) => {
    if (panel.hasAttribute('role') || panel.closest('[role="dialog"]')) return;
    // Solo paneles de contenido (ventanas), no el fondo decorativo ni los globos del recorrido.
    if (getComputedStyle(panel).position === 'fixed' || panel.getBoundingClientRect().width < 200) return;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    // Título: un encabezado, o si la ventana no tiene (ej. Novedades), el primer texto destacado.
    const titulo = panel.querySelector('h1, h2, h3') || panel.querySelector('[class*="font-semibold"], [class*="font-bold"], strong');
    if (titulo && titulo.textContent.trim()) panel.setAttribute('aria-label', titulo.textContent.replace(/[\uE000-\uF8FF]/g, '').trim().slice(0, 80));
  });
}

export default function EscCierraModales() {
  useEffect(() => {
    function alTeclear(e) {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const visibles = [...document.querySelectorAll('.fixed.inset-0')].filter(
        (el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed'
      );
      const arriba = visibles.filter((el) => el.getBoundingClientRect().width > 0).pop();
      if (arriba) arriba.click();
    }
    document.addEventListener('keydown', alTeclear);
    let timer = null;
    const programar = () => { clearTimeout(timer); timer = setTimeout(declararVentanas, 60); };
    const mo = new MutationObserver(programar);
    mo.observe(document.body, { childList: true, subtree: true });
    programar();
    return () => { document.removeEventListener('keydown', alTeclear); mo.disconnect(); clearTimeout(timer); };
  }, []);
  return null;
}
