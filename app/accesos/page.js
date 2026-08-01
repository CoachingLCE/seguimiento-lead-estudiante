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
  const [editandoRoles, setEditandoRoles] = useState(null); // email del usuario en edición de roles
  const [rolesEnEdicion, setRolesEnEdicion] = useState([]);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null); // usuario a confirmar

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

  function empezarEdicionRoles(u) {
    setEditandoRoles(u.Email);
    setRolesEnEdicion((u.Roles || '').split(',').map((r) => r.trim()).filter(Boolean));
  }

  async function guardarRoles(email) {
    setMensaje('');
    const r = await fetch('/api/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitanteEmail: usuario.email, targetEmail: email, nuevosRoles: rolesEnEdicion })
    }).then((res) => res.json());
    if (r.error) setMensaje(`⚠️ ${r.error}`);
    else setMensaje(`✓ Roles actualizados para ${email}`);
    setEditandoRoles(null);
    cargarUsuarios();
  }

  async function toggleActivo(u) {
    setMensaje('');
    const r = await fetch('/api/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitanteEmail: usuario.email, targetEmail: u.Email, activo: !u.Activo })
    }).then((res) => res.json());
    if (r.error) setMensaje(`⚠️ ${r.error}`);
    else setMensaje(u.Activo ? `Usuario ${u.Email} desactivado` : `✓ Usuario ${u.Email} reactivado`);
    cargarUsuarios();
  }

  async function confirmarYEliminar() {
    if (!confirmarEliminar) return;
    setMensaje('');
    const r = await fetch('/api/usuarios', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitanteEmail: usuario.email, targetEmail: confirmarEliminar.Email })
    }).then((res) => res.json());
    if (r.error) setMensaje(`⚠️ ${r.error}`);
    else setMensaje(`✓ Usuario ${confirmarEliminar.Email} eliminado`);
    setConfirmarEliminar(null);
    cargarUsuarios();
  }

  if (!usuario || !esAdmin) return null;

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
          <p className="text-sm font-bold mb-3">🔐 Permisos por rol — quién ve qué</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-textMuted text-left border-b border-border">
                <th className="py-1.5 pr-3">Rol</th><th className="pr-3">Accede a</th>
              </tr>
            </thead>
            <tbody className="text-textSec">
              <tr className="border-b border-border"><td className="py-1.5 pr-3 font-semibold text-text">Admin</td><td className="pr-3">Todo el sistema, sin excepción</td></tr>
              <tr className="border-b border-border"><td className="py-1.5 pr-3 font-semibold text-text">Coordinador</td><td className="pr-3">Nuevo lead, Dashboard, Seguimiento (reasigna), Reportes, Resumen diario — no ve Estudiantes</td></tr>
              <tr className="border-b border-border"><td className="py-1.5 pr-3 font-semibold text-text">Inscripciones</td><td className="pr-3">Nuevo lead, Dashboard, Seguimiento (marca ventas) — no ve Reportes</td></tr>
              <tr className="border-b border-border"><td className="py-1.5 pr-3 font-semibold text-text">Estudiantes</td><td className="pr-3">Solo pantalla Estudiantes (altas y bienvenidas) — nada del circuito comercial</td></tr>
              <tr><td className="py-1.5 pr-3 font-semibold text-text">CoordinadorEstudiantes</td><td className="pr-3">Estudiantes + Resumen de Estudiantes — nada del circuito comercial</td></tr>
            </tbody>
          </table>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="text-base font-semibold mb-1">Gestión de accesos</h3>
          <p className="text-textMuted text-xs mb-4">Solo Diego Lerner puede ver esta pantalla</p>

          {mensaje && <p className="text-successText text-xs mb-3">{mensaje}</p>}

          {cargando ? (
            <p className="text-textSec text-sm">Cargando…</p>
          ) : (
            <div className="mb-5">
              {usuarios.map((u, i) => (
                <div key={i} className={`flex items-center gap-3 py-2.5 border-b border-border text-sm ${!u.Activo ? 'opacity-50' : ''}`}>
                  <div className="flex-1">
                    <p className="font-semibold">{u.Nombre}</p>
                    <p className="text-textMuted text-xs">{u.Email}</p>
                  </div>

                  {editandoRoles === u.Email ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {ROLES.map((rol) => (
                        <label key={rol} className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={rolesEnEdicion.includes(rol)}
                            onChange={(e) => setRolesEnEdicion((prev) =>
                              e.target.checked ? [...prev, rol] : prev.filter((r) => r !== rol)
                            )} />
                          {rol}
                        </label>
                      ))}
                      <button onClick={() => guardarRoles(u.Email)}
                        className="text-xs px-2.5 py-1 rounded bg-accentPurple text-white">Guardar</button>
                      <button onClick={() => setEditandoRoles(null)}
                        className="text-xs px-2.5 py-1 rounded bg-surface2 border border-border">Cancelar</button>
                    </div>
                  ) : (
                    <button onClick={() => empezarEdicionRoles(u)}
                      className="text-xs px-2.5 py-1 rounded-full bg-infoBg text-infoText hover:opacity-80" title="Click para editar roles">
                      {u.Roles} ✏️
                    </button>
                  )}

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

                  <button onClick={() => toggleActivo(u)}
                    className={`text-xs px-2.5 py-1 rounded-md border ${
                      u.Activo ? 'border-border bg-surface2 text-textSec' : 'border-successText/40 bg-successBg text-successText'
                    }`}>
                    {u.Activo ? 'Desactivar' : 'Reactivar'}
                  </button>

                  <button onClick={() => setConfirmarEliminar(u)}
                    className="text-xs px-2.5 py-1 rounded-md border border-dangerText/30 text-dangerText hover:bg-dangerBg">
                    🗑 Eliminar
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

      {confirmarEliminar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface2 border border-border rounded-2xl p-6 w-96">
            <p className="text-sm font-bold mb-2">¿Estás seguro de que querés eliminar este usuario?</p>
            <p className="text-textSec text-sm mb-5">
              {confirmarEliminar.Nombre} ({confirmarEliminar.Email}) — esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmarEliminar(null)}
                className="flex-1 bg-surface border border-border rounded-lg py-2 text-sm">Cancelar</button>
              <button onClick={confirmarYEliminar}
                className="flex-1 bg-dangerText text-white rounded-lg py-2 text-sm font-semibold">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
