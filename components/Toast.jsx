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
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 bg-surface2 border border-accentTeal rounded-full px-4 py-2 text-xs text-text shadow-lg transition-all duration-200 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-successText shrink-0" />
      {mensaje}
    </div>
  );

  return { toast, mostrarToast };
}
