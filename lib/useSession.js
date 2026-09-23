'use client';
import { useEffect, useState } from 'react';

const KEY = 'ilce-leads-session';
const VERCOMO_KEY = 'ilce-leads-vercomo';
export const EMAIL_VERCOMO = 'diegolernerdl@gmail.com';

// Devuelve el timestamp de hoy a las 23:59:59, en milisegundos.
function finDelDia() {
  const f = new Date();
  f.setHours(23, 59, 59, 999);
  return f.getTime();
}

function leerSesionGuardada() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(KEY) || window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const datos = JSON.parse(raw);
    // Los usuarios que no son Admin tienen la sesión con vencimiento al final del día,
    // aunque hayan tildado "Mantener sesión abierta" — Admin nunca vence.
    if (datos._expira && Date.now() > datos._expira) {
      window.localStorage.removeItem(KEY);
      window.sessionStorage.removeItem(KEY);
      return null;
    }
    const { _expira, ...usuario } = datos;
    return usuario;
  } catch (e) {
    return null;
  }
}

function leerVerComo() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(VERCOMO_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}
// Helpers para el modo "Ver como" (solo lo usa Diego). El usuario real sigue en KEY;
// la persona a previsualizar se guarda aparte en VERCOMO_KEY.
export function leerUsuarioReal() { return leerSesionGuardada(); }
export function getVerComo() { return leerVerComo(); }
export function aplicarVerComo(u) { try { window.localStorage.setItem(VERCOMO_KEY, JSON.stringify(u)); } catch (e) {} }
export function quitarVerComo() { try { window.localStorage.removeItem(VERCOMO_KEY); } catch (e) {} }

export function useSession() {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const real = leerSesionGuardada();
    const vc = real && real.email === EMAIL_VERCOMO ? leerVerComo() : null;
    setUsuario(vc || real);
    setCargando(false);

    // Revisa cada minuto si la sesión venció (por si queda la pestaña abierta pasada la medianoche)
    const intervalo = setInterval(() => {
      if (!leerSesionGuardada()) setUsuario(null);
    }, 60 * 1000);
    return () => clearInterval(intervalo);
  }, []);

  function login(usuarioData, mantenerSesion = false) {
    const esAdmin = (usuarioData.roles || []).includes('Admin');
    const paraGuardar = esAdmin ? usuarioData : { ...usuarioData, _expira: finDelDia() };
    // Admin siempre queda en localStorage (persiste hasta que toque "Salir"), sin importar
    // el checkbox — para el resto, el checkbox decide entre localStorage y sessionStorage.
    const storage = esAdmin || mantenerSesion ? window.localStorage : window.sessionStorage;
    storage.setItem(KEY, JSON.stringify(paraGuardar));
    setUsuario(usuarioData);
  }

  function logout() {
    window.localStorage.removeItem(KEY);
    window.sessionStorage.removeItem(KEY);
    window.localStorage.removeItem(VERCOMO_KEY);
    setUsuario(null);
  }

  return { usuario, cargando, login, logout };
}
