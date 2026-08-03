'use client';
import { useEffect, useState } from 'react';

const KEY = 'ilce-leads-session';

export function useSession() {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') { setCargando(false); return; }
    // Se busca primero en localStorage (sesión que el usuario eligió mantener abierta)
    // y si no hay nada ahí, en sessionStorage (sesión normal, se cierra con la pestaña).
    const raw = window.localStorage.getItem(KEY) || window.sessionStorage.getItem(KEY);
    if (raw) setUsuario(JSON.parse(raw));
    setCargando(false);
  }, []);

  function login(usuarioData, mantenerSesion = false) {
    const storage = mantenerSesion ? window.localStorage : window.sessionStorage;
    storage.setItem(KEY, JSON.stringify(usuarioData));
    setUsuario(usuarioData);
  }

  function logout() {
    window.localStorage.removeItem(KEY);
    window.sessionStorage.removeItem(KEY);
    setUsuario(null);
  }

  return { usuario, cargando, login, logout };
}
