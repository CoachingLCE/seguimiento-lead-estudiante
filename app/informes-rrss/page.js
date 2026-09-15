'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav from '../../components/Nav';
import AccesoDenegado from '../../components/AccesoDenegado';
import { useSession } from '../../lib/useSession';
import { tienePermisoInformesRRSS } from '../../lib/permisos';

const PLATAFORMAS = [
  { id: 'instagram', label: 'Instagram', color: 'text-accentMagenta' },
  { id: 'linkedin', label: 'LinkedIn', color: 'text-infoText' },
  { id: 'youtube', label: 'YouTube', color: 'text-dangerText' },
  { id: 'google_business', label: 'Google Business', color: 'text-warningText' },
  { id: 'blog', label: 'Blog', color: 'text-accentTeal' }
];
const TIPOS_PIEZA = ['Reel', 'Carrusel', 'Post', 'Video', 'Artículo', 'Historia'];
const CAMPOS_METRICA = [
  ['followers', 'Seguidores'], ['reach', 'Alcance'], ['impressions', 'Impresiones'],
  ['profileVisits', 'Visitas al perfil'], ['engagementRate', 'Engagement (%)'], ['saves', 'Guardados'],
  ['linkClicks', 'Clics a link'], ['qualifiedLeads', 'Leads calificados']
];
const CAMPOS_ENTERO = ['followers', 'reach', 'impressions', 'profileVisits', 'saves', 'linkClicks', 'qualifiedLeads'];

function mesesDisponibles() {
  const hoy = new Date();
  const meses = [];
  for (let i = 0; i < 13; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return meses;
}
function mesAnteriorDe(mes) {
  const [anio, m] = mes.split('-').map(Number);
  const d = new Date(anio, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
// Devuelve los últimos `cantidad` meses (incluido `mes`), en orden cronológico ascendente —
// para los gráficos de Evolución y para armar el rango del Informe anual.
function ultimosNMeses(mes, cantidad) {
  const [anio, m] = mes.split('-').map(Number);
  const meses = [];
  for (let i = cantidad - 1; i >= 0; i--) {
    const d = new Date(anio, m - 1 - i, 1);
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return meses;
}
function labelCortoDeMes(mes) {
  const [anio, m] = mes.split('-').map(Number);
  return new Date(anio, m - 1, 1).toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
}
function labelDeMes(mes) {
  const [anio, m] = mes.split('-').map(Number);
  const texto = new Date(anio, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
function num(v) {
  return v === '' || v === undefined || v === null ? null : Number(v);
}
function fmt(v) {
  const n = num(v);
  return n === null || Number.isNaN(n) ? '—' : Math.round(n).toLocaleString('es-AR');
}
function fechaHoraAmigable(iso) {
  const fecha = new Date(iso);
  const hoy = new Date();
  const esHoy = fecha.toDateString() === hoy.toDateString();
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  const esAyer = fecha.toDateString() === ayer.toDateString();
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (esHoy) return `Hoy, ${hora}`;
  if (esAyer) return `Ayer, ${hora}`;
  return `${fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}, ${hora}`;
}
// Validación de campos numéricos — se reutiliza igual en el frontend que ya valida el backend,
// así el error se ve antes de mandar el pedido.
function validarEnteroONulo(v) {
  if (v === '' || v === undefined || v === null) return true;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && Number.isInteger(n);
}
function engagementDePieza(p) {
  const views = num(p.Views);
  if (!views || views <= 0) return null;
  const interacciones = (num(p.Likes) || 0) + (num(p.Comments) || 0) + (num(p.Saves) || 0) + (num(p.Shares) || 0);
  return (interacciones / views) * 100;
}
function totalesDeMetricas(metricas) {
  const t = { followers: 0, reach: 0, impressions: 0, profileVisits: 0, qualifiedLeads: 0, engagementSuma: 0, engagementCant: 0 };
  metricas.forEach((m) => {
    t.followers += num(m.Followers) || 0;
    t.reach += num(m.Reach) || 0;
    t.impressions += num(m.Impressions) || 0;
    t.profileVisits += num(m.ProfileVisits) || 0;
    t.qualifiedLeads += num(m.QualifiedLeads) || 0;
    if (num(m.EngagementRate) !== null) { t.engagementSuma += num(m.EngagementRate); t.engagementCant++; }
  });
  t.engagementPromedio = t.engagementCant > 0 ? t.engagementSuma / t.engagementCant : null;
  return t;
}
function Delta({ actual, anterior, esPuntos }) {
  if (anterior === null || anterior === undefined || actual === null || actual === undefined) return null;
  if (esPuntos) {
    const diff = actual - anterior;
    if (Math.abs(diff) < 0.05) return <span className="text-textMuted text-[11px]">= sin cambios</span>;
    return <span className={`text-[11px] font-semibold ${diff > 0 ? 'text-successText' : 'text-dangerText'}`}>{diff > 0 ? '↑' : '↓'} {diff > 0 ? '+' : ''}{diff.toFixed(1)} puntos</span>;
  }
  if (anterior === 0) return null; // división por cero — no se puede mostrar % de crecimiento
  const pct = ((actual - anterior) / anterior) * 100;
  if (Math.abs(pct) < 0.5) return <span className="text-textMuted text-[11px]">= sin cambios</span>;
  return <span className={`text-[11px] font-semibold ${pct > 0 ? 'text-successText' : 'text-dangerText'}`}>{pct > 0 ? '↑' : '↓'} {pct > 0 ? '+' : ''}{pct.toFixed(0)}%</span>;
}
function Skeleton({ h = 'h-24' }) {
  return <div className={`bg-surface2 animate-pulse rounded-2xl ${h}`} />;
}

// Gráfico de línea simple en SVG puro — sin librerías nuevas. "puntos" es un array de números
// (puede tener null para meses sin datos, se saltea al dibujar el trazo).
function GraficoEvolucion({ etiquetas, puntos, color = '#8C52FF', alto = 90 }) {
  const ancho = 560;
  const padY = 14;
  const validos = puntos.filter((p) => p !== null && p !== undefined);
  if (validos.length === 0) {
    return <div className="h-[90px] flex items-center justify-center text-textMuted text-xs">Sin datos para graficar</div>;
  }
  const max = Math.max(...validos, 1);
  const min = Math.min(...validos, 0);
  const rango = max - min || 1;
  const paso = ancho / Math.max(puntos.length - 1, 1);
  const coords = puntos.map((p, i) => {
    if (p === null || p === undefined) return null;
    const x = i * paso;
    const y = alto - padY - ((p - min) / rango) * (alto - padY * 2);
    return [x, y];
  });
  // Se dibuja como varios segmentos (no una sola polyline) para que un mes sin dato no
  // "estire" una línea recta rara entre dos puntos que no son consecutivos de verdad.
  const segmentos = [];
  let actual = [];
  coords.forEach((c, i) => {
    if (c) { actual.push(c); }
    else { if (actual.length > 1) segmentos.push(actual); actual = []; }
  });
  if (actual.length > 1) segmentos.push(actual);

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full" style={{ height: alto }} preserveAspectRatio="none">
      {segmentos.map((seg, i) => (
        <polyline key={i} points={seg.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {coords.map((c, i) => c && (
        <circle key={i} cx={c[0]} cy={c[1]} r="3" fill={color} />
      ))}
    </svg>
  );
}

// Agrupa un array de objetos por clave y devuelve, por cada grupo: cantidad + suma de cada campo
// numérico pedido (para "Rendimiento por tipo de contenido").
function agruparYSumar(items, claveDe, camposSuma) {
  const grupos = {};
  items.forEach((it) => {
    const clave = claveDe(it) || 'Sin definir';
    if (!grupos[clave]) {
      grupos[clave] = { clave, cantidad: 0 };
      camposSuma.forEach((c) => { grupos[clave][c] = 0; });
    }
    grupos[clave].cantidad++;
    camposSuma.forEach((c) => { grupos[clave][c] += it[c] || 0; });
  });
  return Object.values(grupos);
}

export default function InformesRRSSPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();

  const [mes, setMes] = useState('');
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [metricas, setMetricas] = useState([]);
  const [metricasAnterior, setMetricasAnterior] = useState([]);
  const [piezas, setPiezas] = useState([]);
  const [objetivos, setObjetivos] = useState([]);
  const [analisis, setAnalisis] = useState(null);
  const [comentarios, setComentarios] = useState([]);

  const [rangoEvolucion, setRangoEvolucion] = useState(6); // 3, 6 o 12 meses
  const [metricasEvolucion, setMetricasEvolucion] = useState([]);
  const [cargandoEvolucion, setCargandoEvolucion] = useState(false);

  const [vistaAnual, setVistaAnual] = useState(false);
  const [metricasAnuales, setMetricasAnuales] = useState([]);
  const [piezasAnuales, setPiezasAnuales] = useState([]);
  const [cargandoAnual, setCargandoAnual] = useState(false);

  const [aviso, setAviso] = useState(null); // { tipo: 'success'|'error', texto }

  const [editandoPlataforma, setEditandoPlataforma] = useState(null);
  const [formMetrica, setFormMetrica] = useState({});
  const [errorFormMetrica, setErrorFormMetrica] = useState('');
  const [guardandoMetrica, setGuardandoMetrica] = useState(false);

  const [mostrarFormPieza, setMostrarFormPieza] = useState(false);
  const [editandoPieza, setEditandoPieza] = useState(null);
  const [formPieza, setFormPieza] = useState({ plataforma: 'instagram', tipo: 'Reel', titulo: '', views: '', likes: '', comments: '', saves: '', shares: '', leads: '', guion: '', notaIA: '' });
  const [errorFormPieza, setErrorFormPieza] = useState('');
  const [guardandoPieza, setGuardandoPieza] = useState(false);
  const [confirmarBorrarPieza, setConfirmarBorrarPieza] = useState(null);

  const [nuevoObjetivo, setNuevoObjetivo] = useState('');
  const [guardandoObjetivo, setGuardandoObjetivo] = useState(false);

  const [editandoAnalisis, setEditandoAnalisis] = useState(false);
  const [formAnalisis, setFormAnalisis] = useState({ resumen: '', causas: '', propuestas: '' });
  const [errorFormAnalisis, setErrorFormAnalisis] = useState('');
  const [guardandoAnalisis, setGuardandoAnalisis] = useState(false);

  const [textoComentario, setTextoComentario] = useState('');
  const [errorComentario, setErrorComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  const puedeVer = tienePermisoInformesRRSS(usuario);

  function mostrarAviso(tipo, texto) {
    setAviso({ tipo, texto });
    setTimeout(() => setAviso((a) => (a?.texto === texto ? null : a)), 4000);
  }

  // Wrapper de fetch: chequea response.ok, devuelve el JSON o tira con el mensaje del servidor.
  const pedir = useCallback(async (url, opciones) => {
    let res;
    try {
      res = await fetch(url, opciones);
    } catch {
      throw new Error('No se pudo conectar con el servidor. Probá de nuevo.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Ocurrió un error inesperado.');
    return data;
  }, []);

  useEffect(() => {
    if (!usuario) return;
    if (!puedeVer) return; // ya no redirige — la pantalla en sí muestra el mensaje de acceso
    if (!mes) setMes(mesesDisponibles()[0]);
  }, [usuario]);

  useEffect(() => {
    if (usuario && mes) cargarTodo();
  }, [mes, usuario]);

  useEffect(() => {
    if (usuario && mes) cargarEvolucion();
  }, [mes, usuario, rangoEvolucion]);

  useEffect(() => {
    if (usuario && mes && vistaAnual) cargarInformeAnual();
  }, [mes, usuario, vistaAnual]);

  async function cargarEvolucion() {
    setCargandoEvolucion(true);
    try {
      const meses = ultimosNMeses(mes, rangoEvolucion);
      const r = await pedir(`/api/informes-rrss/metricas?desde=${meses[0]}&hasta=${meses[meses.length - 1]}&solicitanteEmail=${encodeURIComponent(usuario.email)}`);
      setMetricasEvolucion(r.metricas || []);
    } catch {
      setMetricasEvolucion([]);
    }
    setCargandoEvolucion(false);
  }

  async function cargarInformeAnual() {
    setCargandoAnual(true);
    try {
      const anio = mes.slice(0, 4);
      const [rMet, rPiezas] = await Promise.all([
        pedir(`/api/informes-rrss/metricas?desde=${anio}-01&hasta=${anio}-12&solicitanteEmail=${encodeURIComponent(usuario.email)}`),
        pedir(`/api/informes-rrss/piezas?desde=${anio}-01&hasta=${anio}-12&solicitanteEmail=${encodeURIComponent(usuario.email)}`)
      ]);
      setMetricasAnuales(rMet.metricas || []);
      setPiezasAnuales(rPiezas.piezas || []);
    } catch {
      setMetricasAnuales([]); setPiezasAnuales([]);
    }
    setCargandoAnual(false);
  }

  async function cargarTodo() {
    setCargando(true);
    setErrorCarga('');
    const qs = `mes=${mes}&solicitanteEmail=${encodeURIComponent(usuario.email)}`;
    const qsAnterior = `mes=${mesAnteriorDe(mes)}&solicitanteEmail=${encodeURIComponent(usuario.email)}`;
    try {
      const [rMetricas, rMetricasAnt, rPiezas, rObjetivos, rAnalisis, rComentarios] = await Promise.all([
        pedir(`/api/informes-rrss/metricas?${qs}`),
        pedir(`/api/informes-rrss/metricas?${qsAnterior}`),
        pedir(`/api/informes-rrss/piezas?${qs}`),
        pedir(`/api/informes-rrss/objetivos?${qs}`),
        pedir(`/api/informes-rrss/analisis?${qs}`),
        pedir(`/api/informes-rrss/comentarios?${qs}`)
      ]);
      setMetricas(rMetricas.metricas || []);
      setMetricasAnterior(rMetricasAnt.metricas || []);
      setPiezas(rPiezas.piezas || []);
      setObjetivos(rObjetivos.objetivos || []);
      setAnalisis(rAnalisis.analisis || null);
      setFormAnalisis(rAnalisis.analisis ? {
        resumen: rAnalisis.analisis.resumen, causas: rAnalisis.analisis.causas, propuestas: rAnalisis.analisis.propuestas
      } : { resumen: '', causas: '', propuestas: '' });
      setComentarios(rComentarios.comentarios || []);
    } catch (err) {
      setErrorCarga(err.message);
    }
    setCargando(false);
  }

  // ---------- MÉTRICAS ----------
  function abrirEdicionMetrica(plataformaId) {
    const actual = metricas.find((m) => m.Plataforma === plataformaId);
    setFormMetrica({
      followers: actual?.Followers ?? '', reach: actual?.Reach ?? '', impressions: actual?.Impressions ?? '',
      profileVisits: actual?.ProfileVisits ?? '', engagementRate: actual?.EngagementRate ?? '',
      saves: actual?.Saves ?? '', linkClicks: actual?.LinkClicks ?? '', qualifiedLeads: actual?.QualifiedLeads ?? ''
    });
    setErrorFormMetrica('');
    setEditandoPlataforma(plataformaId);
  }

  function validarFormMetrica() {
    for (const [campo, label] of CAMPOS_METRICA) {
      if (campo === 'engagementRate') continue;
      if (!validarEnteroONulo(formMetrica[campo])) return `"${label}" tiene que ser un número entero de 0 para arriba.`;
    }
    const eng = formMetrica.engagementRate;
    if (eng !== '' && eng !== undefined) {
      const n = Number(eng);
      if (!Number.isFinite(n) || n < 0 || n > 100) return 'El engagement tiene que ser un número entre 0 y 100.';
    }
    return '';
  }

  async function guardarMetrica() {
    const err = validarFormMetrica();
    if (err) { setErrorFormMetrica(err); return; }
    setErrorFormMetrica('');
    setGuardandoMetrica(true);
    try {
      await pedir('/api/informes-rrss/metricas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes, plataforma: editandoPlataforma, ...formMetrica, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
      });
      setEditandoPlataforma(null);
      mostrarAviso('success', '✓ Cambios guardados correctamente');
      cargarTodo();
    } catch (err2) {
      setErrorFormMetrica(err2.message); // el formulario queda abierto, no se pierde lo cargado
    }
    setGuardandoMetrica(false);
  }

  // ---------- PIEZAS ----------
  function abrirNuevaPieza() {
    setEditandoPieza(null);
    setFormPieza({ plataforma: 'instagram', tipo: 'Reel', titulo: '', views: '', likes: '', comments: '', saves: '', shares: '', leads: '', guion: '', notaIA: '' });
    setErrorFormPieza('');
    setMostrarFormPieza(true);
  }
  function abrirEdicionPieza(p) {
    setEditandoPieza(p);
    setFormPieza({
      plataforma: p.Plataforma || 'instagram', tipo: p.Tipo || 'Reel', titulo: p.Titulo || '',
      views: p.Views ?? '', likes: p.Likes ?? '', comments: p.Comments ?? '', saves: p.Saves ?? '', shares: p.Shares ?? '', leads: p.Leads ?? '',
      guion: p.Guion || '', notaIA: p.NotaIA || ''
    });
    setErrorFormPieza('');
    setMostrarFormPieza(true);
  }
  function validarFormPieza() {
    if (!formPieza.titulo.trim()) return 'Falta el título.';
    for (const campo of ['views', 'likes', 'comments', 'saves', 'shares', 'leads']) {
      if (!validarEnteroONulo(formPieza[campo])) return `El campo "${campo}" tiene que ser un número entero de 0 para arriba.`;
    }
    return '';
  }
  async function guardarPieza() {
    const err = validarFormPieza();
    if (err) { setErrorFormPieza(err); return; }
    setErrorFormPieza('');
    setGuardandoPieza(true);
    const cuerpo = { mes, ...formPieza, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre };
    try {
      if (editandoPieza) {
        await pedir('/api/informes-rrss/piezas', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...cuerpo, piezaId: editandoPieza.PiezaID, rowIndex: editandoPieza._rowIndex })
        });
      } else {
        await pedir('/api/informes-rrss/piezas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
      }
      setMostrarFormPieza(false);
      mostrarAviso('success', '✓ Pieza guardada correctamente');
      cargarTodo();
    } catch (err2) {
      setErrorFormPieza(err2.message);
    }
    setGuardandoPieza(false);
  }
  async function borrarPieza(p) {
    try {
      await pedir('/api/informes-rrss/piezas', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piezaId: p.PiezaID, rowIndex: p._rowIndex, titulo: p.Titulo, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
      });
      setConfirmarBorrarPieza(null);
      mostrarAviso('success', '✓ Pieza eliminada');
      cargarTodo();
    } catch (err) {
      setConfirmarBorrarPieza(null);
      mostrarAviso('error', `✕ ${err.message}`);
    }
  }

  // ---------- OBJETIVOS ----------
  async function agregarObjetivo() {
    if (!nuevoObjetivo.trim()) return;
    setGuardandoObjetivo(true);
    try {
      await pedir('/api/informes-rrss/objetivos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes, texto: nuevoObjetivo.trim(), solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
      });
      setNuevoObjetivo('');
      cargarTodo();
    } catch (err) {
      mostrarAviso('error', `✕ ${err.message}`);
    }
    setGuardandoObjetivo(false);
  }
  async function toggleObjetivo(o) {
    const cumplidoNuevo = o.Cumplido !== 'TRUE';
    setObjetivos((prev) => prev.map((x) => (x._rowIndex === o._rowIndex ? { ...x, Cumplido: cumplidoNuevo ? 'TRUE' : 'FALSE' } : x)));
    try {
      await pedir('/api/informes-rrss/objetivos', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: o._rowIndex, cumplido: cumplidoNuevo, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
      });
    } catch (err) {
      mostrarAviso('error', `✕ ${err.message}`);
      cargarTodo();
    }
  }
  async function borrarObjetivo(o) {
    try {
      await pedir('/api/informes-rrss/objetivos', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: o._rowIndex, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
      });
      cargarTodo();
    } catch (err) {
      mostrarAviso('error', `✕ ${err.message}`);
    }
  }

  // ---------- ANÁLISIS ----------
  async function guardarAnalisis() {
    setErrorFormAnalisis('');
    setGuardandoAnalisis(true);
    try {
      await pedir('/api/informes-rrss/analisis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes, ...formAnalisis, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
      });
      setEditandoAnalisis(false);
      mostrarAviso('success', '✓ Cambios guardados correctamente');
      cargarTodo();
    } catch (err) {
      setErrorFormAnalisis(err.message);
    }
    setGuardandoAnalisis(false);
  }

  // ---------- COMENTARIOS ----------
  async function enviarComentario() {
    if (!textoComentario.trim()) return;
    setErrorComentario('');
    setEnviandoComentario(true);
    try {
      await pedir('/api/informes-rrss/comentarios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes, texto: textoComentario.trim(), solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
      });
      setTextoComentario(''); // solo se limpia si salió bien
      cargarTodo();
    } catch (err) {
      setErrorComentario(err.message); // el texto escrito NO se pierde
    }
    setEnviandoComentario(false);
  }

  if (!usuario) return null;

  const plataformasConDatos = PLATAFORMAS.filter((p) =>
    ['instagram', 'linkedin', 'youtube'].includes(p.id) || metricas.some((m) => m.Plataforma === p.id)
  );
  const totales = totalesDeMetricas(metricas);
  const totalesAnterior = totalesDeMetricas(metricasAnterior);
  const hayDatosMesAnterior = metricasAnterior.length > 0;

  const piezasConEngagement = piezas.map((p) => ({ ...p, _engagement: engagementDePieza(p) }));
  const mejorPieza = piezasConEngagement.filter((p) => p._engagement !== null).sort((a, b) => b._engagement - a._engagement)[0] || null;

  // ---------- ALERTAS AUTOMÁTICAS (a partir de los mismos deltas que ya se calculan arriba) ----------
  function calcularAlertas() {
    if (!hayDatosMesAnterior) return [];
    const alertas = [];
    function evaluar(label, actual, anterior, umbral = 10) {
      if (actual === null || anterior === null || anterior === 0) return;
      const pct = ((actual - anterior) / anterior) * 100;
      if (pct >= umbral) alertas.push({ tono: 'success', texto: `${label} +${pct.toFixed(0)}%` });
      else if (pct <= -umbral) alertas.push({ tono: 'danger', texto: `${label} ${pct.toFixed(0)}%` });
      else if (Math.abs(pct) < 1) alertas.push({ tono: 'warning', texto: `${label} sin crecimiento` });
    }
    evaluar('Seguidores', totales.followers, totalesAnterior.followers, 3);
    evaluar('Alcance', totales.reach, totalesAnterior.reach);
    evaluar('Leads calificados', totales.qualifiedLeads, totalesAnterior.qualifiedLeads);
    if (totales.engagementPromedio !== null && totalesAnterior.engagementPromedio !== null && totalesAnterior.engagementPromedio > 0) {
      const diff = totales.engagementPromedio - totalesAnterior.engagementPromedio;
      if (diff <= -1) alertas.push({ tono: 'danger', texto: `Engagement ${diff.toFixed(1)} puntos` });
      else if (diff >= 1) alertas.push({ tono: 'success', texto: `Engagement +${diff.toFixed(1)} puntos` });
    }
    return alertas;
  }
  const alertas = calcularAlertas();

  // ---------- TOP CONTENIDOS DEL MES ----------
  function topPor(campo) {
    return piezasConEngagement.filter((p) => num(p[campo]) !== null && num(p[campo]) > 0)
      .sort((a, b) => num(b[campo]) - num(a[campo]))[0] || null;
  }
  const topContenidos = [
    ['👁 Mayor alcance', topPor('Views'), 'Views'],
    ['🔥 Mayor engagement', piezasConEngagement.filter((p) => p._engagement !== null).sort((a, b) => b._engagement - a._engagement)[0], '_engagement'],
    ['🔁 Más compartidos', topPor('Shares'), 'Shares'],
    ['🔖 Más guardados', topPor('Saves'), 'Saves'],
    ['🎯 Más leads', topPor('Leads'), 'Leads']
  ].filter(([, pieza]) => pieza);

  // ---------- RENDIMIENTO POR TIPO DE CONTENIDO ----------
  const piezasNumericas = piezas.map((p) => ({
    tipo: p.Tipo, views: num(p.Views) || 0, leads: num(p.Leads) || 0, engagement: engagementDePieza(p)
  }));
  const rendimientoPorTipo = agruparYSumar(piezasNumericas, (p) => p.tipo, ['views', 'leads'])
    .map((g) => {
      const delTipo = piezasNumericas.filter((p) => (p.tipo || 'Sin definir') === g.clave && p.engagement !== null);
      const engagementProm = delTipo.length ? delTipo.reduce((a, p) => a + p.engagement, 0) / delTipo.length : null;
      return { ...g, alcancePromedio: g.cantidad ? g.views / g.cantidad : 0, engagementProm };
    })
    .sort((a, b) => b.cantidad - a.cantidad);

  // ---------- ANÁLISIS AUTOMÁTICO (texto generado solo a partir de los datos cargados) ----------
  function analisisAutomatico() {
    const frases = [];
    if (hayDatosMesAnterior) {
      if (totalesAnterior.reach > 0) {
        const pctReach = ((totales.reach - totalesAnterior.reach) / totalesAnterior.reach) * 100;
        if (Math.abs(pctReach) >= 1) frases.push(`El alcance ${pctReach > 0 ? 'aumentó' : 'disminuyó'} ${Math.abs(pctReach).toFixed(0)}% respecto del mes anterior.`);
      }
      if (totalesAnterior.qualifiedLeads > 0) {
        const pctLeads = ((totales.qualifiedLeads - totalesAnterior.qualifiedLeads) / totalesAnterior.qualifiedLeads) * 100;
        if (Math.abs(pctLeads) >= 1) frases.push(`Los leads calificados ${pctLeads > 0 ? 'subieron' : 'bajaron'} ${Math.abs(pctLeads).toFixed(0)}%.`);
      }
    }
    if (rendimientoPorTipo.length >= 2) {
      const conEngagement = rendimientoPorTipo.filter((t) => t.engagementProm !== null).sort((a, b) => b.engagementProm - a.engagementProm);
      const conLeads = [...rendimientoPorTipo].sort((a, b) => b.leads - a.leads);
      if (conEngagement.length >= 2) {
        frases.push(`"${conEngagement[0].clave}" tuvo mayor engagement que "${conEngagement[1].clave}".`);
      }
      if (conLeads[0]?.leads > 0) {
        frases.push(`"${conLeads[0].clave}" fue el formato que generó más leads (${conLeads[0].leads}).`);
      }
    }
    return frases;
  }
  const frasesAnalisisAuto = analisisAutomatico();

  // ---------- EVOLUCIÓN (multi-mes) ----------
  const mesesEvolucion = ultimosNMeses(mes, rangoEvolucion);
  function serieDe(campo) {
    return mesesEvolucion.map((m) => {
      const filas = metricasEvolucion.filter((x) => x.Mes === m);
      if (filas.length === 0) return null;
      return filas.reduce((acc, f) => acc + (num(f[campo]) || 0), 0);
    });
  }

  // ---------- INFORME ANUAL ----------
  function resumenAnual() {
    const mesesDelAnio = [...new Set(metricasAnuales.map((m) => m.Mes))].sort();
    const porMes = mesesDelAnio.map((m) => {
      const filas = metricasAnuales.filter((x) => x.Mes === m);
      const reach = filas.reduce((a, f) => a + (num(f.Reach) || 0), 0);
      const followers = filas.reduce((a, f) => a + (num(f.Followers) || 0), 0);
      const leads = filas.reduce((a, f) => a + (num(f.QualifiedLeads) || 0), 0);
      return { mes: m, reach, followers, leads };
    });
    const mejorMes = porMes.length ? [...porMes].sort((a, b) => b.reach - a.reach)[0] : null;
    const peorMes = porMes.length ? [...porMes].sort((a, b) => a.reach - b.reach)[0] : null;
    const porPlataforma = agruparYSumar(
      metricasAnuales.map((m) => ({ plataforma: m.Plataforma, reach: num(m.Reach) || 0, leads: num(m.QualifiedLeads) || 0 })),
      (m) => m.plataforma, ['reach', 'leads']
    ).sort((a, b) => b.reach - a.reach);
    const piezasAnualesNum = piezasAnuales.map((p) => ({ tipo: p.Tipo, views: num(p.Views) || 0 }));
    const porTipoAnual = agruparYSumar(piezasAnualesNum, (p) => p.tipo, ['views']).sort((a, b) => b.cantidad - a.cantidad);
    return {
      porMes, mejorMes, peorMes, porPlataforma, mejorTipo: porTipoAnual[0] || null,
      totalReach: porMes.reduce((a, m) => a + m.reach, 0),
      totalLeads: porMes.reduce((a, m) => a + m.leads, 0),
      totalPiezas: piezasAnuales.length,
      crecimientoSeguidores: porMes.length >= 2 ? porMes[porMes.length - 1].followers - porMes[0].followers : null
    };
  }
  const anual = resumenAnual();

  function exportarExcel() {
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(metricas), 'Metricas');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(piezas), 'Contenidos');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(objetivos), 'Objetivos');
    XLSX.writeFile(libro, `informe-rrss-${mes}.xlsx`);
  }

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      {!puedeVer ? (
        <AccesoDenegado seccion="Informes RRSS" />
      ) : (
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 pb-16">

        {/* AVISO */}
        {aviso && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg ${
            aviso.tipo === 'success' ? 'bg-successBg text-successText border border-successText/30' : 'bg-dangerBg text-dangerText border border-dangerText/30'
          }`}>
            {aviso.texto}
          </div>
        )}

        {/* HEADER + SELECTOR DE MES */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
          <h3 className="text-lg font-bold">📊 Informes RRSS</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setVistaAnual((v) => !v)}
              className={`text-sm px-3 py-2 rounded-xl border font-medium ${vistaAnual ? 'bg-accentPurple border-accentPurple text-white' : 'bg-surface border-border text-textSec'}`}>
              📆 Informe anual {mes.slice(0, 4)}
            </button>
            <button onClick={exportarExcel} className="text-sm px-3 py-2 rounded-xl border border-border bg-surface text-textSec">
              ⬇ Exportar
            </button>
            <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-2">
              <span className="text-textMuted text-sm">📅</span>
              <select value={mes} onChange={(e) => setMes(e.target.value)}
                className="bg-transparent text-sm font-medium focus:outline-none capitalize">
                {mesesDisponibles().map((m) => <option key={m} value={m} className="capitalize">{labelDeMes(m)}</option>)}
              </select>
            </div>
          </div>
        </div>
        <p className="text-textMuted text-xs mb-5">Métricas mensuales de redes sociales, contenido destacado y análisis.</p>

        {vistaAnual ? (
          cargandoAnual ? <Skeleton h="h-64" /> : (
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5">
              <p className="text-sm font-semibold mb-3">📆 Informe anual {mes.slice(0, 4)}</p>
              {anual.porMes.length === 0 ? (
                <p className="text-textMuted text-sm">Todavía no hay datos cargados este año.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-bg border border-border rounded-xl p-3">
                      <p className="text-textMuted text-[11px] mb-1">Alcance acumulado</p>
                      <p className="text-lg font-bold">{fmt(anual.totalReach)}</p>
                    </div>
                    <div className="bg-bg border border-border rounded-xl p-3">
                      <p className="text-textMuted text-[11px] mb-1">Leads calificados</p>
                      <p className="text-lg font-bold">{fmt(anual.totalLeads)}</p>
                    </div>
                    <div className="bg-bg border border-border rounded-xl p-3">
                      <p className="text-textMuted text-[11px] mb-1">Contenidos publicados</p>
                      <p className="text-lg font-bold">{anual.totalPiezas}</p>
                    </div>
                    <div className="bg-bg border border-border rounded-xl p-3">
                      <p className="text-textMuted text-[11px] mb-1">Crecimiento de seguidores</p>
                      <p className="text-lg font-bold">{anual.crecimientoSeguidores !== null ? (anual.crecimientoSeguidores >= 0 ? '+' : '') + fmt(anual.crecimientoSeguidores) : '—'}</p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 mb-2">
                    {anual.mejorMes && (
                      <p className="text-textSec text-xs">🏆 Mejor mes: <b className="text-text">{labelDeMes(anual.mejorMes.mes)}</b> ({fmt(anual.mejorMes.reach)} de alcance)</p>
                    )}
                    {anual.peorMes && anual.porMes.length > 1 && (
                      <p className="text-textSec text-xs">📉 Mes más flojo: <b className="text-text">{labelDeMes(anual.peorMes.mes)}</b> ({fmt(anual.peorMes.reach)} de alcance)</p>
                    )}
                    {anual.porPlataforma[0] && (
                      <p className="text-textSec text-xs">📱 Mejor plataforma: <b className="text-text">{anual.porPlataforma[0].clave}</b></p>
                    )}
                    {anual.mejorTipo && (
                      <p className="text-textSec text-xs">🎬 Mejor tipo de contenido: <b className="text-text">{anual.mejorTipo.clave}</b> ({anual.mejorTipo.cantidad} piezas)</p>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-textMuted text-[11px] mb-1">Alcance mes a mes</p>
                    <GraficoEvolucion etiquetas={anual.porMes.map((m) => labelCortoDeMes(m.mes))} puntos={anual.porMes.map((m) => m.reach)} color="#5CE1E6" />
                    <div className="flex justify-between text-[10px] text-textMuted mt-1">
                      {anual.porMes.map((m) => <span key={m.mes}>{labelCortoDeMes(m.mes)}</span>)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          )
        ) : errorCarga ? (
          <div className="bg-dangerBg border border-dangerText/30 rounded-2xl p-6 text-center">
            <p className="text-dangerText text-sm font-semibold mb-3">✕ {errorCarga}</p>
            <button onClick={cargarTodo} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold">Reintentar</button>
          </div>
        ) : cargando ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} h="h-20" />)}
            </div>
            <Skeleton h="h-40" />
            <Skeleton h="h-40" />
          </div>
        ) : (
          <div className="space-y-4">

            {/* 1. RESUMEN DEL MES */}
            <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5">
              <p className="text-sm font-semibold mb-3">📊 Resumen del mes</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  ['Seguidores totales', totales.followers, totalesAnterior.followers, false],
                  ['Alcance total', totales.reach, totalesAnterior.reach, false],
                  ['Impresiones totales', totales.impressions, totalesAnterior.impressions, false],
                  ['Visitas al perfil', totales.profileVisits, totalesAnterior.profileVisits, false],
                  ['Leads calificados', totales.qualifiedLeads, totalesAnterior.qualifiedLeads, false]
                ].map(([label, valor, anterior, puntos]) => (
                  <div key={label} className="bg-bg border border-border rounded-xl p-3">
                    <p className="text-textMuted text-[11px] mb-1">{label}</p>
                    <p className="text-lg font-bold">{fmt(valor)}</p>
                    {hayDatosMesAnterior && <Delta actual={valor} anterior={anterior} esPuntos={puntos} />}
                  </div>
                ))}
                <div className="bg-bg border border-border rounded-xl p-3">
                  <p className="text-textMuted text-[11px] mb-1">Contenidos cargados</p>
                  <p className="text-lg font-bold">{piezas.length}</p>
                </div>
              </div>
              {totales.engagementPromedio !== null && (
                <p className="text-textSec text-xs mt-3">
                  Engagement promedio: <b className="text-text">{totales.engagementPromedio.toFixed(1)}%</b>
                  {hayDatosMesAnterior && totalesAnterior.engagementPromedio !== null && (
                    <span className="ml-2"><Delta actual={totales.engagementPromedio} anterior={totalesAnterior.engagementPromedio} esPuntos /></span>
                  )}
                </p>
              )}
              {!hayDatosMesAnterior && (
                <p className="text-textMuted text-[11px] mt-2 italic">Sin datos de {labelDeMes(mesAnteriorDe(mes))} todavía — no se puede comparar.</p>
              )}
            </div>

            {/* 1.5 ALERTAS AUTOMÁTICAS */}
            {alertas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {alertas.map((a, i) => (
                  <span key={i} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                    a.tono === 'success' ? 'bg-successBg text-successText' : a.tono === 'danger' ? 'bg-dangerBg text-dangerText' : 'bg-warningBg text-warningText'
                  }`}>
                    {a.tono === 'success' ? '🟢' : a.tono === 'danger' ? '🔴' : '🟡'} {a.texto}
                  </span>
                ))}
              </div>
            )}

            {/* 1.7 EVOLUCIÓN */}
            <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <p className="text-sm font-semibold">📈 Evolución</p>
                <div className="flex items-center gap-1 bg-bg border border-border rounded-lg p-0.5">
                  {[3, 6, 12].map((n) => (
                    <button key={n} onClick={() => setRangoEvolucion(n)}
                      className={`text-xs px-2.5 py-1 rounded-md ${rangoEvolucion === n ? 'bg-accentPurple text-white' : 'text-textMuted'}`}>
                      {n} meses
                    </button>
                  ))}
                </div>
              </div>
              {cargandoEvolucion ? <Skeleton h="h-28" /> : (
                <div className="grid sm:grid-cols-2 gap-5">
                  {[
                    ['Seguidores', 'Followers', '#8C52FF'],
                    ['Alcance', 'Reach', '#5CE1E6'],
                    ['Leads calificados', 'QualifiedLeads', '#52D6A0'],
                    ['Impresiones', 'Impressions', '#E0C25C']
                  ].map(([label, campo, color]) => {
                    const serie = serieDe(campo);
                    const conDatos = serie.filter((v) => v !== null);
                    return (
                      <div key={campo}>
                        <div className="flex items-baseline justify-between mb-1">
                          <p className="text-textMuted text-xs">{label}</p>
                          {conDatos.length > 0 && <p className="text-sm font-bold">{fmt(conDatos[conDatos.length - 1])}</p>}
                        </div>
                        <GraficoEvolucion etiquetas={mesesEvolucion.map(labelCortoDeMes)} puntos={serie} color={color} />
                        <div className="flex justify-between text-[10px] text-textMuted mt-1">
                          {mesesEvolucion.map((m) => <span key={m}>{labelCortoDeMes(m)}</span>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. MÉTRICAS POR PLATAFORMA */}
            <div>
              <p className="text-sm font-semibold mb-3">📱 Métricas por plataforma</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {plataformasConDatos.map((plat) => {
                  const m = metricas.find((x) => x.Plataforma === plat.id);
                  return (
                    <div key={plat.id} className="bg-surface border border-border rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className={`text-sm font-semibold ${plat.color}`}>{plat.label}</p>
                        <button onClick={() => abrirEdicionMetrica(plat.id)} className="text-xs text-accentTeal font-semibold shrink-0">
                          {m ? '✏️ Editar' : '+ Cargar'}
                        </button>
                      </div>
                      {!m ? (
                        <p className="text-textMuted text-xs">Sin datos este mes.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                          <p className="text-textSec">Seguidores: <b className="text-text">{fmt(m.Followers)}</b></p>
                          <p className="text-textSec">Alcance: <b className="text-text">{fmt(m.Reach)}</b></p>
                          <p className="text-textSec">Impresiones: <b className="text-text">{fmt(m.Impressions)}</b></p>
                          <p className="text-textSec">Visitas perfil: <b className="text-text">{fmt(m.ProfileVisits)}</b></p>
                          <p className="text-textSec">Engagement: <b className="text-text">{m.EngagementRate !== '' ? `${m.EngagementRate}%` : '—'}</b></p>
                          <p className="text-textSec">Guardados: <b className="text-text">{fmt(m.Saves)}</b></p>
                          <p className="text-textSec">Clics a link: <b className="text-text">{fmt(m.LinkClicks)}</b></p>
                          <p className="text-textSec">Leads calif.: <b className="text-successText">{fmt(m.QualifiedLeads)}</b></p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {editandoPlataforma && (
                <div className="bg-surface border border-accentTeal/40 rounded-2xl p-4 sm:p-5 mt-3">
                  <p className="text-sm font-semibold mb-3">Métricas de {PLATAFORMAS.find((p) => p.id === editandoPlataforma)?.label} — {labelDeMes(mes)}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    {CAMPOS_METRICA.map(([campo, label]) => (
                      <div key={campo}>
                        <label className="text-[11px] text-textSec block mb-1">{label}</label>
                        <input type="text" inputMode="decimal" value={formMetrica[campo] ?? ''}
                          onChange={(e) => setFormMetrica((f) => ({ ...f, [campo]: e.target.value }))}
                          className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
                      </div>
                    ))}
                  </div>
                  {errorFormMetrica && <p className="text-dangerText text-xs mb-3">✕ {errorFormMetrica}</p>}
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setEditandoPlataforma(null)} className="text-sm px-4 py-2 rounded-lg bg-surface2 border border-border">Cancelar</button>
                    <button onClick={guardarMetrica} disabled={guardandoMetrica}
                      className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-60">
                      {guardandoMetrica ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. CONTENIDO DESTACADO */}
            <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <p className="text-sm font-semibold">🎬 Contenido destacado</p>
                <button onClick={abrirNuevaPieza} className="text-xs px-3 py-1.5 rounded-lg bg-accentPurple text-white font-semibold">+ Agregar</button>
              </div>

              {mejorPieza && (
                <div className="bg-bg border border-warningText/40 rounded-xl p-3 mb-3">
                  <p className="text-warningText text-xs font-semibold mb-1">🏆 Mejor contenido del mes</p>
                  <p className="text-sm font-medium">{mejorPieza.Titulo}</p>
                  <p className="text-textMuted text-[11px]">Engagement: {mejorPieza._engagement.toFixed(1)}%</p>
                </div>
              )}

              {mostrarFormPieza && (
                <div className="bg-bg border border-border rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[11px] text-textSec block mb-1">Plataforma</label>
                      <select value={formPieza.plataforma} onChange={(e) => setFormPieza((f) => ({ ...f, plataforma: e.target.value }))}
                        className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-sm">
                        {PLATAFORMAS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-textSec block mb-1">Tipo</label>
                      <select value={formPieza.tipo} onChange={(e) => setFormPieza((f) => ({ ...f, tipo: e.target.value }))}
                        className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-sm">
                        {TIPOS_PIEZA.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <label className="text-[11px] text-textSec block mb-1">Título</label>
                  <input value={formPieza.titulo} onChange={(e) => setFormPieza((f) => ({ ...f, titulo: e.target.value }))}
                    placeholder="Ej: 3 señales de que tu equipo necesita coaching"
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm mb-3" />
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                    {[['views', 'Views'], ['likes', 'Likes'], ['comments', 'Comments'], ['saves', 'Saves'], ['shares', 'Shares'], ['leads', 'Leads']].map(([campo, label]) => (
                      <div key={campo}>
                        <label className="text-[11px] text-textSec block mb-1">{label}</label>
                        <input type="text" inputMode="numeric" value={formPieza[campo]}
                          onChange={(e) => setFormPieza((f) => ({ ...f, [campo]: e.target.value }))}
                          className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs" />
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const eng = engagementDePieza(formPieza);
                    return eng !== null ? <p className="text-accentTeal text-xs mb-3">Engagement calculado: {eng.toFixed(1)}%</p> : null;
                  })()}
                  <label className="text-[11px] text-textSec block mb-1">Guion / copy (opcional)</label>
                  <textarea rows={3} value={formPieza.guion} onChange={(e) => setFormPieza((f) => ({ ...f, guion: e.target.value }))}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm mb-3" />
                  <label className="text-[11px] text-textSec block mb-1">¿Por qué funcionó? (opcional)</label>
                  <textarea rows={2} value={formPieza.notaIA} onChange={(e) => setFormPieza((f) => ({ ...f, notaIA: e.target.value }))}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm mb-3" />
                  {errorFormPieza && <p className="text-dangerText text-xs mb-3">✕ {errorFormPieza}</p>}
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setMostrarFormPieza(false)} className="text-sm px-4 py-2 rounded-lg bg-surface2 border border-border">Cancelar</button>
                    <button onClick={guardarPieza} disabled={guardandoPieza || !formPieza.titulo.trim()}
                      className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-50">
                      {guardandoPieza ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}

              {piezasConEngagement.length === 0 ? (
                <p className="text-textMuted text-sm">Sin piezas cargadas este mes.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {piezasConEngagement.map((p) => (
                    <div key={p.PiezaID || p._rowIndex} className={`bg-bg border rounded-xl p-3.5 ${mejorPieza && (mejorPieza.PiezaID || mejorPieza._rowIndex) === (p.PiezaID || p._rowIndex) ? 'border-warningText/50' : 'border-border'}`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface2 text-textMuted">{PLATAFORMAS.find((pl) => pl.id === p.Plataforma)?.label || p.Plataforma}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface2 text-textMuted">{p.Tipo}</span>
                          {p._engagement !== null && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accentTeal/20 text-accentTeal font-medium">{p._engagement.toFixed(1)}% eng.</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => abrirEdicionPieza(p)} className="text-xs text-accentTeal">✏️</button>
                          <button onClick={() => setConfirmarBorrarPieza(p)} className="text-xs text-dangerText">🗑</button>
                        </div>
                      </div>
                      <p className="text-sm font-medium mb-2">{p.Titulo}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-textSec">
                        {p.Views !== '' && <span>👁 {fmt(p.Views)}</span>}
                        {p.Likes !== '' && <span>❤️ {fmt(p.Likes)}</span>}
                        {p.Comments !== '' && <span>💬 {fmt(p.Comments)}</span>}
                        {p.Saves !== '' && <span>🔖 {fmt(p.Saves)}</span>}
                        {p.Shares !== '' && <span>🔁 {fmt(p.Shares)}</span>}
                        {p.Leads && p.Leads !== '' && <span>🎯 {fmt(p.Leads)} leads</span>}
                      </div>
                      {p.NotaIA && <p className="text-textMuted text-[11px] mt-2 italic border-l-2 border-accentPurple pl-2">{p.NotaIA}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3.5 TOP CONTENIDOS DEL MES */}
            {topContenidos.length > 0 && (
              <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5">
                <p className="text-sm font-semibold mb-3">🏆 Top contenidos del mes</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {topContenidos.map(([label, pieza, campo]) => (
                    <div key={label} className="bg-bg border border-border rounded-xl p-3">
                      <p className="text-textMuted text-[11px] mb-1">{label}</p>
                      <p className="text-sm font-semibold truncate">{pieza.Titulo}</p>
                      <p className="text-accentTeal text-xs font-bold mt-1">
                        {campo === '_engagement' ? `${pieza._engagement.toFixed(1)}%` : fmt(pieza[campo])}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3.7 RENDIMIENTO POR TIPO DE CONTENIDO */}
            {rendimientoPorTipo.length > 0 && (
              <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5">
                <p className="text-sm font-semibold mb-3">🎬 Rendimiento por tipo de contenido</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {rendimientoPorTipo.map((t) => (
                    <div key={t.clave} className="bg-bg border border-border rounded-xl p-3">
                      <p className="text-sm font-semibold mb-2">{t.clave}</p>
                      <p className="text-textMuted text-[11px]">{t.cantidad} publicacion{t.cantidad !== 1 ? 'es' : ''}</p>
                      <p className="text-textSec text-xs mt-1">Alcance promedio: <b className="text-text">{fmt(t.alcancePromedio)}</b></p>
                      {t.engagementProm !== null && <p className="text-textSec text-xs">Engagement: <b className="text-text">{t.engagementProm.toFixed(1)}%</b></p>}
                      {t.leads > 0 && <p className="text-textSec text-xs">Leads: <b className="text-text">{t.leads}</b></p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. OBJETIVOS DEL MES */}
            <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5">
              <p className="text-sm font-semibold mb-1">🎯 Objetivos del mes</p>
              <p className="text-textMuted text-xs mb-3">Ej: aumentar seguidores, mejorar engagement, generar leads, publicar cierta cantidad de contenidos…</p>
              {objetivos.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {objetivos.map((o) => (
                    <div key={o._rowIndex} className="flex items-center justify-between gap-2 bg-bg border border-border rounded-lg px-3 py-2">
                      <label className="flex items-center gap-2 text-sm flex-1 cursor-pointer">
                        <input type="checkbox" checked={o.Cumplido === 'TRUE'} onChange={() => toggleObjetivo(o)} />
                        <span className={o.Cumplido === 'TRUE' ? 'line-through text-textMuted' : ''}>{o.Texto}</span>
                      </label>
                      <button onClick={() => borrarObjetivo(o)} className="text-dangerText text-xs shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input value={nuevoObjetivo} onChange={(e) => setNuevoObjetivo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && agregarObjetivo()}
                  placeholder="Ej: Aumentar seguidores de Instagram a 40.000"
                  className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
                <button onClick={agregarObjetivo} disabled={guardandoObjetivo || !nuevoObjetivo.trim()}
                  className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-50">+ Agregar</button>
              </div>
            </div>

            {/* 4.5 ANÁLISIS AUTOMÁTICO */}
            {frasesAnalisisAuto.length > 0 && (
              <div className="bg-surface border border-accentTeal/30 rounded-2xl p-4 sm:p-5">
                <p className="text-sm font-semibold mb-2">🤖 Resumen automático del mes</p>
                <p className="text-textMuted text-[11px] mb-3">Generado solo a partir de los datos cargados — no es un texto genérico.</p>
                <p className="text-textSec text-sm leading-relaxed">{frasesAnalisisAuto.join(' ')}</p>
              </div>
            )}

            {/* 5. ANÁLISIS MENSUAL */}
            <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">🔍 Análisis del mes</p>
                {!editandoAnalisis && (
                  <button onClick={() => setEditandoAnalisis(true)} className="text-xs text-accentTeal font-semibold">✏️ Editar</button>
                )}
              </div>
              {editandoAnalisis ? (
                <>
                  <label className="text-[11px] text-textSec block mb-0.5">Resumen</label>
                  <p className="text-textMuted text-[11px] mb-1">¿Qué pasó este mes?</p>
                  <textarea rows={3} value={formAnalisis.resumen} onChange={(e) => setFormAnalisis((f) => ({ ...f, resumen: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />
                  <label className="text-[11px] text-textSec block mb-0.5">Causas</label>
                  <p className="text-textMuted text-[11px] mb-1">¿Por qué creemos que ocurrió?</p>
                  <textarea rows={3} value={formAnalisis.causas} onChange={(e) => setFormAnalisis((f) => ({ ...f, causas: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />
                  <label className="text-[11px] text-textSec block mb-0.5">Propuestas</label>
                  <p className="text-textMuted text-[11px] mb-1">¿Qué vamos a hacer el próximo mes?</p>
                  <textarea rows={3} value={formAnalisis.propuestas} onChange={(e) => setFormAnalisis((f) => ({ ...f, propuestas: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />
                  {errorFormAnalisis && <p className="text-dangerText text-xs mb-3">✕ {errorFormAnalisis}</p>}
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setEditandoAnalisis(false)} className="text-sm px-4 py-2 rounded-lg bg-surface2 border border-border">Cancelar</button>
                    <button onClick={guardarAnalisis} disabled={guardandoAnalisis}
                      className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-60">
                      {guardandoAnalisis ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </>
              ) : !analisis ? (
                <p className="text-textMuted text-sm">Todavía no hay análisis cargado para este mes.</p>
              ) : (
                <div className="space-y-3 text-sm">
                  {analisis.resumen && <div><p className="text-textMuted text-[11px] uppercase mb-1">Resumen</p><p className="text-textSec whitespace-pre-wrap">{analisis.resumen}</p></div>}
                  {analisis.causas && <div><p className="text-textMuted text-[11px] uppercase mb-1">Causas</p><p className="text-textSec whitespace-pre-wrap">{analisis.causas}</p></div>}
                  {analisis.propuestas && <div><p className="text-textMuted text-[11px] uppercase mb-1">Propuestas</p><p className="text-textSec whitespace-pre-wrap">{analisis.propuestas}</p></div>}
                </div>
              )}
            </div>

            {/* 6. COMENTARIOS */}
            <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5">
              <p className="text-sm font-semibold mb-3">💬 Comentarios</p>
              {comentarios.length === 0 ? (
                <p className="text-textMuted text-sm mb-3">Sin comentarios todavía.</p>
              ) : (
                <div className="space-y-3 mb-3">
                  {comentarios.map((c, i) => (
                    <div key={i} className="border-b border-border pb-2.5 last:border-b-0">
                      <p className="text-xs"><b className="font-semibold">{c.UsuarioNombre}</b> <span className="text-textMuted">· {fechaHoraAmigable(c.Fecha)}</span></p>
                      <p className="text-textSec text-sm mt-0.5 whitespace-pre-wrap">{c.Texto}</p>
                    </div>
                  ))}
                </div>
              )}
              {errorComentario && <p className="text-dangerText text-xs mb-2">✕ {errorComentario}</p>}
              <div className="flex gap-2 flex-col sm:flex-row">
                <input value={textoComentario} onChange={(e) => setTextoComentario(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && enviarComentario()}
                  placeholder="Escribir un comentario…" className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
                <button onClick={enviarComentario} disabled={enviandoComentario || !textoComentario.trim()}
                  className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-50 shrink-0">
                  {enviandoComentario ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {confirmarBorrarPieza && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setConfirmarBorrarPieza(null)}>
          <div className="bg-surface2 border border-border rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold mb-2">¿Eliminar "{confirmarBorrarPieza.Titulo}"?</p>
            <p className="text-textMuted text-xs mb-4">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarBorrarPieza(null)} className="text-xs px-3 py-2 rounded-lg bg-surface border border-border flex-1">Cancelar</button>
              <button onClick={() => borrarPieza(confirmarBorrarPieza)} className="text-xs px-3 py-2 rounded-lg bg-dangerText text-white font-semibold flex-1">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
