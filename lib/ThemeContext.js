'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const CLAVE = 'ilce-tema';

// Automático: 07:00–19:00 claro, resto oscuro.
function temaPorHorario() {
  const hora = new Date().getHours();
  return hora >= 7 && hora < 19 ? 'light' : 'dark';
}

function resolver(preferencia) {
  if (preferencia === 'auto') return temaPorHorario();
  return preferencia === 'claro' ? 'light' : 'dark';
}

export function ThemeProvider({ children }) {
  const [preferencia, setPreferencia] = useState('auto');
  const [resuelto, setResuelto] = useState('dark');

  // Al montar: leer preferencia guardada y aplicarla.
  useEffect(() => {
    const guardada = localStorage.getItem(CLAVE) || 'auto';
    setPreferencia(guardada);
    const r = resolver(guardada);
    setResuelto(r);
    document.documentElement.setAttribute('data-theme', r);
  }, []);

  // En modo automático, revisa cada minuto si cruzó las 07:00 o las 19:00 y cambia solo, sin recargar.
  useEffect(() => {
    if (preferencia !== 'auto') return;
    const intervalo = setInterval(() => {
      const r = temaPorHorario();
      setResuelto((prev) => {
        if (prev !== r) document.documentElement.setAttribute('data-theme', r);
        return r;
      });
    }, 60 * 1000);
    return () => clearInterval(intervalo);
  }, [preferencia]);

  function cambiarPreferencia(nueva) {
    setPreferencia(nueva);
    localStorage.setItem(CLAVE, nueva);
    const r = resolver(nueva);
    setResuelto(r);
    document.documentElement.setAttribute('data-theme', r);
  }

  return (
    <ThemeContext.Provider value={{ preferencia, resuelto, cambiarPreferencia }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
