'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Nav from '../../components/Nav';
import AccesoDenegado from '../../components/AccesoDenegado';
import ModalVenta from '../../components/ModalVenta';
import CheckboxVisual from '../../components/CheckboxVisual';
import { useSession } from '../../lib/useSession';
import { tienePermisoBuscador, tienePermisoEditarLead, tienePermisoEditarVenta, tienePermisoEditarContactoEstudiante } from '../../lib/permisos';
import { ORIGENES, ORIGEN_OTRO, CURSOS, CURSO_OTROS, CURSO_SIN_DEFINIR, PAISES, RESULTADOS_CONTACTO, enlaceGmail } from '../../lib/constants';

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
  const fechaTexto = new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const horaTexto = new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return `${fechaTexto}, ${horaTexto}hs`;
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

const CLAVE_BUSQUEDAS_RECIENTES = 'ilce-busquedas-recientes';
const CLAVE_VISTOS_RECIENTES = 'ilce-vistos-recientes';

function guardarBusquedaReciente(texto) {
  try {
    const previas = JSON.parse(localStorage.getItem(CLAVE_BUSQUEDAS_RECIENTES) || '[]');
    const actualizadas = [texto, ...previas.filter((t) => t.toLowerCase() !== texto.toLowerCase())].slice(0, 6);
    localStorage.setItem(CLAVE_BUSQUEDAS_RECIENTES, JSON.stringify(actualizadas));
  } catch (e) { /* ignorar */ }
}
function leerBusquedasRecientes() {
  try { return JSON.parse(localStorage.getItem(CLAVE_BUSQUEDAS_RECIENTES) || '[]'); } catch (e) { return []; }
}
function guardarVisto(item) {
  try {
    const previos = JSON.parse(localStorage.getItem(CLAVE_VISTOS_RECIENTES) || '[]');
    const actualizados = [item, ...previos.filter((p) => p.id !== item.id)].slice(0, 8);
    localStorage.setItem(CLAVE_VISTOS_RECIENTES, JSON.stringify(actualizados));
  } catch (e) { /* ignorar */ }
}
function leerVistosRecientes() {
  try { return JSON.parse(localStorage.getItem(CLAVE_VISTOS_RECIENTES) || '[]'); } catch (e) { return []; }
}

// Resalta en negrita la parte del texto que coincide con la búsqueda.
function Resaltado({ texto, q }) {
  if (!texto || !q) return texto || '';
  const idx = texto.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return texto;
  return (
    <>
      {texto.slice(0, idx)}
      <b className="text-accentTeal">{texto.slice(idx, idx + q.length)}</b>
      {texto.slice(idx + q.length)}
    </>
  );
}

const CHIPS_FILTRO = ['Todos', 'Leads', 'Estudiantes', 'Comprados'];

function TarjetaResultado({ r, q, router }) {
  const tonoEstado = r.estado === 'Comprado' ? 'success' : r.estado === 'Estudiante' ? 'info' : 'warning';
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:border-accentPurple/40 hover:shadow-lg hover:shadow-accentPurple/10">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-bold"><Resaltado texto={r.nombre} q={q} /></p>
        <Badge tono={tonoEstado}>{r.estado}</Badge>
      </div>
      <p className="text-textSec text-xs mb-1">
        <Resaltado texto={r.curso} q={q} />{r.edicion && <> · Edición {r.edicion}</>}
      </p>
      <p className="text-textMuted text-[11px] mb-1">
        {r.responsable && <>Responsable: <Resaltado texto={r.responsable} q={q} /> · </>}
        {r.ultimoContacto ? `Último contacto: ${tiempoRelativo(r.ultimoContacto.fecha)} (${r.ultimoContacto.resultado})` : 'Sin contacto registrado'}
      </p>
      {r.coincidencias?.length > 0 && (
        <p className="text-infoText text-[10.5px] mb-2">🔎 Encontrado en: {r.coincidencias.join(', ')}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap mt-2">
        <Link href={`/buscador?leadId=${r.id}`}
          className="text-xs px-2.5 py-1 rounded-md bg-accentPurple text-white font-semibold">Ver ficha</Link>
        <Link href={`/buscador?leadId=${r.id}&editar=1`}
          className="text-xs px-2.5 py-1 rounded-md bg-surface2 border border-border">Editar</Link>
        <button onClick={() => router.push('/seguimiento')}
          className="text-xs px-2.5 py-1 rounded-md bg-surface2 border border-border">Ir al seguimiento</button>
      </div>
    </div>
  );
}

function BuscadorContent() {
  const { usuario, logout } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qInicial = searchParams.get('q') || '';
  const leadId = searchParams.get('leadId');
  const autoEditar = searchParams.get('editar') === '1';

  const [q, setQ] = useState(qInicial);
  const [origenBuscado, setOrigenBuscado] = useState('');
  const [resultadosPorOrigen, setResultadosPorOrigen] = useState(null);
  const [cargandoPorOrigen, setCargandoPorOrigen] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [ficha, setFicha] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [chipActivo, setChipActivo] = useState('Todos');
  const [busquedasRecientes, setBusquedasRecientes] = useState([]);
  const [vistosRecientes, setVistosRecientes] = useState([]);

  const puedeVer = tienePermisoBuscador(usuario);

  useEffect(() => {
    setBusquedasRecientes(leerBusquedasRecientes());
    setVistosRecientes(leerVistosRecientes());
  }, []);

  useEffect(() => {
    if (!usuario || !puedeVer) return;
    if (leadId) cargarFicha();
  }, [usuario, leadId]);

  // Búsqueda en vivo: apenas hay 2+ caracteres, con un pequeño debounce.
  useEffect(() => {
    if (!usuario || !puedeVer || leadId) return;
    if (q.trim().length < 2) { setResultados([]); return; }
    const t = setTimeout(() => buscar(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q, usuario, leadId]);

  async function buscar(texto) {
    setCargando(true);
    setErrorCarga('');
    try {
      const res = await fetch(`/api/buscador?q=${encodeURIComponent(texto)}&solicitanteEmail=${encodeURIComponent(usuario.email)}`);
      const r = await res.json();
      if (!res.ok || r.error) {
        setErrorCarga(r.error || 'No se pudo buscar. Probá de nuevo.');
        setResultados([]);
      } else {
        setResultados(r.resultados || []);
        guardarBusquedaReciente(texto);
        setBusquedasRecientes(leerBusquedasRecientes());
      }
    } catch (err) {
      setErrorCarga('No se pudo conectar con el servidor. Probá de nuevo.');
      setResultados([]);
    }
    setCargando(false);
  }

  async function buscarPorOrigen(origen) {
    setOrigenBuscado(origen);
    if (!origen) { setResultadosPorOrigen(null); return; }
    setCargandoPorOrigen(true);
    const r = await fetch(`/api/buscador?origen=${encodeURIComponent(origen)}&solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((res) => res.json());
    setResultadosPorOrigen(r.porOrigen || []);
    setCargandoPorOrigen(false);
  }

  async function cargarFicha() {
    setCargando(true);
    setErrorCarga('');
    try {
      const res = await fetch(`/api/buscador?leadId=${encodeURIComponent(leadId)}&solicitanteEmail=${encodeURIComponent(usuario.email)}`);
      const r = await res.json();
      if (!res.ok || r.error) {
        setErrorCarga(r.error || 'No se pudo cargar esta ficha. Probá de nuevo.');
        setFicha(null);
      } else {
        setFicha(r);
        if (r.lead) {
          guardarVisto({ id: r.lead.ID, nombre: `${r.lead.Nombre} ${r.lead.Apellido}`, curso: r.lead.Curso || 'sin curso', fecha: new Date().toISOString() });
        }
      }
    } catch (err) {
      setErrorCarga('No se pudo conectar con el servidor. Probá de nuevo.');
      setFicha(null);
    }
    setCargando(false);
  }

  const resultadosFiltrados = resultados.filter((r) => {
    if (chipActivo === 'Todos') return true;
    if (chipActivo === 'Leads') return r.estado === 'Lead';
    if (chipActivo === 'Estudiantes') return r.estado === 'Estudiante';
    if (chipActivo === 'Comprados') return r.estado === 'Comprado' || r.estado === 'Estudiante';
    return true;
  });

  if (!usuario) return null;

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      {!puedeVer ? (
        <AccesoDenegado seccion="Buscador" />
      ) : (
      <div className="max-w-5xl mx-auto px-6 pb-16">
        {!leadId && (
          <>
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, email, WhatsApp, curso, edición, país, observaciones…"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:border-accentTeal"
            />

            <div className="flex items-center gap-2 mb-4">
              <span className="text-textMuted text-xs shrink-0">📊 Ver todos los leads históricos por origen:</span>
              <select value={origenBuscado} onChange={(e) => buscarPorOrigen(e.target.value)}
                className="bg-bg border border-border rounded-lg px-2.5 py-1.5 text-xs">
                <option value="">Elegir origen…</option>
                {ORIGENES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {origenBuscado && (
              <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
                <p className="text-sm font-semibold mb-3">
                  "{origenBuscado}" {resultadosPorOrigen && `— ${resultadosPorOrigen.length} lead${resultadosPorOrigen.length !== 1 ? 's' : ''} históricamente`}
                </p>
                {cargandoPorOrigen ? (
                  <p className="text-textSec text-sm">Cargando…</p>
                ) : resultadosPorOrigen?.length === 0 ? (
                  <p className="text-textMuted text-sm">Sin leads con este origen.</p>
                ) : (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-surface z-10">
                        <tr className="text-textSec text-left border-b border-border">
                          <th className="py-1.5 pr-3">Nombre</th><th className="pr-3">Curso</th>
                          <th className="pr-3">Fecha de ingreso</th><th className="pr-3">Estado</th><th>Cargado por</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultadosPorOrigen?.map((r) => (
                          <tr key={r.id} className="border-b border-border last:border-b-0">
                            <td className="py-1.5 pr-3">
                              <Link href={`/buscador?leadId=${r.id}`} className="hover:text-accentTeal hover:underline">{r.nombre}</Link>
                            </td>
                            <td className="pr-3 text-textSec">{r.curso}</td>
                            <td className="pr-3 text-textSec whitespace-nowrap">{new Date(r.fechaIngreso).toLocaleDateString('es-AR')}</td>
                            <td className="pr-3">
                              <span className={`text-[11px] px-2 py-0.5 rounded-full ${r.estado === 'Comprado' ? 'bg-successBg text-successText' : 'bg-surface2 text-textMuted'}`}>{r.estado}</span>
                            </td>
                            <td className="text-textSec whitespace-nowrap">{r.cargadoPorNombre || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {q.trim().length >= 2 && (
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {CHIPS_FILTRO.map((c) => (
                  <button key={c} onClick={() => setChipActivo(c)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      chipActivo === c ? 'bg-accentPurple border-accentPurple text-white' : 'bg-surface2 border-border text-textSec hover:text-text'
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {errorCarga && (
          <div className="bg-dangerBg border border-dangerText/30 rounded-2xl p-6 text-center mb-4">
            <p className="text-dangerText text-sm font-semibold mb-3">⚠️ {errorCarga}</p>
            <button onClick={() => (leadId ? cargarFicha() : buscar(q))} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold">
              Reintentar
            </button>
          </div>
        )}

        {cargando && <p className="text-textSec text-sm">Cargando…</p>}

        {!leadId && !cargando && q.trim().length < 2 && (
          <div className="space-y-5">
            {busquedasRecientes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-textSec mb-2">Últimas búsquedas</p>
                <div className="flex flex-wrap gap-2">
                  {busquedasRecientes.map((b) => (
                    <button key={b} onClick={() => setQ(b)}
                      className="text-xs px-3 py-1.5 rounded-full bg-surface2 border border-border text-textSec hover:text-text">
                      🔍 {b}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-textSec mb-2">👁️ Últimos alumnos vistos</p>
              {vistosRecientes.length === 0 ? (
                <p className="text-textMuted text-xs">Todavía no viste ninguna ficha.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-2">
                  {vistosRecientes.map((v) => (
                    <Link key={v.id} href={`/buscador?leadId=${v.id}`}
                      className="text-left bg-surface border border-border rounded-xl p-3 hover:border-accentTeal transition-colors block">
                      <p className="text-sm font-semibold">{v.nombre}</p>
                      <p className="text-textMuted text-[11px]">{v.curso} · {tiempoRelativo(v.fecha)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!leadId && !cargando && q.trim().length >= 2 && (
          resultadosFiltrados.length === 0 ? (
            <p className="text-textMuted text-sm">Sin resultados para "{q}".</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {resultadosFiltrados.map((r) => (
                <TarjetaResultado key={r.id} r={r} q={q} router={router} />
              ))}
            </div>
          )
        )}

        {leadId && ficha && !cargando && (
          <Ficha ficha={ficha} usuario={usuario} onActualizar={cargarFicha} autoEditar={autoEditar} />
        )}
      </div>
      )}
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
  const router = useRouter();
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
  const puedeEditarSoloContacto = !puedeEditar && tienePermisoEditarContactoEstudiante(usuario, lead);
  const [soloContacto, setSoloContacto] = useState(false);
  const puedeDeshacer = usuario?.roles?.includes('Admin') || usuario?.roles?.includes('Coordinador');
  const [deshaciendo, setDeshaciendo] = useState(null);
  const [registrandoResultadoLote, setRegistrandoResultadoLote] = useState(null);
  const [programandoLote, setProgramandoLote] = useState(null);
  const [fechaAProgramar, setFechaAProgramar] = useState('');
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);
  const [mostrarFormBaja, setMostrarFormBaja] = useState(false);
  const [confirmarEliminarLead, setConfirmarEliminarLead] = useState(false);
  const [eliminandoLead, setEliminandoLead] = useState(false);

  async function eliminarLead(forzar) {
    setEliminandoLead(true);
    await fetch('/api/leads', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadIds: [lead.ID], forzar: !!forzar, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setEliminandoLead(false);
    setConfirmarEliminarLead(false);
    router.push('/buscador');
  }
  const [fechaBaja, setFechaBaja] = useState(new Date().toISOString().slice(0, 10));
  const [motivoBaja, setMotivoBaja] = useState('');
  const [guardandoBaja, setGuardandoBaja] = useState(false);
  const bajaExistente = seguimiento.find((s) => s.Lote === 'baja');

  async function registrarBaja() {
    setGuardandoBaja(true);
    await fetch('/api/seguimiento', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'dar_baja', leadId: lead.ID, fechaBaja, motivo: motivoBaja.trim(),
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    setGuardandoBaja(false);
    setMostrarFormBaja(false);
    onActualizar?.();
  }

  async function confirmarVentaDesdeFicha(datosVenta) {
    await fetch('/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...datosVenta, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setMostrarModalVenta(false);
    onActualizar?.();
  }

  async function programarFecha(lote) {
    await fetch('/api/seguimiento', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'programar', leadId: lead.ID, lote, fechaProgramada: fechaAProgramar,
        nombreLead: `${lead.Nombre} ${lead.Apellido}`, cursoLead: lead.Curso || '',
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    setProgramandoLote(null);
    onActualizar?.();
  }

  async function deshacerResultado(lote) {
    setDeshaciendo(lote);
    await fetch('/api/seguimiento', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'deshacer', leadId: lead.ID, lote,
        nombreLead: `${lead.Nombre} ${lead.Apellido}`, cursoLead: lead.Curso || '',
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    setDeshaciendo(null);
    onActualizar?.();
  }

  // Registra un resultado (ej: "Ficha enviada") directo desde la ficha, sin tener que ir a
  // Seguimiento — misma acción 'contactar' que ya usa el listado de lotes.
  async function registrarResultadoRapido(lote, resultado) {
    setRegistrandoResultadoLote(lote);
    await fetch('/api/seguimiento', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'contactar', leadId: lead.ID, lote, resultado, observaciones: '', proximaAccion: '',
        nombreLead: `${lead.Nombre} ${lead.Apellido}`, cursoLead: lead.Curso || '',
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    setRegistrandoResultadoLote(null);
    onActualizar?.();
  }
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
    const cuerpo = soloContacto
      ? { leadId: lead.ID, nombre: datos.nombre, whatsapp: datos.whatsapp, email: datos.email }
      : {
          leadId: lead.ID, nombre: datos.nombre, whatsapp: datos.whatsapp, email: datos.email,
          instagram: datos.instagram, pais: datos.pais,
          curso: datos.curso === CURSO_SIN_DEFINIR ? '' : datos.curso === CURSO_OTROS ? datos.cursoPersonalizado.trim() : datos.curso,
          origen: datos.origen
        };
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cuerpo, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
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

  const puedeEditarVenta = tienePermisoEditarVenta(usuario);
  const [editandoVenta, setEditandoVenta] = useState(false);
  const [datosVenta, setDatosVenta] = useState({
    montoTotal: lead.MontoTotal || '', medioPago: lead.MedioPago || '', modalidad: lead.Modalidad || '',
    edicion: lead.Edicion || '', docentes: lead.Docentes || '', vendidoPor: lead.VendidoPorNombre || ''
  });
  const [guardandoVenta, setGuardandoVenta] = useState(false);

  function actualizarDatoVenta(campo, valor) {
    setDatosVenta((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardarEdicionVenta() {
    setGuardandoVenta(true);
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: lead.ID, ...datosVenta,
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    setGuardandoVenta(false);
    setEditandoVenta(false);
    onActualizar?.();
  }

  function cancelarEdicionVenta() {
    setDatosVenta({
      montoTotal: lead.MontoTotal || '', medioPago: lead.MedioPago || '', modalidad: lead.Modalidad || '',
      edicion: lead.Edicion || '', docentes: lead.Docentes || '', vendidoPor: lead.VendidoPorNombre || ''
    });
    setEditandoVenta(false);
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
              <a href={enlaceGmail(lead.EmailEstudiante)} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg bg-surface2 border border-border">✉ Email</a>
            )}
            {lead.WhatsApp && (
              <a href={`tel:${whatsappLimpio}`} className="text-xs px-3 py-1.5 rounded-lg bg-surface2 border border-border">📞 Llamar</a>
            )}
            {lead.Estado !== 'Comprado' && (
              <button onClick={() => setMostrarModalVenta(true)} className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-accentPurple to-accentMagenta text-white font-semibold">💰 Marcar venta</button>
            )}
            {puedeEditar && !editando && (
              <button onClick={() => { setSoloContacto(false); setEditando(true); }} className="text-xs px-3 py-1.5 rounded-lg bg-accentPurple text-white font-semibold">✏️ Editar</button>
            )}
            {puedeEditarSoloContacto && !editando && (
              <button onClick={() => { setSoloContacto(true); setEditando(true); }} className="text-xs px-3 py-1.5 rounded-lg bg-accentPurple text-white font-semibold">✏️ Editar contacto</button>
            )}
            {usuario.roles?.includes('Admin') && (
              <button onClick={() => setConfirmarEliminarLead(true)} className="text-xs px-3 py-1.5 rounded-lg bg-dangerBg text-dangerText font-semibold">🗑 Eliminar</button>
            )}
          </div>
        </div>

        {confirmarEliminarLead && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-surface2 border border-border rounded-2xl p-6 w-96">
              <p className="text-sm font-semibold mb-2">¿Eliminar a {lead.Nombre} {lead.Apellido}?</p>
              <p className="text-textMuted text-xs mb-4">
                {lead.Estado === 'Comprado'
                  ? (usuario.roles?.includes('Admin')
                      ? '⚠️ Este lead tiene una venta confirmada. Por seguridad está protegido — pero como Admin podés eliminarlo igual si estás seguro. Esta acción no se puede deshacer.'
                      : 'Este lead tiene una venta confirmada — no se puede eliminar, está protegido.')
                  : 'Se borra el lead y todo su historial de seguimiento. Esta acción no se puede deshacer.'}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmarEliminarLead(false)} className="text-xs px-3 py-2 rounded-lg bg-surface border border-border flex-1">Cancelar</button>
                {lead.Estado !== 'Comprado' ? (
                  <button onClick={() => eliminarLead(false)} disabled={eliminandoLead}
                    className="text-xs px-3 py-2 rounded-lg bg-dangerText text-white font-semibold flex-1 disabled:opacity-60">
                    {eliminandoLead ? 'Eliminando…' : 'Sí, eliminar'}
                  </button>
                ) : usuario.roles?.includes('Admin') && (
                  <button onClick={() => eliminarLead(true)} disabled={eliminandoLead}
                    className="text-xs px-3 py-2 rounded-lg bg-dangerText text-white font-semibold flex-1 disabled:opacity-60">
                    {eliminandoLead ? 'Eliminando…' : 'Eliminar igual (tiene venta)'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

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
              {!soloContacto && (
                <>
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
                </>
              )}
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
        <Kpi label="Monto" valor={lead.MontoTotal && !Number.isNaN(Number(lead.MontoTotal)) ? `$${Number(lead.MontoTotal).toLocaleString('es-AR')}` : '—'} grande={!!lead.MontoTotal} />
        <Kpi label="Curso" valor={lead.Curso || 'Sin definir'} />
        <Kpi label="Edición" valor={inscrito?.Edicion || '—'} />
      </div>

      {/* BARRA DE PROGRESO */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-1 flex-wrap">
          {pasos.map((p, i) => (
            <div key={p.label} className="flex items-center gap-1">
              <span className={`text-xs px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${p.ok ? 'bg-successBg text-successText' : 'bg-surface2 text-textMuted'}`}>
                <CheckboxVisual marcado={p.ok} tamano={12} /> {p.label}
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
          {(() => {
            const conFecha = seguimiento.filter((s) => s.FechaProgramada && s.Contactado !== 'TRUE');
            if (conFecha.length === 0) return null;
            const yaDisponible = conFecha.filter((s) => new Date(s.FechaProgramada) <= new Date());
            const proximaFecha = [...conFecha].sort((a, b) => new Date(a.FechaProgramada) - new Date(b.FechaProgramada))[0];
            return (
              <div className={`rounded-lg px-3 py-2 mb-3 text-sm ${yaDisponible.length > 0 ? 'bg-warningBg text-warningText' : 'bg-infoBg text-infoText'}`}>
                {yaDisponible.length > 0
                  ? `📅 Ya está en el "LOTE PROGRAMADO" de Seguimiento desde el ${new Date(yaDisponible[0].FechaProgramada).toLocaleDateString('es-AR')}.`
                  : `📅 Va a aparecer en el "LOTE PROGRAMADO" de Seguimiento el ${new Date(proximaFecha.FechaProgramada).toLocaleDateString('es-AR')}.`}
              </div>
            );
          })()}
          {seguimiento.length === 0 ? <p className="text-textMuted text-sm">Sin seguimiento comercial.</p> : (
            seguimiento.map((s) => (
              <div key={s.Lote} className="flex items-center justify-between gap-3 mb-1.5 flex-wrap">
                <p className="text-sm text-textSec">
                  Lote {s.Lote}: {s.Contactado === 'TRUE'
                    ? `${s.Resultado} (${tiempoRelativo(s.FechaContacto)}) — responsable: ${s.AsignadoANombre || 'No asignado'}`
                    : `Pendiente — asignado a: ${s.AsignadoANombre || 'No asignado'}`}
                  {s.FechaProgramada && (
                    <span className="text-infoText"> · 📅 Programado para el {new Date(s.FechaProgramada).toLocaleDateString('es-AR')}</span>
                  )}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  {s.Contactado !== 'TRUE' && (
                    <>
                    <button onClick={() => registrarResultadoRapido(s.Lote, 'Ficha enviada')}
                      disabled={registrandoResultadoLote === s.Lote}
                      className="text-xs px-2.5 py-1 rounded-md bg-accentPurple text-white font-semibold disabled:opacity-60">
                      {registrandoResultadoLote === s.Lote ? '…' : '📄 Ficha enviada'}
                    </button>
                    <select value="" disabled={registrandoResultadoLote === s.Lote}
                      onChange={(e) => e.target.value && registrarResultadoRapido(s.Lote, e.target.value)}
                      className="bg-surface2 border border-border rounded-md px-2 py-1 text-xs">
                      <option value="" disabled>Otro resultado…</option>
                      {RESULTADOS_CONTACTO.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    </>
                  )}
                  {s.Contactado !== 'TRUE' && (
                    programandoLote === s.Lote ? (
                      <>
                        <input type="date" value={fechaAProgramar} onChange={(e) => setFechaAProgramar(e.target.value)}
                          className="bg-bg border border-border rounded px-2 py-1 text-xs" />
                        <button onClick={() => programarFecha(s.Lote)} className="text-xs text-accentTeal font-semibold">Guardar</button>
                        <button onClick={() => setProgramandoLote(null)} className="text-xs text-textMuted">Cancelar</button>
                      </>
                    ) : (
                      <button onClick={() => { setProgramandoLote(s.Lote); setFechaAProgramar(s.FechaProgramada || ''); }}
                        className="text-xs text-infoText font-semibold">📅 {s.FechaProgramada ? 'Cambiar fecha' : 'Programar contacto'}</button>
                    )
                  )}
                  {s.Contactado === 'TRUE' && puedeDeshacer && (
                    <button onClick={() => deshacerResultado(s.Lote)} disabled={deshaciendo === s.Lote}
                      className="text-xs text-warningText font-semibold">
                      {deshaciendo === s.Lote ? 'Deshaciendo…' : '↩ Deshacer'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          <p className="text-textMuted text-[11px] mt-2">
            "Deshacer" vuelve ese lote a pendiente — útil si se registró un resultado por error (ej: "Pago recibido" sin que corresponda). El lead vuelve a aparecer en Seguimiento.
          </p>
        </div>
      )}

      {tab === 'Venta' && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-textMuted uppercase tracking-wide">Venta</p>
            {lead.Estado === 'Comprado' && puedeEditarVenta && !editandoVenta && (
              <button onClick={() => setEditandoVenta(true)} className="text-accentTeal text-xs font-semibold">✏️ Editar</button>
            )}
          </div>
          {lead.Estado !== 'Comprado' ? (
            <p className="text-textMuted text-sm">Sin seguimiento comercial — todavía no se registró una venta.</p>
          ) : !editandoVenta ? (
            <>
              <Campo label="Monto" valor={lead.MontoTotal && !Number.isNaN(Number(lead.MontoTotal)) ? `$${Number(lead.MontoTotal).toLocaleString('es-AR')}` : null} vacio="—" grande />
              <Campo label="Forma de pago" valor={lead.MedioPago} />
              <Campo label="Modalidad" valor={lead.Modalidad} />
              {lead.DetalleCuotas && <Campo label="Detalle de cuotas" valor={`$${lead.DetalleCuotas}`} />}
              <Campo label="Vendedor" valor={lead.VendidoPorNombre} vacio="No especificado" />
              <Campo label="Fecha" valor={lead.FechaVenta ? fechaLarga(lead.FechaVenta) : null} vacio="—" />
              {lead.Docentes && <Campo label="Docente(s)" valor={lead.Docentes} />}
            </>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-textSec block mb-1">Monto</label>
                  <input type="text" inputMode="numeric" value={datosVenta.montoTotal}
                    onChange={(e) => actualizarDatoVenta('montoTotal', e.target.value.replace(/\./g, ''))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-textSec block mb-1">Forma de pago</label>
                  <input value={datosVenta.medioPago} onChange={(e) => actualizarDatoVenta('medioPago', e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-textSec block mb-1">Modalidad</label>
                  <input value={datosVenta.modalidad} onChange={(e) => actualizarDatoVenta('modalidad', e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-textSec block mb-1">Vendedor</label>
                  <input value={datosVenta.vendidoPor} onChange={(e) => actualizarDatoVenta('vendidoPor', e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-textSec block mb-1">Edición</label>
                  <input value={datosVenta.edicion} onChange={(e) => actualizarDatoVenta('edicion', e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-textSec block mb-1">Docente(s)</label>
                  <input value={datosVenta.docentes} onChange={(e) => actualizarDatoVenta('docentes', e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <p className="text-textMuted text-[11px] mt-2">
                El detalle de cuotas variables (si lo hay) no se edita desde acá todavía — solo estos campos.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <button onClick={guardarEdicionVenta} disabled={guardandoVenta}
                  className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-1.5 text-sm font-semibold disabled:opacity-60">
                  {guardandoVenta ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button onClick={cancelarEdicionVenta} className="text-textMuted text-sm">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'Alumno' && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-textMuted uppercase tracking-wide mb-3">Estado académico</p>
          {!inscrito ? (
            <p className="text-textMuted text-sm">Sin seguimiento comercial — todavía no es alumno.</p>
          ) : (
            <div className="space-y-2 mb-4">
              <p className="text-sm">{inscrito.AltaPlataforma === 'TRUE' ? '🟢' : '⚪'} Alta en plataforma {inscrito.AltaPlataforma === 'TRUE' && `— ${inscrito.AltaPorNombre}`}</p>
              <p className="text-sm">{inscrito.BienvenidaEnviada === 'TRUE' ? '🟢' : '⚪'} Bienvenida {inscrito.BienvenidaEnviada === 'TRUE' && `— ${inscrito.BienvenidaPorNombre}`}</p>
              <p className="text-sm">{inscrito.Docentes ? '🟢' : '⚪'} Docente(s) {inscrito.Docentes && `— ${inscrito.Docentes}`}</p>
              <p className="text-sm">{inscrito.AbonoTotalidad === 'TRUE' ? '🟢' : '🟡'} Diploma {inscrito.AbonoTotalidad === 'TRUE' ? '(habilitado)' : '(pendiente de pago total)'}</p>
            </div>
          )}

          {bajaExistente ? (
            <div className="border-t border-border pt-4">
              <p className="text-warningText text-sm">🔴 {bajaExistente.Observaciones}</p>
              <p className="text-textMuted text-[11px] mt-1">
                Va a reaparecer en el "LOTE BAJAS" de Seguimiento el {new Date(bajaExistente.FechaVence).toLocaleDateString('es-AR')}.
              </p>
            </div>
          ) : lead.Estado === 'Comprado' && (
            <div className="border-t border-border pt-4">
              {!mostrarFormBaja ? (
                <button onClick={() => setMostrarFormBaja(true)} className="text-xs text-dangerText font-semibold">
                  🔴 Dar de baja de la cursada
                </button>
              ) : (
                <div className="bg-bg border border-border rounded-lg p-3">
                  <p className="text-xs font-semibold mb-2">Registrar baja de la cursada</p>
                  <label className="text-[11px] text-textMuted block mb-1">Fecha de baja</label>
                  <input type="date" value={fechaBaja} onChange={(e) => setFechaBaja(e.target.value)}
                    className="bg-surface2 border border-border rounded px-2 py-1 text-xs mb-2" />
                  <label className="text-[11px] text-textMuted block mb-1">Motivo (opcional)</label>
                  <textarea rows={2} value={motivoBaja} onChange={(e) => setMotivoBaja(e.target.value)}
                    placeholder="Ej: Problemas de horario, motivos personales…"
                    className="w-full bg-surface2 border border-border rounded px-2 py-1.5 text-xs mb-2" />
                  <p className="text-textMuted text-[11px] mb-2">A los 90 días de esta fecha, va a aparecer en el "LOTE BAJAS" de Seguimiento para volver a contactarlo.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setMostrarFormBaja(false)} className="text-xs px-3 py-1 rounded bg-surface2 border border-border">Cancelar</button>
                    <button onClick={registrarBaja} disabled={guardandoBaja}
                      className="text-xs px-3 py-1 rounded bg-dangerText text-white font-semibold disabled:opacity-60">
                      {guardandoBaja ? 'Guardando…' : 'Confirmar baja'}
                    </button>
                  </div>
                </div>
              )}
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
      <ModalVenta lead={mostrarModalVenta ? lead : null} onClose={() => setMostrarModalVenta(false)}
        onConfirm={confirmarVentaDesdeFicha} usuarioActual={usuario} />
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
