'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { useSession } from '../../lib/useSession';
import { ROLES } from '../../lib/constants';

export default function AccesosPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [nuevoRoles, setNuevoRoles] = useState(['Inscripciones']);
  const [mensaje, setMensaje] = useState('');
  const [enviandoA, setEnviandoA] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState({});

  const esAdmin = usuario?.roles?.includes('Admin');

  useEffect(() => {
    if (!usuario) return;
    if (!esAdmin) { router.push('/dashboard'); return; }
    cargarUsuarios();
  }, [usuario]);

  async function cargarUsuarios() {
    setCargando(true);
    const r = await fetch(`/api/usuarios?list=true&solicitanteEmail=${encodeURIComponent(usuario.email)}`)
      .then((res) => res.json());
    setUsuarios(r.usuarios || []);
    setCargando(false);
  }

  async function agregarUsuario(e) {
    e.preventDefault();
    setMensaje('');
    const r = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        solicitanteEmail: usuario.email,
        nuevoEmail, nombre: nuevoNombre, roles: nuevoRoles, password: nuevoPassword
      })
    }).then((res) => res.json());
    setMensaje(
      r.emailEnviado
        ? `✓ Usuario creado y contraseña enviada a ${nuevoEmail}`
        : `Usuario creado, pero no se pudo enviar el mail a ${nuevoEmail}. Revisá la configuración de GMAIL_SENDER_EMAIL / GMAIL_APP_PASSWORD.`
    );
    setNuevoEmail(''); setNuevoNombre(''); setNuevoPassword(''); setNuevoRoles(['Inscripciones']);
    cargarUsuarios();
  }

  async function reenviarContraseña(targetEmail) {
    setEnviandoA(targetEmail);
    setMensaje('');
    const r = await fetch('/api/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitanteEmail: usuario.email, targetEmail })
    }).then((res) => res.json());
    setMensaje(
      r.emailEnviado
        ? `✓ Contraseña reseteada a "Hola123" y reenviada a ${targetEmail}`
        : `Contraseña reseteada, pero no se pudo enviar el mail a ${targetEmail}.`
    );
    setEnviandoA('');
    cargarUsuarios();
  }

  function toggleVerPassword(email) {
    setMostrarPassword((prev) => ({ ...prev, [email]: !prev[email] }));
  }

  if (!usuario || !esAdmin) return null;

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="text-base font-semibold mb-1">Gestión de accesos</h3>
          <p className="text-textMuted text-xs mb-4">Solo Diego Lerner puede ver esta pantalla</p>

          {mensaje && <p className="text-successText text-xs mb-3">{mensaje}</p>}

          {cargando ? (
            <p className="text-textSec text-sm">Cargando…</p>
          ) : (
            <div className="mb-5">
              {usuarios.map((u, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border text-sm">
                  <div className="flex-1">
                    <p className="font-semibold">{u.Nombre}</p>
                    <p className="text-textMuted text-xs">{u.Email}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-infoBg text-infoText">
                    {u.Roles}
                  </span>

                  {u.passwordActual ? (
                    <button
                      onClick={() => toggleVerPassword(u.Email)}
                      className="text-xs px-2.5 py-1 rounded-md bg-bg border border-border font-mono min-w-[90px] text-center"
                      title="Tocar para mostrar/ocultar"
                    >
                      {mostrarPassword[u.Email] ? u.passwordActual : '••••••••'}
                    </button>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-warningBg text-warningText">
                      sin contraseña
                    </span>
                  )}

                  <button
                    onClick={() => reenviarContraseña(u.Email)}
                    disabled={enviandoA === u.Email}
                    className="text-xs px-3 py-1 rounded-md bg-surface2 border border-border disabled:opacity-60"
                  >
                    {enviandoA === u.Email ? 'Enviando…' : 'Restablecer contraseña'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <hr className="border-border my-4" />
          <p className="text-sm font-semibold mb-3">Agregar nuevo usuario</p>
          <form onSubmit={agregarUsuario} className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="text-xs text-textSec block mb-1">Email</label>
              <input required type="email" value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)}
                placeholder="nombre@institutoilce.com"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-textSec block mb-1">Nombre</label>
              <input required value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-textSec block mb-1">Contraseña</label>
              <input value={nuevoPassword} onChange={(e) => setNuevoPassword(e.target.value)}
                placeholder='Vacío = "Hola123" por defecto'
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-textSec block mb-1">Rol(es)</label>
              <div className="flex gap-3 flex-wrap pt-1.5">
                {ROLES.map((rol) => (
                  <label key={rol} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={nuevoRoles.includes(rol)}
                      onChange={(e) => {
                        setNuevoRoles((prev) =>
                          e.target.checked ? [...prev, rol] : prev.filter((r) => r !== rol)
                        );
                      }}
                    />
                    {rol}
                  </label>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <button type="submit"
                className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-5 py-2.5 font-semibold text-sm">
                + Dar acceso (la contraseña se envía por mail)
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
