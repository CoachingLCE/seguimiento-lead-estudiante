'use client';
import { useEffect, useState } from 'react';

const KEY = 'ilce-leads-session';

export function useSession() {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? window.sessionStorage.getItem(KEY) : null;
    if (raw) setUsuario(JSON.parse(raw));
    setCargando(false);
  }, []);

  function login(usuarioData) {
    window.sessionStorage.setItem(KEY, JSON.stringify(usuarioData));
    setUsuario(usuarioData);
  }

  function logout() {
    window.sessionStorage.removeItem(KEY);
    setUsuario(null);
  }

  return { usuario, cargando, login, logout };
}
