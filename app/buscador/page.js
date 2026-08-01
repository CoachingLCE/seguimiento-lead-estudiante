'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Nav from '../../components/Nav';
import { useSession } from '../../lib/useSession';
import { tienePermisoBuscador, tienePermisoEditarLead } from '../../lib/permisos';
import { ORIGENES, ORIGEN_OTRO, CURSOS, CURSO_OTROS, CURSO_SIN_DEFINIR, PAISES } from '../../lib/constants';

const SEP_NOTAS = '\n@@\n';

// Cada nota nueva se guarda como "ISO||Autor||texto" y se van acumulando separadas por @@,
// así queda historial de notas sin necesitar una columna nueva en el Sheet.
function parsearNotas(notasInternas) {
  if (!notasInternas) return [];
  return notasInternas.split(SEP_NOTAS).map((entrada) => {
    const m = entrada.match(/^([^|]*)\|\|([^|]*)\|\|([\s\S]*)$/);
    if (m) return { fecha: m[1], autor: m[2], texto: m[3] };
    return { fecha: '', autor: '', texto: entrada }; // nota vieja, sin el formato nuevo
  }).reverse();
}

function tiempoRelativo(fecha) {
  if (!fecha) return '';
  const dias = Math.floor((new Date() - new Date(fecha)) / (24 * 60 * 60 * 1000));
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Hace 1 día';
  return `Hace ${dias} días`;
}
function fechaLarga(fecha) {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function iconoAccion(accion) {
  const a = (accion || '').toLowerCase();
  if (a.includes('creó un lead')) return { icono: '📩', color: 'border-accentTeal' };
  if (a.includes('venta')) return { icono: '💰', color: 'border-successText' };
  if (a.includes('alumno creado')) return { icono: '🤖', color: 'border-infoText' };
  if (a.includes('alta en plataforma') || a.includes('alta')) return { icono: '🎓', color: 'border-accentPurple' };
  if (a.includes('bienvenida')) return { icono: '👋', color: 'border-accentMagenta' };
  if (a.includes('diploma') || a.includes('abon')) return { icono: '📄', color: 'border-successText' };
  if (a.includes('contraseñ')) return { icono: '🔑', color: 'border-warningText' };
  if (a.includes('editó') || a.includes('curso') || a.includes('reasign')) return { icono: '✏️', color: 'border-textMuted' };
  if (a.includes('resultado') || a.includes('contact')) return { icono: '📞', color: 'border-infoText' };
  return { icono: '•', color: 'border-border' };
}

const TABS = ['Resumen', 'Actividad', 'Seguimiento', 'Venta', 'Alumno', 'Notas'];

function BuscadorContent() {
  const { usuario, logout } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qInicial = searchParams.get('q') || '';
  const leadId = searchParams.get('leadId');
  const autoEditar = searchParams.get('editar') === '1';

  const [q, setQ] = useState(qInicial);
  const [resultados, setResultados] = useState([]);
  const [ficha, setFicha] = useState(null);
  const [cargando, setCargando] = useState(false);

  const puedeVer = tienePermisoBuscador(usuario);

  useEffect(() => {
    if (!usuario || !puedeVer) return;
    if (leadId) cargarFicha();
    else if (qInicial) buscar(qInicial);
  }, [usuario, leadId, qInicial]);

  async function buscar(texto) {
    setCargando(true);
    setFicha(null);
    const r = await fetch(`/api/buscador?q=${encodeURIComponent(texto)}&solicitanteEmail=${encodeURIComponent(usuario.email)}`)
      .then((res) => res.json());
    setResultados(r.resultados || []);
    setCargando(false);
  }

  async function cargarFicha() {
    setCargando(true);
    const r = await fetch(`/api/buscador?leadId=${encodeURIComponent(leadId)}&solicitanteEmail=${encodeURIComponent(usuario.email)}`)
      .then((res) => res.json());
    setFicha(r);
    setCargando(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    router.push(`/buscador?q=${encodeURIComponent(q)}`);
  }

  if (!usuario || !puedeVer) return null;

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <form onSubmit={handleSubmit} className="mb-5">
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, apellido, email o celular…"
            className="w-full max-w-md bg-bg border border-border rounded-lg px-3 py-2 text-sm"
          />
        </form>

        {cargando && <p className="text-textSec text-sm">Cargando…</p>}

        {!leadId && !cargando && (
          <div className="bg-surface border border-border rounded-2xl p-5">
            {resultados.length === 0 ? (
              <p className="text-textMuted text-sm">{qInicial ? 'Sin resultados.' : 'Escribí algo para buscar.'}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-textSec text-left border-b border-border">
                    <th className="py-2">ID</th><th>Nombre</th><th>Curso</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r) => (
                    <tr key={r.id} className="border-b border-border">
                      <td className="py-2 text-textMuted">{r.id}</td>
                      <td>{r.nombre}</td>
                      <td>{r.curso}</td>
                      <td>{r.estado}</td>
                      <td>
                        <button onClick={() => router.push(`/buscador?leadId=${r.id}`)}
                          className="text-xs px-3 py-1 rounded bg-accentPurple text-white">Ver ficha</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {leadId && ficha && !cargando && (
          <Ficha ficha={ficha} usuario={usuario} onActualizar={cargarFicha} autoEditar={autoEditar} />
        )}
      </div>
    </div>
  );
}

function Badge({ children, tono = 'info' }) {
  const clases = {
    success: 'bg-successBg text-successText', warning: 'bg-warningBg text-warningText',
    danger: 'bg-dangerBg text-dangerText', info: 'bg-infoBg text-infoText'
  }[tono];
  return <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${clases}`}>{children}</span>;
}

function Ficha({ ficha, usuario, onActualizar, autoEditar }) {
  const { lead, seguimiento, inscrito, historial } = ficha;
  const [tab, setTab] = useState('Resumen');

  const [notaNueva, setNotaNueva] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);
  const notas = parsearNotas(lead.NotasInternas);

  const [editando, setEditando] = useState(autoEditar);
  const [datos, setDatos] = useState({
    nombre: lead.Nombre || '', whatsapp: lead.WhatsApp || '', email: lead.EmailEstudiante || '',
    instagram: lead.InstagramUsuario || '', pais: lead.Pais || '', curso: lead.Curso || CURSO_SIN_DEFINIR,
    cursoPersonalizado: '', origen: lead.Origen || ORIGEN_OTRO
  });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const asignadoActual = seguimiento.find((s) => s.Lote === '1')?.AsignadoAEmail;
  const puedeEditar = tienePermisoEditarLead(usuario, lead, asignadoActual);
  const whatsappLimpio = (lead.WhatsApp || '').replace(/[^\d]/g, '');

  // Derivados para KPIs / progreso / alertas
  const contactadas = seguimiento.filter((s) => s.Contactado === 'TRUE');
  const ultimoContacto = contactadas.sort((a, b) => new Date(b.FechaContacto) - new Date(a.FechaContacto))[0];
  const responsableFila = [...seguimiento].sort((a, b) => new Date(b.FechaVence) - new Date(a.FechaVence)).find((s) => s.AsignadoANombre);
  const diasSinContacto = ultimoContacto
    ? Math.floor((new Date() - new Date(ultimoContacto.FechaContacto)) / (24 * 60 * 60 * 1000))
    : Math.floor((new Date() - new Date(lead.FechaIngreso)) / (24 * 60 * 60 * 1000));

  const ultimaModificacion = [...historial].reverse().find((h) => h.Accion?.toLowerCase().includes('editó'));

  const pasos = [
    { label: 'Lead', ok: true },
    { label: 'Contactado', ok: contactadas.length > 0 },
    { label: 'Venta', ok: lead.Estado === 'Comprado' },
    { label: 'Alta plataforma', ok: inscrito?.AltaPlataforma === 'TRUE' },
    { label: 'Bienvenida', ok: inscrito?.BienvenidaEnviada === 'TRUE' },
    { label: 'Pago total / Diploma', ok: inscrito?.AbonoTotalidad === 'TRUE' }
  ];

  const alertas = [];
  if (lead.Estado !== 'Comprado' && diasSinContacto >= 7) alertas.push(`Hace ${diasSinContacto} días sin contacto`);
  if (inscrito && inscrito.BienvenidaEnviada !== 'TRUE') alertas.push('Bienvenida pendiente');
  if (inscrito && inscrito.AltaPlataforma !== 'TRUE') alertas.push('Alta en plataforma pendiente');
  if (inscrito && inscrito.AbonoTotalidad !== 'TRUE') alertas.push('Pago total pendiente');

  function actualizarDato(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardarEdicion() {
    setGuardandoEdicion(true);
    const cursoFinal = datos.curso === CURSO_SIN_DEFINIR ? '' : datos.curso === CURSO_OTROS ? datos.cursoPersonalizado.trim() : datos.curso;
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: lead.ID, nombre: datos.nombre, whatsapp: datos.whatsapp, email: datos.email,
        instagram: datos.instagram, pais: datos.pais, curso: cursoFinal, origen: datos.origen,
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    setGuardandoEdicion(false);
    setEditando(false);
    onActualizar?.();
  }

  function cancelarEdicion() {
    setDatos({
      nombre: lead.Nombre || '', whatsapp: lead.WhatsApp || '', email: lead.EmailEstudiante || '',
      instagram: lead.InstagramUsuario || '', pais: lead.Pais || '', curso: lead.Curso || CURSO_SIN_DEFINIR,
      cursoPersonalizado: '', origen: lead.Origen || ORIGEN_OTRO
    });
    setEditando(false);
  }

  async function guardarNota() {
    if (!notaNueva.trim()) return;
    setGuardandoNota(true);
    const entrada = `${new Date().toISOString()}||${usuario.nombre}||${notaNueva.trim()}`;
    const notasActualizadas = lead.NotasInternas ? `${lead.NotasInternas}${SEP_NOTAS}${entrada}` : entrada;
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: lead.ID, notasInternas: notasActualizadas,
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    setGuardandoNota(false);
    setNotaNueva('');
    onActualizar?.();
  }

  return (
    <div className="space-y-4">

      {/* CABECERA RICA */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            {!editando ? (
              <p className="text-xl font-bold flex items-center gap-2">👤 {lead.Nombre} {lead.Apellido}</p>
            ) : (
              <input value={datos.nombre} onChange={(e) => actualizarDato('nombre', e.target.value)}
                className="text-xl font-bold bg-bg border border-border rounded-lg px-2 py-1" />
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge tono={lead.Estado === 'Comprado' ? 'success' : 'warning'}>
                {lead.Estado === 'Comprado' ? (inscrito ? '🟢 Alumno activo' : '💰 Comprado') : '⚪ Lead'}
              </Badge>
              {lead.Prioridad && (
                <Badge tono={lead.Prioridad === 'Alta' ? 'danger' : lead.Prioridad === 'Media' ? 'warning' : 'success'}>
                  {lead.Prioridad === 'Alta' ? '🔴' : lead.Prioridad === 'Media' ? '🟡' : '🟢'} Prioridad {lead.Prioridad}
                </Badge>
              )}
              <span className="text-textSec text-sm">{lead.Curso || 'Sin curso definido'}{inscrito?.Edicion && ` · Edición ${inscrito.Edicion}`}</span>
            </div>
            <p className="text-textMuted text-xs mt-1.5">
              Lead #{lead.ID.slice(-6)} · Ingresó {tiempoRelativo(lead.FechaIngreso)} ({fechaLarga(lead.FechaIngreso)})
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {lead.WhatsApp && (
              <a href={`https://wa.me/${whatsappLimpio}`} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg bg-surface2 border border-border">💬 WhatsApp</a>
            )}
            {lead.EmailEstudiante && (
              <a href={`mailto:${lead.EmailEstudiante}`} className="text-xs px-3 py-1.5 rounded-lg bg-surface2 border border-border">✉ Email</a>
            )}
            {lead.WhatsApp && (
              <a href={`tel:${whatsappLimpio}`} className="text-xs px-3 py-1.5 rounded-lg bg-surface2 border border-border">📞 Llamar</a>
            )}
            {puedeEditar && !editando && (
              <button onClick={() => setEditando(true)} className="text-xs px-3 py-1.5 rounded-lg bg-accentPurple text-white font-semibold">✏️ Editar</button>
            )}
          </div>
        </div>

        {editando && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-textSec block mb-1">WhatsApp</label>
                <input value={datos.whatsapp} onChange={(e) => actualizarDato('whatsapp', e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-textSec block mb-1">Email</label>
                <input value={datos.email} onChange={(e) => actualizarDato('email', e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-textSec block mb-1">Instagram/Facebook</label>
                <input value={datos.instagram} onChange={(e) => actualizarDato('instagram', e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-textSec block mb-1">País</label>
                <input list="lista-paises-ficha" value={datos.pais} onChange={(e) => actualizarDato('pais', e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
                <datalist id="lista-paises-ficha">{PAISES.map((p) => <option key={p} value={p} />)}</datalist>
              </div>
              <div>
                <label className="text-xs text-textSec block mb-1">Curso</label>
                <select value={datos.curso} onChange={(e) => actualizarDato('curso', e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm">
                  <option value={CURSO_SIN_DEFINIR}>{CURSO_SIN_DEFINIR}</option>
                  {CURSOS.map((c) => <option key={c}>{c}</option>)}
                  <option value={CURSO_OTROS}>{CURSO_OTROS}</option>
                </select>
                {datos.curso === CURSO_OTROS && (
                  <input value={datos.cursoPersonalizado} onChange={(e) => actualizarDato('cursoPersonalizado', e.target.value)}
                    placeholder="Nombre del curso" className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mt-2" />
                )}
              </div>
              <div>
                <label className="text-xs text-textSec block mb-1">Cómo llegó</label>
                <select value={datos.origen} onChange={(e) => actualizarDato('origen', e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm">
                  {ORIGENES.map((o) => <option key={o}>{o}</option>)}
                  <option value={ORIGEN_OTRO}>{ORIGEN_OTRO}</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button onClick={guardarEdicion} disabled={guardandoEdicion}
                className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-1.5 text-sm font-semibold disabled:opacity-60">
                {guardandoEdicion ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button onClick={cancelarEdicion} className="text-textMuted text-sm">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* ALERTAS */}
      {alertas.length > 0 && (
        <div className="bg-warningBg border border-warningText/30 rounded-2xl p-4">
          <p className="text-warningText text-sm font-semibold mb-1.5">⚠ Atención</p>
          <ul className="text-warningText text-sm space-y-0.5">
            {alertas.map((a) => <li key={a}>⬜ {a}</li>)}
          </ul>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <Kpi label="Último contacto" valor={ultimoContacto ? tiempoRelativo(ultimoContacto.FechaContacto) : 'Sin contacto'} />
        <Kpi label="Estado" valor={lead.Estado === 'Comprado' ? '🟢 Compró' : '⚪ Lead'} />
        <Kpi label="Responsable" valor={responsableFila?.AsignadoANombre || 'No asignado'} />
        <Kpi label="Monto" valor={lead.MontoTotal ? `$${Number(lead.MontoTotal).toLocaleString('es-AR')}` : '—'} grande={!!lead.MontoTotal} />
        <Kpi label="Curso" valor={lead.Curso || 'Sin definir'} />
        <Kpi label="Edición" valor={inscrito?.Edicion || '—'} />
      </div>

      {/* BARRA DE PROGRESO */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-1 flex-wrap">
          {pasos.map((p, i) => (
            <div key={p.label} className="flex items-center gap-1">
              <span className={`text-xs px-2.5 py-1 rounded-full ${p.ok ? 'bg-successBg text-successText' : 'bg-surface2 text-textMuted'}`}>
                {p.ok ? '✓' : '⬜'} {p.label}
              </span>
              {i < pasos.length - 1 && <span className="text-textMuted text-xs">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* PESTAÑAS */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-sm px-4 py-2 border-b-2 transition-colors ${
              tab === t ? 'border-accentTeal text-text font-semibold' : 'border-transparent text-textMuted hover:text-textSec'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Resumen' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-textMuted uppercase tracking-wide mb-3">Datos personales</p>
            <Campo label="Nombre" valor={`${lead.Nombre} ${lead.Apellido}`} />
            <Campo label="WhatsApp" valor={lead.WhatsApp} vacio="No cargado" />
            <Campo label="Email" valor={lead.EmailEstudiante} vacio="No cargado" />
            <Campo label="Instagram" valor={lead.InstagramUsuario} vacio="No cargado" />
            <Campo label="País" valor={lead.Pais} vacio="No cargado" />
          </div>
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-textMuted uppercase tracking-wide mb-3">Más información</p>
            <Campo label="Días sin contacto" valor={String(diasSinContacto)} />
            <Campo label="Intentos de contacto" valor={String(contactadas.length)} />
            <Campo label="Notas internas" valor={notas.length > 0 ? `${notas.length} nota(s)` : null} vacio="Todavía no hay notas" />
            <Campo label="Última modificación" valor={ultimaModificacion ? `${tiempoRelativo(ultimaModificacion.Fecha)} — ${ultimaModificacion.UsuarioNombre}` : null} vacio="Sin modificaciones" />
            <Campo label="Cargado por" valor={lead.CargadoPorNombre} />
            {lead.CursosAdicionales && <Campo label="Interés adicional" valor={lead.CursosAdicionales} />}
          </div>
        </div>
      )}

      {tab === 'Actividad' && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold mb-3">Historial completo</p>
          {historial.length === 0 ? <p className="text-textMuted text-sm">Sin historial todavía.</p> : (
            <div className="relative pl-6">
              <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border" />
              {[...historial].reverse().map((h, i) => {
                const { icono, color } = iconoAccion(h.Accion);
                return (
                  <div key={i} className="relative pb-4 last:pb-0">
                    <div className={`absolute -left-6 top-0 w-6 h-6 rounded-full bg-surface border-2 ${color} flex items-center justify-center text-xs`}>{icono}</div>
                    <p className="text-textMuted text-[11px]">{tiempoRelativo(h.Fecha)} · {fechaLarga(h.Fecha)}</p>
                    <p className="text-sm font-medium">{h.Accion}</p>
                    <p className="text-textSec text-xs">{h.Detalle} — <span className="text-textMuted">{h.UsuarioNombre}</span></p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'Seguimiento' && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold mb-3">Seguimiento comercial</p>
          {seguimiento.length === 0 ? <p className="text-textMuted text-sm">Sin seguimiento comercial.</p> : (
            seguimiento.map((s) => (
              <p key={s.Lote} className="text-sm text-textSec mb-1">
                Lote {s.Lote}: {s.Contactado === 'TRUE'
                  ? `${s.Resultado} (${tiempoRelativo(s.FechaContacto)}) — responsable: ${s.AsignadoANombre || 'No asignado'}`
                  : `Pendiente — asignado a: ${s.AsignadoANombre || 'No asignado'}`}
              </p>
            ))
          )}
        </div>
      )}

      {tab === 'Venta' && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-textMuted uppercase tracking-wide mb-3">Venta</p>
          {lead.Estado !== 'Comprado' ? (
            <p className="text-textMuted text-sm">Sin seguimiento comercial — todavía no se registró una venta.</p>
          ) : (
            <>
              <Campo label="Monto" valor={lead.MontoTotal ? `$${Number(lead.MontoTotal).toLocaleString('es-AR')}` : null} vacio="—" grande />
              <Campo label="Forma de pago" valor={lead.MedioPago} />
              <Campo label="Modalidad" valor={lead.Modalidad} />
              {lead.DetalleCuotas && <Campo label="Detalle de cuotas" valor={`$${lead.DetalleCuotas}`} />}
              <Campo label="Vendedor" valor={lead.VendidoPorNombre} vacio="No especificado" />
              <Campo label="Fecha" valor={lead.FechaVenta ? fechaLarga(lead.FechaVenta) : null} vacio="—" />
              {lead.Docentes && <Campo label="Docente(s)" valor={lead.Docentes} />}
            </>
          )}
        </div>
      )}

      {tab === 'Alumno' && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-textMuted uppercase tracking-wide mb-3">Estado académico</p>
          {!inscrito ? (
            <p className="text-textMuted text-sm">Sin seguimiento comercial — todavía no es alumno.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">{inscrito.AltaPlataforma === 'TRUE' ? '🟢' : '⚪'} Alta en plataforma {inscrito.AltaPlataforma === 'TRUE' && `— ${inscrito.AltaPorNombre}`}</p>
              <p className="text-sm">{inscrito.BienvenidaEnviada === 'TRUE' ? '🟢' : '⚪'} Bienvenida {inscrito.BienvenidaEnviada === 'TRUE' && `— ${inscrito.BienvenidaPorNombre}`}</p>
              <p className="text-sm">{inscrito.Docentes ? '🟢' : '⚪'} Docente(s) {inscrito.Docentes && `— ${inscrito.Docentes}`}</p>
              <p className="text-sm">{inscrito.AbonoTotalidad === 'TRUE' ? '🟢' : '🟡'} Diploma {inscrito.AbonoTotalidad === 'TRUE' ? '(habilitado)' : '(pendiente de pago total)'}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'Notas' && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold mb-3">Observaciones (notas internas — solo personal)</p>
          <textarea value={notaNueva} onChange={(e) => setNotaNueva(e.target.value)} rows={3}
            placeholder="Escribí una nota nueva. Ej: Prefiere contacto por WhatsApp."
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-2" />
          <button onClick={guardarNota} disabled={guardandoNota || !notaNueva.trim()}
            className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-1.5 text-sm font-semibold disabled:opacity-60 mb-4">
            {guardandoNota ? 'Guardando…' : '+ Agregar nota'}
          </button>

          {notas.length === 0 ? (
            <p className="text-textMuted text-sm">Todavía no hay notas.</p>
          ) : (
            <div className="space-y-3 border-t border-border pt-3">
              {notas.map((n, i) => (
                <div key={i} className="text-sm">
                  {n.fecha && <p className="text-textMuted text-[11px]">{fechaLarga(n.fecha)} · {n.autor}</p>}
                  <p className="text-textSec">{n.texto}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, valor, grande }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3 shadow-sm">
      <p className="text-textMuted text-[10.5px] mb-1">{label}</p>
      <p className={`font-bold ${grande ? 'text-lg' : 'text-sm'}`}>{valor}</p>
    </div>
  );
}

function Campo({ label, valor, vacio = 'No asignado', grande }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-textMuted text-xs">{label}</span>
      <span className={`text-textSec ${grande ? 'text-lg font-bold text-text' : 'text-sm'}`}>{valor || vacio}</span>
    </div>
  );
}

export default function BuscadorPage() {
  return (
    <Suspense fallback={null}>
      <BuscadorContent />
    </Suspense>
  );
}
