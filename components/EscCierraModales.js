'use client';
import { useEffect } from 'react';

// Con la tecla Esc se cierra la ventana superpuesta que esté arriba de todo.
//
// En esta app hay muchas ventanas hechas a mano (detalle de una clase, cambiar contraseña,
// edición de filas...) y casi todas se cierran haciendo clic en el fondo oscuro. En vez de
// agregarle a cada una su propio manejo del teclado, Esc hace ese mismo clic sobre el fondo de la
// ventana de más arriba: si la ventana ya sabe cerrarse con el fondo, ahora también lo hace con
// Esc; si no sabe, no pasa nada.
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
    return () => document.removeEventListener('keydown', alTeclear);
  }, []);
  return null;
}
