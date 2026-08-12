'use client';
import { useEffect, useMemo, useState } from 'react';
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
  const [textoBajasMasivas, setTextoBajasMasivas] = useState('');
  const previewBajas = useMemo(
    () => (textoBajasMasivas.trim() ? parsearBloquesBajas(textoBajasMasivas) : []),
    [textoBajasMasivas]
  );
  const [cargandoBajasMasivas, setCargandoBajasMasivas] = useState(false);
  const [resultadoBajasMasivas, setResultadoBajasMasivas] = useState(null);
  const [mostrarListaBajas, setMostrarListaBajas] = useState(false);
  const [listaBajas, setListaBajas] = useState([]);

  const [creadorLimpieza, setCreadorLimpieza] = useState('');
  const [previewLimpieza, setPreviewLimpieza] = useState(null);
  const [confirmarLimpieza, setConfirmarLimpieza] = useState(false);
  const [resultadoLimpieza, setResultadoLimpieza] = useState(null);
  const [cargandoLimpieza, setCargandoLimpieza] = useState(false);

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

  // Cada persona es un bloque separado por una línea en blanco, con campos "Etiqueta: valor"
  // en cualquier orden — todos opcionales, con al menos uno para poder identificarla.
  // Ej:
  //   Nombre: María Agustina Roldán
  //   Curso: Coaching de Equipos
  //   Email: ag.roldan.est@gmail.com
  //   WhatsApp: +54 9 11 1234-5678
  //   Fecha: 12/08/2026
  // Busca "Etiqueta: valor" en cualquier parte del texto, sin depender de que cada campo esté
  // en su propia línea (por si se pega todo junto sin saltos, como pasó una vez). Cuando un campo
  // que YA estaba completado en la persona actual vuelve a aparecer, se entiende que arrancó
  // una persona nueva — así funciona tanto con líneas en blanco entre bloques como sin ellas.
  // Si un bloque no tiene ninguna etiqueta, se interpreta línea por línea: la primera línea que
  // no sea fecha ni algo entre paréntesis es el nombre; una línea con formato dd/mm/aaaa es la
  // fecha; el resto (incluido lo que esté entre paréntesis) se guarda como referencia de curso/motivo.
  function heuristicaSinEtiquetas(bloque) {
    const entrada = { nombre: '', curso: '', email: '', whatsapp: '', fecha: '', motivo: '' };
    const lineas = bloque.split('\n').map((l) => l.trim()).filter(Boolean);
    const restantes = [];
    lineas.forEach((linea) => {
      const mFecha = linea.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      const mEmail = linea.match(/[^\s]+@[^\s]+\.[^\s]+/);
      const mWpp = linea.match(/^[+]?[\d\s\-()]{8,}$/);
      if (mFecha && !entrada.fecha) {
        entrada.fecha = new Date(Number(mFecha[3]), Number(mFecha[2]) - 1, Number(mFecha[1])).toISOString();
      } else if (mEmail && !entrada.email) {
        entrada.email = mEmail[0];
      } else if (mWpp && !entrada.whatsapp) {
        entrada.whatsapp = linea;
      } else if (!entrada.nombre) {
        entrada.nombre = linea.replace(/^[(\-•]+|[)\-]+$/g, '').trim();
      } else {
        restantes.push(linea.replace(/^[(\-•]+|[)\-]+$/g, '').trim());
      }
    });
    if (restantes.length > 0) entrada.curso = restantes.join(' ');
    return entrada;
  }

  function parsearBloquesBajas(texto) {
    const patron = /(nombre|curso|e[-\s]?mail|whatsapp|wpp|tel[eé]?fono?|fecha|motivo)\s*:\s*([\s\S]*?)(?=(?:nombre|curso|e[-\s]?mail|whatsapp|wpp|tel[eé]?fono?|fecha|motivo)\s*:|$)/gi;
    const entradas = [];
    let actual = null;
    let match;
    while ((match = patron.exec(texto)) !== null) {
      const etiqueta = match[1].toLowerCase().replace(/[\s-]/g, '');
      const valor = match[2].replace(/\n+/g, ' ').trim();
      if (!valor) continue;
      let campo = null;
      if (etiqueta.startsWith('nombre')) campo = 'nombre';
      else if (etiqueta.startsWith('curso')) campo = 'curso';
      else if (etiqueta.startsWith('email') || etiqueta.startsWith('mail')) campo = 'email';
      else if (etiqueta.startsWith('whatsapp') || etiqueta.startsWith('wpp') || etiqueta.startsWith('tel')) campo = 'whatsapp';
      else if (etiqueta.startsWith('fecha')) campo = 'fecha';
      else if (etiqueta.startsWith('motivo')) campo = 'motivo';
      if (!campo) continue;

      if (!actual || actual[campo]) {
        if (actual) entradas.push(actual);
        actual = { nombre: '', curso: '', email: '', whatsapp: '', fecha: '', motivo: '' };
      }
      if (campo === 'fecha') {
        const [d, m, y] = valor.split('/');
        actual.fecha = d && m && y ? new Date(Number(y), Number(m) - 1, Number(d)).toISOString() : '';
      } else {
        actual[campo] = valor;
      }
    }
    if (actual) entradas.push(actual);

    // Si no se detectó NINGUNA etiqueta en todo el texto, se cae a la heurística por bloque
    // (separado por línea en blanco), igual que si no hubiera escrito "Nombre:", "Fecha:", etc.
    if (entradas.length === 0) {
      const bloques = texto.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
      bloques.forEach((bloque) => entradas.push(heuristicaSinEtiquetas(bloque)));
    }

    entradas.forEach((e) => { if (!e.fecha) e.fecha = new Date().toISOString(); });
    return entradas;
  }

  async function cargarBajasMasivas() {
    setCargandoBajasMasivas(true);
    const entradas = parsearBloquesBajas(textoBajasMasivas);
    try {
      const res = await fetch('/api/seguimiento/baja-masiva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entradas, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
      });
      const r = await res.json();
      if (!res.ok) {
        setResultadoBajasMasivas({ procesados: [], creados: [], noEncontrados: [], yaExistentes: [], ambiguos: [], errores: [r.error || 'Error desconocido del servidor'] });
      } else {
        setResultadoBajasMasivas(r);
        setTextoBajasMasivas('');
        if (mostrarListaBajas) cargarListaBajas(true);
      }
    } catch (err) {
      setResultadoBajasMasivas({ procesados: [], creados: [], noEncontrados: [], yaExistentes: [], ambiguos: [], errores: ['No se pudo conectar con el servidor. Probá de nuevo.'] });
    }
    setCargandoBajasMasivas(false);
  }

  async function cargarListaBajas(forzarAbrir) {
    if (!forzarAbrir && mostrarListaBajas) { setMostrarListaBajas(false); return; }
    const r = await fetch(`/api/seguimiento/baja-masiva?solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((res) => res.json());
    setListaBajas(r.bajas || []);
    setMostrarListaBajas(true);
  }

  async function verPreviewLimpieza() {
    setCargandoLimpieza(true);
    setResultadoLimpieza(null);
    const params = new URLSearchParams({ creadorEmail: creadorLimpieza, solicitanteEmail: usuario.email });
    const r = await fetch(`/api/leads/limpiar?${params}`).then((res) => res.json());
    setPreviewLimpieza(r);
    setCargandoLimpieza(false);
  }

  async function ejecutarLimpieza() {
    setCargandoLimpieza(true);
    const r = await fetch('/api/leads/limpiar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creadorEmail: creadorLimpieza, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    }).then((res) => res.json());
    setResultadoLimpieza(r);
    setPreviewLimpieza(null);
    setConfirmarLimpieza(false);
    setCargandoLimpieza(false);
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
          <p className="text-sm font-semibold mb-1">🔴 Gestión de bajas</p>
          <p className="text-textMuted text-xs mb-3">
            Cargá varias bajas de una — un bloque por persona, separados por una línea en blanco.
            Poné lo que tengas (todo opcional, con al menos un dato para identificarla): Nombre, Curso, Email, WhatsApp, Fecha, Motivo.
            Se busca primero por Email, si no hay por WhatsApp, si no hay por Nombre (+Curso si hay más de una persona con ese nombre).
            Si no existe todavía en el sistema, se crea un registro mínimo (con lo que hayas puesto) y se le registra la baja igual.
          </p>
          <textarea rows={8} value={textoBajasMasivas} onChange={(e) => setTextoBajasMasivas(e.target.value)}
            placeholder={'Nombre: María Agustina Roldán\nCurso: Coaching de Equipos\nEmail: ag.roldan.est@gmail.com\nWhatsApp: +54 9 11 1234-5678\nFecha: 12/08/2026\n\nNombre: Otra Persona\nEmail: otra@mail.com'}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono mb-2" />

          {textoBajasMasivas.trim() && (
            <div className="mb-3 space-y-2">
              <p className="text-textMuted text-[11px]">👀 Se van a cargar {previewBajas.length} persona{previewBajas.length !== 1 ? 's' : ''}:</p>
              {previewBajas.map((p, i) => (
                <div key={i} className="bg-bg border border-border rounded-lg p-2.5 text-[12px] flex flex-wrap gap-x-4 gap-y-1">
                  <span className={p.nombre ? 'text-successText' : 'text-dangerText'}>{p.nombre ? '✓' : '✗'} Nombre{p.nombre ? `: ${p.nombre}` : ' (falta)'}</span>
                  <span className={p.curso ? 'text-successText' : 'text-textMuted'}>{p.curso ? '✓' : '○'} Curso{p.curso ? `: ${p.curso}` : ''}</span>
                  <span className={p.email ? 'text-successText' : 'text-textMuted'}>{p.email ? '✓' : '○'} Email{p.email ? `: ${p.email}` : ''}</span>
                  <span className={p.whatsapp ? 'text-successText' : 'text-textMuted'}>{p.whatsapp ? '✓' : '○'} WhatsApp{p.whatsapp ? `: ${p.whatsapp}` : ''}</span>
                  <span className="text-infoText">📅 {new Date(p.fecha).toLocaleDateString('es-AR')}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={cargarBajasMasivas} disabled={cargandoBajasMasivas || !textoBajasMasivas.trim()}
            className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-50 mb-3">
            {cargandoBajasMasivas ? 'Cargando…' : 'Cargar bajas'}
          </button>

          {resultadoBajasMasivas && (
            <div className="bg-bg border border-border rounded-lg p-3 mb-3 text-sm space-y-1">
              {resultadoBajasMasivas.procesados.length > 0 && (
                <p className="text-successText">✓ Registradas: {resultadoBajasMasivas.procesados.join(', ')}</p>
              )}
              {resultadoBajasMasivas.creados?.length > 0 && (
                <p className="text-infoText">🆕 No existían en el sistema, se crearon y se les registró la baja: {resultadoBajasMasivas.creados.join(', ')}</p>
              )}
              {resultadoBajasMasivas.yaExistentes.length > 0 && (
                <p className="text-warningText">⚠️ Ya tenían una baja registrada: {resultadoBajasMasivas.yaExistentes.join(', ')}</p>
              )}
              {resultadoBajasMasivas.ambiguos?.length > 0 && (
                <p className="text-warningText">⚠️ Ambiguos, precisá más datos: {resultadoBajasMasivas.ambiguos.join(' · ')}</p>
              )}
              {resultadoBajasMasivas.errores?.length > 0 && (
                <p className="text-dangerText">🛑 Error al procesar: {resultadoBajasMasivas.errores.join(' · ')}</p>
              )}
              {resultadoBajasMasivas.noEncontrados.length > 0 && (
                <p className="text-dangerText">✗ No encontrados (o no son estudiantes con venta confirmada): {resultadoBajasMasivas.noEncontrados.join(', ')}</p>
              )}
            </div>
          )}

          <button onClick={() => cargarListaBajas()} className="text-xs text-accentTeal font-semibold mb-2">
            {mostrarListaBajas ? '▲ Ocultar' : '▼ Ver'} todas las bajas registradas (incluye las que todavía están esperando)
          </button>
          {mostrarListaBajas && (
            <div className="bg-bg border border-border rounded-lg p-3 max-h-72 overflow-y-auto">
              {listaBajas.length === 0 ? (
                <p className="text-textMuted text-xs">Sin bajas registradas todavía.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-textSec text-left border-b border-border">
                      <th className="py-1.5">Nombre</th><th>Curso</th><th>Fecha baja</th><th>Disponible</th><th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaBajas.map((b) => (
                      <tr key={b.leadId} className="border-b border-border">
                        <td className="py-1.5">{b.nombre}</td>
                        <td>{b.curso}</td>
                        <td>{new Date(b.fechaBaja).toLocaleDateString('es-AR')}</td>
                        <td>{new Date(b.fechaDisponible).toLocaleDateString('es-AR')}</td>
                        <td>
                          {b.contactado ? <span className="text-successText">Contactado</span>
                            : b.disponibleAhora ? <span className="text-warningText">En Lote Bajas</span>
                            : <span className="text-textMuted">Faltan {b.diasFaltantes} días</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <hr className="border-border my-4" />
          <p className="text-sm font-semibold mb-1">🧹 Limpiar leads de un creador</p>
          <p className="text-textMuted text-xs mb-3">
            Borra los leads cargados por un email puntual (útil para sacar pruebas). Nunca toca los que ya tengan una venta confirmada.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <input value={creadorLimpieza} onChange={(e) => { setCreadorLimpieza(e.target.value); setPreviewLimpieza(null); setResultadoLimpieza(null); }}
              placeholder="email@delcreador.com"
              className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
            <button onClick={verPreviewLimpieza} disabled={!creadorLimpieza.trim() || cargandoLimpieza}
              className="text-sm px-4 py-2 rounded-lg bg-surface2 border border-border disabled:opacity-50">
              {cargandoLimpieza ? 'Buscando…' : 'Ver cuántos hay'}
            </button>
          </div>

          {previewLimpieza && !previewLimpieza.error && (
            <div className="bg-bg border border-border rounded-lg p-3 mb-3 text-sm">
              <p>Total cargados por este email: <b>{previewLimpieza.totalCreados}</b></p>
              <p className="text-warningText">Se eliminarían: <b>{previewLimpieza.aBorrar}</b></p>
              {previewLimpieza.protegidosPorVenta > 0 && (
                <p className="text-successText">Protegidos (ya tienen venta confirmada, no se tocan): <b>{previewLimpieza.protegidosPorVenta}</b></p>
              )}
              {previewLimpieza.aBorrar > 0 && (
                <button onClick={() => setConfirmarLimpieza(true)}
                  className="mt-2 text-sm px-4 py-2 rounded-lg bg-dangerText text-white font-semibold">
                  🗑 Eliminar {previewLimpieza.aBorrar} lead(s)
                </button>
              )}
            </div>
          )}

          {resultadoLimpieza && (
            <div className="bg-successBg border border-successText/30 rounded-lg p-3 mb-3 text-sm text-successText">
              ✓ Se eliminaron {resultadoLimpieza.eliminados} lead(s) y {resultadoLimpieza.seguimientoEliminado} fila(s) de seguimiento asociadas.
              {resultadoLimpieza.protegidos > 0 && ` (${resultadoLimpieza.protegidos} quedaron protegidos por tener venta confirmada.)`}
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

      {confirmarLimpieza && previewLimpieza && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface2 border border-border rounded-2xl p-6 w-96">
            <p className="text-sm font-bold mb-2">¿Estás seguro de que querés eliminar estos leads?</p>
            <p className="text-textSec text-sm mb-5">
              Se van a eliminar <b>{previewLimpieza.aBorrar}</b> lead(s) cargado(s) por {creadorLimpieza}, junto con su seguimiento asociado.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmarLimpieza(false)}
                className="flex-1 bg-surface border border-border rounded-lg py-2 text-sm">Cancelar</button>
              <button onClick={ejecutarLimpieza} disabled={cargandoLimpieza}
                className="flex-1 bg-dangerText text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-60">
                {cargandoLimpieza ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
