'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../lib/useSession';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [mantenerSesion, setMantenerSesion] = useState(true);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { login } = useSession();
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo iniciar sesión');
        return;
      }
      login(data.usuario, mantenerSesion);
      const roles = data.usuario.roles || [];
      const puedeVerOperativo = roles.some((r) => ['Admin', 'Coordinador', 'Inscripciones'].includes(r));
      if (puedeVerOperativo) {
        router.push('/dashboard');
      } else if (roles.some((r) => ['Estudiantes', 'CoordinadorEstudiantes'].includes(r))) {
        router.push('/inscritos');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Error de conexión. Probá de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex justify-center pt-24 px-6">
      <div className="w-80 bg-surface2 border border-border rounded-2xl p-7">
        <h2 className="text-center text-lg font-semibold mb-1">Seguimiento de LEAD-Estudiante</h2>
        <p className="text-center text-textSec text-sm mb-5">Ingresá con tu usuario y contraseña</p>
        <form onSubmit={handleSubmit}>
          <label className="text-xs text-textSec block mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@institutoilce.com"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3"
          />
          <label className="text-xs text-textSec block mb-1">Contraseña</label>
          <div className="relative mb-3">
            <input
              type={verPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 pr-9 text-sm"
            />
            <button type="button" onClick={() => setVerPassword(!verPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-text text-sm"
              title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              {verPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {error && <p className="text-warningText text-xs mb-3">{error}</p>}
          <label className="flex items-center gap-2 text-xs text-textSec mb-4 cursor-pointer">
            <input type="checkbox" checked={mantenerSesion} onChange={(e) => setMantenerSesion(e.target.checked)} />
            Mantener sesión abierta
          </label>
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-60"
          >
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
        <p className="text-textMuted text-xs text-center mt-3">
          ¿No tenés contraseña todavía? Pedile a Diego que te la asigne desde "Accesos".
        </p>
      </div>
    </div>
  );
}
