'use client';
import { useCallback, useRef, useState } from 'react';

// Hook simple: const { toast, mostrarToast } = useToast(); mostrarToast('Guardado');
export function useToast() {
  const [mensaje, setMensaje] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const mostrarToast = useCallback((texto) => {
    setMensaje(texto);
    setVisible(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2200);
  }, []);

  const toast = (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[310] w-[min(92vw,420px)] bg-surface text-text border border-border border-l-4 border-l-successText rounded-xl px-3.5 py-3 text-sm shadow-xl transition-all duration-200 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
      }`}
    >
      {mensaje}
    </div>
  );

  return { toast, mostrarToast };
}
