'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav, { puedeVerOperativo } from '../../components/Nav';
import FichaDrawer from '../../components/FichaDrawer';
import ModalVenta from '../../components/ModalVenta';
import { useToast } from '../../components/Toast';
import { useSession } from '../../lib/useSession';
import { RESULTADOS_CONTACTO, RESULTADOS_FINALES, RESULTADOS_PROGRESO, enlaceGmail } from '../../lib/constants';

const EMAILS_ASIGNABLES = [
  { email: 'jesabel.reigada@institutoilce.com', nombre: 'Jesabel Reigada' },
  { email: 'alexander.juncos@institutoilce.com', nombre: 'Alexander Juncos' }
];

// Filtros rápidos con contador — los 5 cursos con más volumen histórico + "Otros" para el resto.
const FILTROS_RAPIDOS = [
  'Coaching Ontológico Profesional',
  'Coaching Deportivo',
  'Coaching Educativo',
  'Coaching Vocacional',
  'Coaching de Equipos'
];

// Resultados principales como botones grandes; el resto queda en "Otro resultado".
const RESULTADOS_PRINCIPALES = [
  { valor: 'Pago recibido', emoji: '🟢' },
  { valor: 'Va a pensarlo', emoji: '🟡' },
  { valor: 'No le interesa', emoji: '🔴' },
  { valor: 'No contestó', emoji: '⚪' }
];
const RESULTADOS_SECUNDARIOS = RESULTADOS_CONTACTO.filter(
  (r) => !RESULTADOS_PRINCIPALES.some((p) => p.valor === r)
);

function tiempoDesde(fecha) {
  const dias = Math.floor((new Date() - new Date(fecha)) / (24 * 60 * 60 * 1000));
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Hace 1 día';
  return `Hace ${dias} días`;
}

// Tiempo hasta/desde el vencimiento del lote: "Vence hoy", "Faltan 8 horas", "Hace 2 días que venció"
function estadoVencimiento(fechaVence) {
  const diffMs = new Date(fechaVence) - new Date();
  const horas = diffMs / (1000 * 60 * 60);
  if (horas > 0) {
    if (horas < 24) return { texto: `⏰ Vence hoy — faltan ${Math.ceil(horas)}hs`, urgencia: 'proximo' };
    const dias = Math.ceil(horas / 24);
    return { texto: `Vence en ${dias} día${dias > 1 ? 's' : ''}`, urgencia: 'lejos' };
  }
  const diasVencido = Math.floor(-horas / 24);
  if (diasVencido <= 0) return { texto: '⏰ Vence hoy', urgencia: 'proximo' };
  if (diasVencido <= 2) return { texto: `Hace ${diasVencido} día${diasVencido > 1 ? 's' : ''} que venció`, urgencia: 'reciente' };
  return { texto: `🔴 Hace ${diasVencido} días sin contacto`, urgencia: 'critico' };
}

const COLORES_AVATAR = ['bg-accentPurple', 'bg-accentTeal', 'bg-accentMagenta', 'bg-successText', 'bg-warningText', 'bg-infoText'];
function colorAvatar(nombre) {
  const n = (nombre || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COLORES_AVATAR[n % COLORES_AVATAR.length];
}
function iniciales(nombre) {
  return (nombre || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

// Indicadores rápidos sobre un lead+fila: 🔥 caliente, ⭐ alta prioridad, 💰 posible venta, 📞 esperando respuesta
function indicadores(lead, fila) {
  const lista = [];
  if (lead.Prioridad === 'Alta') lista.push({ icono: '⭐', titulo: 'Alta prioridad' });
  if (RESULTADOS_PROGRESO.includes(fila.Resultado)) lista.push({ icono: '💰', titulo: 'Posible venta en curso' });
  if (fila.Contactado === 'TRUE' && fila.Resultado === 'No contestó') lista.push({ icono: '📞', titulo: 'Esperando respuesta' });
  if (fila.Resultado === 'Interesado' || RESULTADOS_PROGRESO.includes(fila.Resultado)) lista.push({ icono: '🔥', titulo: 'Lead caliente' });
  return lista;
}

function coincideBusquedaAmplia(lead, texto) {
  const t = texto.trim().toLowerCase();
  if (!t) return true;
  return [lead.Nombre, lead.Apellido, lead.WhatsApp, lead.EmailEstudiante, lead.InstagramUsuario, lead.Curso, lead.Origen, lead.Pais]
    .filter(Boolean).some((v) => v.toLowerCase().includes(t));
}

// Agrupa un array de filas de seguimiento por la dimensión elegida (curso, responsable, país u origen),
// ordena cada grupo según el criterio elegido, y devuelve un array de grupos ordenado alfabéticamente
// ("Sin definir" siempre al final).
function agruparYOrdenar(filas, buscarLead, dimension, ordenPor) {
  const grupos = {};
  filas.forEach((f) => {
    const lead = buscarLead(f.LeadID);
    let clave = 'Sin definir';
    if (dimension === 'curso') clave = lead?.Curso || 'Sin curso definido';
    else if (dimension === 'responsable') clave = f.AsignadoANombre || 'Sin asignar';
    else if (dimension === 'pais') clave = lead?.Pais || 'Sin país';
    else if (dimension === 'origen') clave = lead?.Origen || 'Sin origen';
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(f);
  });
  Object.values(grupos).forEach((arr) => {
    arr.sort((a, b) => {
      const la = buscarLead(a.LeadID);
      const lb = buscarLead(b.LeadID);
      if (ordenPor === 'atrasado') return new Date(a.FechaVence) - new Date(b.FechaVence);
      if (ordenPor === 'reciente') return new Date(lb?.FechaIngreso || 0) - new Date(la?.FechaIngreso || 0);
      if (ordenPor === 'nombre') return (la?.Nombre || '').localeCompare(lb?.Nombre || '', 'es');
      // default: más antiguos primero
      return new Date(la?.FechaIngreso || 0) - new Date(lb?.FechaIngreso || 0);
    });
  });
  return Object.entries(grupos).sort(([a], [b]) => {
    const esSinDefinir = (x) => ['Sin definir', 'Sin curso definido', 'Sin asignar', 'Sin país', 'Sin origen'].includes(x);
    if (esSinDefinir(a)) return 1;
    if (esSinDefinir(b)) return -1;
    return a.localeCompare(b, 'es');
  });
}

export default function SeguimientoPage() {
  const { usuario, cargando: cargandoSesion, logout } = useSession();
  const router = useRouter();
  const { toast, mostrarToast } = useToast();
  const [leads, setLeads] = useState([]);
  const [seguimiento, setSeguimiento] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fichaLeadId, setFichaLeadId] = useState(null);
  const [leadVenta, setLeadVenta] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('');
  const [filtrosExtra, setFiltrosExtra] = useState([]); // 'sinAsignar' | 'conWhatsapp' | 'sinWhatsapp' | 'conEmail' | 'altaPrioridad' | 'hoy' | 'atrasados'
  const [dimensionAgrupacion, setDimensionAgrupacion] = useState('curso');
  const [ordenPor, setOrdenPor] = useState('antiguos');
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [modalReasignar, setModalReasignar] = useState(null); // { leadId, lote } o { masivo: true }
  const [confirmarEliminarLeads, setConfirmarEliminarLeads] = useState(false);
  const esAdmin = usuario?.roles?.includes('Admin');
  const busquedaRef = useRef(null);

  const puedeReasignar = usuario?.roles?.includes('Admin') || usuario?.roles?.includes('Coordinador');

  useEffect(() => {
    if (!usuario) return;
    cargarDatos();
  }, [usuario]);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        busquedaRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function cargarDatos() {
    setCargando(true);
    const [rLeads, rSeg] = await Promise.all([
      fetch(`/api/leads?solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((r) => r.json()),
      fetch(`/api/seguimiento?solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((r) => r.json())
    ]);
    setLeads(rLeads.leads || []);
    setSeguimiento(rSeg.seguimiento || []);
    setCargando(false);
  }

  async function registrarContacto(leadId, lote, resultado, observaciones, proximaAccion, fechaProgramada) {
    await fetch('/api/seguimiento', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'contactar', leadId, lote, resultado, observaciones, proximaAccion, fechaProgramada,
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    mostrarToast('Seguimiento guardado');
    cargarDatos();
  }

  async function reasignar(leadId, lote, nuevoEmail, nuevoNombre) {
    await fetch('/api/seguimiento', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'reasignar', leadId, lote, nuevoEmail, nuevoNombre,
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    mostrarToast(`Reasignado a ${nuevoNombre}`);
    cargarDatos();
  }

  async function reasignarMasivo(nuevoEmail, nuevoNombre) {
    const filas = [...seleccionados].map((clave) => {
      const [leadId, lote] = clave.split('__');
      return { leadId, lote };
    });
    for (const f of filas) {
      await fetch('/api/seguimiento', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'reasignar', leadId: f.leadId, lote: f.lote, nuevoEmail, nuevoNombre,
          solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
        })
      });
    }
    mostrarToast(`${filas.length} lead(s) reasignado(s) a ${nuevoNombre}`);
    setSeleccionados(new Set());
    setModalReasignar(null);
    cargarDatos();
  }

  async function marcarContactoMasivo(resultado) {
    const filas = [...seleccionados].map((clave) => {
      const [leadId, lote] = clave.split('__');
      return { leadId, lote };
    });
    for (const f of filas) {
      await registrarContactoSilencioso(f.leadId, f.lote, resultado);
    }
    mostrarToast(`${filas.length} lead(s) marcado(s) como "${resultado}"`);
    setSeleccionados(new Set());
    cargarDatos();
  }

  async function registrarContactoSilencioso(leadId, lote, resultado) {
    await fetch('/api/seguimiento', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'contactar', leadId, lote, resultado, observaciones: '', proximaAccion: '',
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
  }

  async function eliminarSeleccionados() {
    const leadIds = [...new Set([...seleccionados].map((clave) => clave.split('__')[0]))];
    const r = await fetch('/api/leads', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadIds, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    }).then((res) => res.json());
    if (r.error) {
      mostrarToast(`⚠️ ${r.error}`);
    } else {
      mostrarToast(
        `✓ ${r.eliminados} lead(s) eliminado(s)${r.protegidos > 0 ? ` (${r.protegidos} protegido(s) por venta)` : ''}`
      );
    }
    setSeleccionados(new Set());
    setConfirmarEliminarLeads(false);
    cargarDatos();
  }

  function exportarSeleccionados() {
    const filas = seguimiento.filter((s) => seleccionados.has(`${s.LeadID}__${s.Lote}`));
    exportarFilas(filas);
  }

  function exportarFilas(filas) {
    const hoja = XLSX.utils.json_to_sheet(
      filas.map((s) => {
        const l = buscarLead(s.LeadID);
        return {
          Lead: l ? `${l.Nombre} ${l.Apellido}` : s.LeadID,
          Lote: s.Lote,
          AsignadoA: s.AsignadoANombre,
          Contactado: s.Contactado === 'TRUE' ? 'Sí' : 'No',
          Resultado: s.Resultado,
          Observaciones: s.Observaciones,
          ProximaAccion: s.ProximaAccion,
          FechaVence: s.FechaVence ? new Date(s.FechaVence).toLocaleString('es-AR', { hour12: false }) : ''
        };
      })
    );
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Seguimiento');
    XLSX.writeFile(libro, `seguimiento-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function confirmarVenta(datos) {
    await fetch('/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...datos, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setLeadVenta(null);
    mostrarToast('Venta registrada');
    cargarDatos();
  }

  function toggleSeleccion(leadId, lote) {
    const clave = `${leadId}__${lote}`;
    setSeleccionados((prev) => {
      const copia = new Set(prev);
      if (copia.has(clave)) copia.delete(clave); else copia.add(clave);
      return copia;
    });
  }

  function toggleFiltroExtra(f) {
    setFiltrosExtra((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  if (cargandoSesion) return null;
  if (!usuario) {
    if (typeof window !== 'undefined') router.push('/');
    return null;
  }
  if (!puedeVerOperativo(usuario)) {
    if (typeof window !== 'undefined') router.push('/inscritos');
    return null;
  }

  const ahora = new Date();
  const buscarLead = (leadId) => leads.find((l) => l.ID === leadId);

  const leadsResueltos = new Set(
    seguimiento.filter((s) => RESULTADOS_FINALES.includes(s.Resultado)).map((s) => s.LeadID)
  );
  const esValidoSinFiltro = (s) => {
    const l = buscarLead(s.LeadID);
    return Boolean(l) && l.Estado !== 'Comprado' && !leadsResueltos.has(s.LeadID);
  };
  function coincideFiltroRapido(lead) {
    if (!filtroCurso) return true;
    if (filtroCurso === 'OTROS') return !FILTROS_RAPIDOS.includes(lead.Curso);
    return lead.Curso === filtroCurso;
  }
  function coincideFiltrosExtra(lead, fila) {
    if (filtrosExtra.includes('sinAsignar') && fila.AsignadoAEmail) return false;
    if (filtrosExtra.includes('conWhatsapp') && !lead.WhatsApp) return false;
    if (filtrosExtra.includes('sinWhatsapp') && lead.WhatsApp) return false;
    if (filtrosExtra.includes('conEmail') && !lead.EmailEstudiante) return false;
    if (filtrosExtra.includes('altaPrioridad') && lead.Prioridad !== 'Alta') return false;
    if (filtrosExtra.includes('hoy') && estadoVencimiento(fila.FechaVence).urgencia !== 'proximo') return false;
    if (filtrosExtra.includes('atrasados') && !['reciente', 'critico'].includes(estadoVencimiento(fila.FechaVence).urgencia)) return false;
    return true;
  }
  const filaValida = (s) => {
    if (!esValidoSinFiltro(s)) return false;
    const lead = buscarLead(s.LeadID);
    if (!coincideBusquedaAmplia(lead, busqueda)) return false;
    if (!coincideFiltrosExtra(lead, s)) return false;
    return coincideFiltroRapido(lead);
  };
  // Una fila ya contactada no debe seguir apareciendo como "pendiente" en SU lote — pero sí debe
  // seguir contando en las estadísticas de "Total/Contactados" del encabezado de cada lote.
  const noContactada = (s) => s.Contactado !== 'TRUE';

  const vencido = (s) => new Date(s.FechaVence) <= ahora;
  const maniana = new Date(ahora); maniana.setDate(maniana.getDate() + 1); maniana.setHours(0, 0, 0, 0);
  const pasadoManiana = new Date(maniana); pasadoManiana.setDate(pasadoManiana.getDate() + 1);
  const venceManiana = (s) => {
    const f = new Date(s.FechaVence);
    return f >= maniana && f < pasadoManiana;
  };

  const lote0Todas = seguimiento.filter((s) => s.Lote === '1' && !vencido(s) && filaValida(s));
  const lote0 = lote0Todas.filter(noContactada);
  const lote1Todas = seguimiento.filter((s) => s.Lote === '1' && vencido(s) && filaValida(s));
  const lote1 = lote1Todas.filter(noContactada);
  const lote2Todas = seguimiento.filter((s) => s.Lote === '2' && vencido(s) && filaValida(s));
  const lote2 = lote2Todas.filter(noContactada);
  const lote3Todas = seguimiento.filter((s) => s.Lote === '3' && vencido(s) && filaValida(s));
  const lote3 = lote3Todas.filter(noContactada);
  const lote4Todas = seguimiento.filter((s) => s.Lote === '4' && vencido(s) && filaValida(s));
  const lote4 = lote4Todas.filter(noContactada);
  const lote5Todas = seguimiento.filter((s) => s.Lote === '5' && vencido(s) && filaValida(s));
  const lote5 = lote5Todas.filter(noContactada);

  const seAgreganManiana = (numeroLote) =>
    seguimiento.filter((s) => s.Lote === numeroLote && !vencido(s) && venceManiana(s) && filaValida(s) && noContactada(s)).length;
  const lote1Maniana = seAgreganManiana('1');
  const lote2Maniana = seAgreganManiana('2');
  const lote3Maniana = seAgreganManiana('3');
  const lote4Maniana = seAgreganManiana('4');
  const lote5Maniana = seAgreganManiana('5');

  // LOTE PROGRAMADO: cualquier fila (de cualquier lote) donde alguien pidió "contactame el [fecha]"
  // y esa fecha ya llegó — aparece acá aunque técnicamente esté "esperando" en su lote numérico.
  const loteProgramadoTodas = seguimiento.filter((s) =>
    s.FechaProgramada && new Date(s.FechaProgramada) <= ahora && filaValida(s)
  );
  const loteProgramado = loteProgramadoTodas.filter(noContactada);

  // SIN LOTE: leads que ya no aparecen en ningún lote activo, y por qué (venta confirmada,
  // o un resultado final como "No le interesa"). Sirve como resumen/auditoría de a dónde fue cada uno.
  const sinLote = [...leadsResueltos]
    .map((leadId) => {
      const lead = buscarLead(leadId);
      if (!lead) return null;
      if (!coincideBusquedaAmplia(lead, busqueda)) return null;
      if (!coincideFiltroRapido(lead)) return null;
      const filasLead = seguimiento.filter((s) => s.LeadID === leadId && RESULTADOS_FINALES.includes(s.Resultado));
      const masReciente = filasLead.sort((a, b) => new Date(b.FechaContacto) - new Date(a.FechaContacto))[0];
      return { lead, resultado: masReciente?.Resultado, fecha: masReciente?.FechaContacto, quien: masReciente?.AsignadoANombre };
    })
    .filter(Boolean);

  const todasLasFilasPendientes = seguimiento.filter((s) => esValidoSinFiltro(s));
  const leadIdsUnicos = [...new Set(todasLasFilasPendientes.map((s) => s.LeadID))];
  const contadoresPorCurso = { total: leadIdsUnicos.length, otros: 0 };
  FILTROS_RAPIDOS.forEach((c) => { contadoresPorCurso[c] = 0; });
  leadIdsUnicos.forEach((id) => {
    const lead = buscarLead(id);
    const curso = lead?.Curso;
    if (FILTROS_RAPIDOS.includes(curso)) contadoresPorCurso[curso]++;
    else contadoresPorCurso.otros++;
  });

  function exportarExcel() {
    exportarFilas(seguimiento);
  }

  const propsComunes = {
    buscarLead, onContactar: registrarContacto, onReasignar: reasignar,
    onVerFicha: setFichaLeadId, onMarcarVenta: setLeadVenta, puedeReasignar,
    seleccionados, onToggleSeleccion: toggleSeleccion, onAbrirReasignarModal: (leadId, lote) => setModalReasignar({ leadId, lote }),
    dimensionAgrupacion, ordenPor
  };

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-[1300px] mx-auto px-4 pb-24">
        {cargando ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : (
          <>
            <div className="flex justify-between items-start mb-3 no-print gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <FiltroPill activo={!filtroCurso} onClick={() => setFiltroCurso('')} label="Todos" count={contadoresPorCurso.total} />
                {FILTROS_RAPIDOS.map((c) => (
                  <FiltroPill key={c} activo={filtroCurso === c} onClick={() => setFiltroCurso(c)}
                    label={c} count={contadoresPorCurso[c]} />
                ))}
                <FiltroPill activo={filtroCurso === 'OTROS'} onClick={() => setFiltroCurso('OTROS')}
                  label="Otros" count={contadoresPorCurso.otros} />
                <input ref={busquedaRef} value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="🔍 Buscar (Ctrl+F): nombre, whatsapp, email, IG, curso, país…"
                  className="bg-bg border border-border rounded-lg px-3 py-2 text-sm w-64" />
              </div>
              <button onClick={exportarExcel} className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm shrink-0">
                ⬇ Exportar a Excel
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-3 no-print">
              {[
                { k: 'sinAsignar', l: 'Sin asignar' }, { k: 'conWhatsapp', l: 'Con WhatsApp' },
                { k: 'sinWhatsapp', l: 'Sin WhatsApp' }, { k: 'conEmail', l: 'Con Email' },
                { k: 'altaPrioridad', l: '⭐ Alta prioridad' }, { k: 'hoy', l: '⏰ Vence hoy' }, { k: 'atrasados', l: '🔴 Atrasados' }
              ].map(({ k, l }) => (
                <button key={k} onClick={() => toggleFiltroExtra(k)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    filtrosExtra.includes(k) ? 'bg-infoBg border-infoText/40 text-infoText' : 'bg-surface2 border-border text-textMuted hover:text-textSec'
                  }`}>
                  {l}
                </button>
              ))}

              <span className="w-px h-4 bg-border mx-1" />

              <label className="text-[11px] text-textMuted">Agrupar por</label>
              <select value={dimensionAgrupacion} onChange={(e) => setDimensionAgrupacion(e.target.value)}
                className="bg-surface2 border border-border rounded-md px-2 py-1 text-[11px]">
                <option value="curso">Curso</option>
                <option value="responsable">Responsable</option>
                <option value="pais">País</option>
                <option value="origen">Origen</option>
              </select>

              <label className="text-[11px] text-textMuted">Ordenar</label>
              <select value={ordenPor} onChange={(e) => setOrdenPor(e.target.value)}
                className="bg-surface2 border border-border rounded-md px-2 py-1 text-[11px]">
                <option value="antiguos">Más antiguos primero</option>
                <option value="atrasado">Más atrasado</option>
                <option value="reciente">Más reciente</option>
                <option value="nombre">Nombre</option>
              </select>
            </div>

            <SeccionLote
              titulo="LOTE 0" subtitulo="Leads recién ingresados (últimos 30 días)"
              explicacion={<>Si todavía no lo contactaste, en 48hs va a aparecer solo en el <b>Lote 1</b>. Si registrás
                "No contestó" o "Va a pensarlo", sigue escalando de lote en lote (1 → 2 → 3 → 4 → 5) hasta
                resolverse. Si registrás <b>"No le interesa"</b>, se saca del camino de seguimiento y no vuelve
                a aparecer. Apenas se marca la venta, el lead desaparece de todos los lotes automáticamente.</>}
              filas={lote0} filasTotales={lote0Todas} conObservaciones {...propsComunes}
            />
            <SeccionLote
              titulo="LOTE 1 – Contactar a las 48 horas" subtitulo={<>{lote1.length} lead(s) por contactar{lote1Maniana > 0 && <AvisoManiana cantidad={lote1Maniana} />}</>}
              explicacion={<>Si registrás "No contestó" o "Va a pensarlo" pasa solo al Lote 2 (10 días). Si marcás la venta, desaparece de acá.</>}
              filas={lote1} filasTotales={lote1Todas} conObservaciones {...propsComunes}
            />
            <SeccionLote
              titulo="LOTE 2 – Contactar a los 10 días" subtitulo={<>{lote2.length} lead(s) que no respondieron en el Lote 1{lote2Maniana > 0 && <AvisoManiana cantidad={lote2Maniana} />}</>}
              explicacion={<>Si sigue sin resolverse, pasa al Lote 3 (al mes). Si marcás la venta, desaparece de acá.</>}
              filas={lote2} filasTotales={lote2Todas} {...propsComunes}
            />
            <SeccionLote
              titulo="LOTE 3 – Contactar al mes" subtitulo={<>{lote3.length} lead(s) sin resolver al mes de ingresados{lote3Maniana > 0 && <AvisoManiana cantidad={lote3Maniana} />}</>}
              explicacion={<>Requiere que un Coordinador/Admin lo asigne. Si sigue sin resolverse, pasa al Lote 4 (2 meses).</>}
              filas={lote3} filasTotales={lote3Todas} sinAsignarPorDefecto {...propsComunes}
            />
            <SeccionLote
              titulo="LOTE 4 – Contactar a los 2 meses" subtitulo={<>{lote4.length} lead(s) sin resolver a los 2 meses de ingresados{lote4Maniana > 0 && <AvisoManiana cantidad={lote4Maniana} />}</>}
              explicacion={<>Requiere asignación. Si sigue sin resolverse, pasa al Lote 5 (3 meses).</>}
              filas={lote4} filasTotales={lote4Todas} sinAsignarPorDefecto {...propsComunes}
            />
            <SeccionLote
              titulo="LOTE 5 – Contactar a los 3 meses" subtitulo={<>{lote5.length} lead(s) sin resolver a los 3 meses de ingresados{lote5Maniana > 0 && <AvisoManiana cantidad={lote5Maniana} />}</>}
              explicacion={<>Último lote de seguimiento automático. Si marcás la venta, desaparece de acá como cualquier otro lote.</>}
              filas={lote5} filasTotales={lote5Todas} sinAsignarPorDefecto {...propsComunes}
            />
            <SeccionLote
              titulo="📅 LOTE PROGRAMADO" subtitulo={`${loteProgramado.length} lead(s) que pidieron ser contactados en una fecha puntual, y esa fecha ya llegó`}
              explicacion={<>Aparece acá cualquier lead (esté en el lote que esté) al que le registraste "contactame el [fecha]" y esa fecha ya se cumplió. No reemplaza su lote normal, es un recordatorio extra.</>}
              filas={loteProgramado} filasTotales={loteProgramadoTodas} sinAsignarPorDefecto {...propsComunes}
            />

            <SeccionSinLote sinLote={sinLote} onVerFicha={setFichaLeadId} />
          </>
        )}
      </div>

      {seleccionados.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface2 border-t border-border p-4 flex items-center justify-between flex-wrap gap-3 z-30">
          <p className="text-sm font-semibold">{seleccionados.size} seleccionado(s)</p>
          <div className="flex items-center gap-2 flex-wrap">
            {puedeReasignar && (
              <button onClick={() => setModalReasignar({ masivo: true })}
                className="text-xs px-3 py-1.5 rounded-md bg-surface border border-border">Asignar responsable</button>
            )}
            <select onChange={(e) => { if (e.target.value) marcarContactoMasivo(e.target.value); e.target.value = ''; }}
              defaultValue="" className="text-xs px-3 py-1.5 rounded-md bg-surface border border-border">
              <option value="" disabled>Marcar contacto…</option>
              {RESULTADOS_CONTACTO.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button onClick={exportarSeleccionados}
              className="text-xs px-3 py-1.5 rounded-md bg-surface border border-border">⬇ Exportar seleccionados</button>
            {esAdmin && (
              <button onClick={() => setConfirmarEliminarLeads(true)}
                className="text-xs px-3 py-1.5 rounded-md border border-dangerText/40 text-dangerText hover:bg-dangerBg">
                🗑 Eliminar seleccionados
              </button>
            )}
            <button onClick={() => setSeleccionados(new Set())}
              className="text-xs px-3 py-1.5 rounded-md bg-dangerBg text-dangerText">Cancelar</button>
          </div>
        </div>
      )}

      {confirmarEliminarLeads && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface2 border border-border rounded-2xl p-6 w-96">
            <p className="text-sm font-bold mb-2">¿Estás seguro de que querés eliminar estos leads?</p>
            <p className="text-textSec text-sm mb-5">
              Se van a eliminar <b>{seleccionados.size}</b> lead(s) junto con su seguimiento asociado.
              Los que ya tengan una venta confirmada quedan protegidos automáticamente. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmarEliminarLeads(false)}
                className="flex-1 bg-surface border border-border rounded-lg py-2 text-sm">Cancelar</button>
              <button onClick={eliminarSeleccionados}
                className="flex-1 bg-dangerText text-white rounded-lg py-2 text-sm font-semibold">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {modalReasignar && (
        <ModalReasignar
          onClose={() => setModalReasignar(null)}
          onConfirmar={(email, nombre) => {
            if (modalReasignar.masivo) reasignarMasivo(email, nombre);
            else reasignar(modalReasignar.leadId, modalReasignar.lote, email, nombre);
            if (!modalReasignar.masivo) setModalReasignar(null);
          }}
        />
      )}

      <FichaDrawer leadId={fichaLeadId} usuario={usuario} onClose={() => setFichaLeadId(null)} />
      <ModalVenta lead={leadVenta} onClose={() => setLeadVenta(null)} onConfirm={confirmarVenta} usuarioActual={usuario} />
      {toast}
    </div>
  );
}

function CopyButton({ valor }) {
  const [copiado, setCopiado] = useState(false);
  function copiar(e) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(valor);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }
  return (
    <button onClick={copiar} title="Copiar" className="text-textMuted hover:text-accentTeal">
      {copiado ? '✓' : '📋'}
    </button>
  );
}

// "+N se agregan mañana" — texto base 100% sólido y nítido (color ámbar normal), con un
// reflejo fino superpuesto encima que se desliza cada pocos segundos. El texto se duplica
// en una capa absoluta idéntica: la de abajo es el color real, la de arriba solo deja ver
// el brillo pasando, nunca cambia el color base ni agrega sombra/blur.
function AvisoManiana({ cantidad }) {
  const texto = `+${cantidad} se agregan mañana`;
  return (
    <> · <span className="aviso-manana-wrap">
      {texto}
      <span className="aviso-manana-overlay" aria-hidden="true">{texto}</span>
    </span></>
  );
}

function FiltroPill({ activo, onClick, label, count }) {
  return (
    <button onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${
        activo ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent'
               : 'bg-surface2 border-border text-textSec hover:text-text hover:border-accentTeal'
      }`}>
      {label} <span className={activo ? 'opacity-80' : 'text-textMuted'}>({count})</span>
    </button>
  );
}

// Modal simple para reasignar (individual o masivo), con buscador de persona.
function ModalReasignar({ onClose, onConfirmar }) {
  const [busqueda, setBusqueda] = useState('');
  const filtradas = EMAILS_ASIGNABLES.filter((p) => p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface2 border border-border rounded-2xl p-5 w-80" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-bold mb-3">Reasignar a…</p>
        <input autoFocus value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar persona…" className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />
        <div className="space-y-1 max-h-56 overflow-y-auto">
          {filtradas.length === 0 && <p className="text-textMuted text-xs">Sin resultados.</p>}
          {filtradas.map((p) => (
            <button key={p.email} onClick={() => onConfirmar(p.email, p.nombre)}
              className="w-full flex items-center gap-2 text-left px-2 py-2 rounded-lg hover:bg-bg text-sm">
              <span className={`w-6 h-6 rounded-full ${colorAvatar(p.nombre)} text-white text-[10px] flex items-center justify-center font-bold`}>
                {iniciales(p.nombre)}
              </span>
              {p.nombre}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-3 text-xs text-textMuted">Cancelar</button>
      </div>
    </div>
  );
}

// Resumen de leads que ya no están en seguimiento activo: por qué (no le interesa, ya vendido, etc.)
function SeccionSinLote({ sinLote, onVerFicha }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <button onClick={() => setAbierta(!abierta)} className="w-full flex items-start justify-between text-left">
        <div>
          <p className="text-sm font-semibold mb-1">🚫 SIN LOTE</p>
          <p className="text-textMuted text-xs">{sinLote.length} lead(s) que ya salieron del seguimiento activo — para saber por qué</p>
        </div>
        <span className="text-textMuted text-sm shrink-0 ml-3">{abierta ? '▲' : '▼'}</span>
      </button>
      {abierta && (
        <div className="mt-3">
          {sinLote.length === 0 ? (
            <p className="text-textMuted text-sm">No hay nadie fuera del seguimiento activo con estos filtros.</p>
          ) : (
            sinLote.map(({ lead, resultado, fecha, quien }) => (
              <div key={lead.ID} className="flex items-center justify-between gap-3 border-t border-border first:border-t-0 py-2">
                <p className="text-sm text-textSec">
                  <span className="font-medium text-text">{lead.Nombre} {lead.Apellido}</span> — {lead.Curso || 'sin curso'}
                  <span className="text-warningText"> · Sin lote debido a que "{resultado}"</span>
                  {fecha && <span className="text-textMuted"> · {new Date(fecha).toLocaleDateString('es-AR')}{quien && ` · ${quien}`}</span>}
                </p>
                <button onClick={() => onVerFicha(lead.ID)} className="text-accentTeal text-xs font-semibold shrink-0">Ver ficha</button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SeccionLote({ titulo, subtitulo, explicacion, filas, filasTotales, buscarLead, ultima, dimensionAgrupacion, ordenPor, ...propsFila }) {
  const [abierta, setAbierta] = useState(false);
  const grupos = agruparYOrdenar(filas, buscarLead, dimensionAgrupacion, ordenPor);
  const total = (filasTotales || filas).length;
  const pendientes = filas.length;
  const contactadas = total - pendientes;

  return (
    <div className={`bg-surface border border-border rounded-2xl p-5 transition-all ${ultima ? '' : 'mb-4'}`}>
      <button onClick={() => setAbierta(!abierta)} className="w-full flex items-start justify-between text-left">
        <div>
          <p className="text-sm font-semibold mb-1">{titulo}</p>
          <p className="text-textMuted text-xs">{subtitulo}</p>
          {total > 0 && (
            <p className="text-textMuted text-[11px] mt-0.5">
              Total {total} · Contactados {contactadas} ·{' '}
              {pendientes > 0 ? (
                <span className="text-warningText font-semibold drop-shadow-[0_0_6px_rgba(251,191,36,0.55)]">
                  Pendientes {pendientes}
                </span>
              ) : (
                <>Pendientes {pendientes}</>
              )}
            </p>
          )}
        </div>
        <span className="text-textMuted text-sm shrink-0 ml-3">{abierta ? '▲' : '▼'}</span>
      </button>
      {abierta && (
        <>
          <p className="text-textMuted text-[11px] mt-1 mb-3">{explicacion}</p>
          {filas.length === 0 ? (
            <p className="text-textMuted text-sm">Nada pendiente en este lote.</p>
          ) : (
            grupos.map(([clave, filasDelGrupo]) => (
              <GrupoCurso key={clave} curso={clave} filas={filasDelGrupo} buscarLead={buscarLead} {...propsFila} />
            ))
          )}
        </>
      )}
    </div>
  );
}

function GrupoCurso({ curso, filas, buscarLead, ...propsFila }) {
  const [abierto, setAbierto] = useState(true);
  return (
    <div className="mb-2 last:mb-0">
      <button onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center justify-between text-left py-1.5 text-xs font-semibold text-textSec hover:text-text">
        <span>{curso} <span className="text-textMuted font-normal">({filas.length})</span></span>
        <span className="text-textMuted">{abierto ? '▲' : '▼'}</span>
      </button>
      {abierto && (
        <div className="pl-1">
          {filas.map((s) => (
            <FilaLote key={`${s.LeadID}-${s.Lote}`} fila={s} lead={buscarLead(s.LeadID)} {...propsFila} />
          ))}
        </div>
      )}
    </div>
  );
}

const SUGERENCIAS_PROXIMA_ACCION = {
  'No contestó': ['Volver a llamar', 'Enviar WhatsApp', 'Enviar Email'],
  'Va a pensarlo': ['Enviar recordatorio en 3 días', 'Enviar WhatsApp']
};

const PLANTILLAS_WHATSAPP = [
  { label: 'Hola', texto: '¡Hola! ¿Cómo estás? Te escribo de ILCE.' },
  { label: 'Seguimiento', texto: 'Hola, quería hacer un seguimiento sobre tu consulta. ¿Seguís interesado/a?' },
  { label: 'Recordatorio', texto: 'Hola, te recordamos que seguimos a disposición por cualquier consulta.' }
];

function FilaLote({
  fila, lead, onContactar, onReasignar, onVerFicha, onMarcarVenta, puedeReasignar, conObservaciones, sinAsignarPorDefecto,
  seleccionados, onToggleSeleccion, onAbrirReasignarModal
}) {
  const [resultadoElegido, setResultadoElegido] = useState(null);
  const [observaciones, setObservaciones] = useState('');
  const [proximaAccion, setProximaAccion] = useState('');
  const [fechaProgramada, setFechaProgramada] = useState('');
  const [menuWhatsapp, setMenuWhatsapp] = useState(false);

  if (!lead) return null;
  const contactado = fila.Contactado === 'TRUE';
  const sinAsignar = sinAsignarPorDefecto && !fila.AsignadoAEmail;
  const clave = `${fila.LeadID}__${fila.Lote}`;
  const seleccionado = seleccionados?.has(clave);
  const venc = estadoVencimiento(fila.FechaVence);
  const iconos = indicadores(lead, fila);

  const colorUrgencia = {
    proximo: 'text-warningText', reciente: 'text-warningText', critico: 'text-dangerText', lejos: 'text-textMuted'
  }[venc.urgencia];

  function elegirResultado(valor) {
    setResultadoElegido(valor);
  }

  function confirmarResultado() {
    onContactar(fila.LeadID, fila.Lote, resultadoElegido, observaciones, proximaAccion, fechaProgramada);
    if (resultadoElegido === 'Pago recibido') onMarcarVenta(lead);
    setResultadoElegido(null);
  }

  const whatsappLimpio = lead.WhatsApp ? lead.WhatsApp.replace(/[^\d]/g, '') : '';

  return (
    <div className={`border-t border-border first:border-t-0 py-3 transition-colors ${seleccionado ? 'bg-infoBg/30' : ''}`}>
      <div className="flex items-start gap-2">
        {onToggleSeleccion && (
          <input type="checkbox" checked={!!seleccionado} onChange={() => onToggleSeleccion(fila.LeadID, fila.Lote)}
            className="mt-1.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <p className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
              {lead.Nombre} {lead.Apellido} — {lead.Curso || 'sin curso'}
              {iconos.map((ic) => <span key={ic.icono} title={ic.titulo}>{ic.icono}</span>)}
              <span className={`font-normal text-xs ${colorUrgencia}`}>· {venc.texto}</span>
            </p>
            <div className="flex items-center gap-2">
              {lead.WhatsApp && (
                <div className="relative">
                  <button type="button" onClick={() => setMenuWhatsapp(!menuWhatsapp)}
                    className="w-6 h-6 flex items-center justify-center rounded-md border border-border text-xs" title="WhatsApp">💬</button>
                  {menuWhatsapp && (
                    <div className="absolute right-0 top-7 z-20 bg-surface2 border border-border rounded-lg p-2 w-48 shadow-xl">
                      <a href={`https://wa.me/${whatsappLimpio}`} target="_blank" rel="noopener noreferrer"
                        className="block text-xs px-2 py-1.5 rounded hover:bg-bg">Abrir conversación</a>
                      <button onClick={() => { navigator.clipboard.writeText(lead.WhatsApp); setMenuWhatsapp(false); }}
                        className="block w-full text-left text-xs px-2 py-1.5 rounded hover:bg-bg">Copiar teléfono</button>
                      <hr className="border-border my-1" />
                      <p className="text-[10px] text-textMuted px-2 mb-1">Mensaje predefinido</p>
                      {PLANTILLAS_WHATSAPP.map((pl) => (
                        <a key={pl.label} href={`https://wa.me/${whatsappLimpio}?text=${encodeURIComponent(pl.texto)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="block text-xs px-2 py-1.5 rounded hover:bg-bg">{pl.label}</a>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {lead.EmailEstudiante && (
                <a href={enlaceGmail(lead.EmailEstudiante)} target="_blank" rel="noopener noreferrer" className="w-6 h-6 flex items-center justify-center rounded-md border border-border text-xs" title="Email">✉️</a>
              )}
              <a href={`tel:${whatsappLimpio}`} className="w-6 h-6 flex items-center justify-center rounded-md border border-border text-xs" title="Llamar">📞</a>
              <button onClick={() => onMarcarVenta(lead)} className="text-xs px-3 py-1 rounded bg-accentPurple text-white">Venta</button>
              <button onClick={() => onVerFicha(lead.ID)} className="text-accentTeal text-xs font-semibold">Ficha</button>
            </div>
          </div>

          <p className="text-xs text-textMuted mt-0.5 mb-1.5 flex items-center gap-2 flex-wrap">
            {lead.WhatsApp && <span className="inline-flex items-center gap-1">📱 {lead.WhatsApp} <CopyButton valor={lead.WhatsApp} /></span>}
            {lead.EmailEstudiante && <span className="inline-flex items-center gap-1">✉️ {lead.EmailEstudiante} <CopyButton valor={lead.EmailEstudiante} /></span>}
            {lead.InstagramUsuario && <span className="inline-flex items-center gap-1">📷 {lead.InstagramUsuario} <CopyButton valor={lead.InstagramUsuario} /></span>}
            {lead.Pais && <span>🌎 {lead.Pais}</span>}
            {lead.Origen && <span>Origen: {lead.Origen}</span>}
            {lead.CursosAdicionales && <span>· También le interesa: {lead.CursosAdicionales}</span>}
          </p>

          <div className="flex items-center gap-2 text-xs text-textMuted mt-1 mb-2 flex-wrap">
            {sinAsignar ? (
              <span className="text-warningText font-semibold">Sin asignación</span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full ${colorAvatar(fila.AsignadoANombre)} text-white text-[9px] flex items-center justify-center font-bold`}>
                  {iniciales(fila.AsignadoANombre)}
                </span>
                {fila.AsignadoANombre || '—'}
              </span>
            )}
            {puedeReasignar && (
              <button onClick={() => onAbrirReasignarModal(fila.LeadID, fila.Lote)}
                className="text-accentTeal font-semibold">{sinAsignar ? 'Asignar' : 'Reasignar'}</button>
            )}
          </div>

          {contactado ? (
            <p className="text-successText text-xs">
              ✓ {fila.Resultado}
              {fila.Observaciones && <span className="text-textMuted"> · {fila.Observaciones}</span>}
              {fila.ProximaAccion && <span className="text-textMuted"> · Próxima acción: {fila.ProximaAccion}</span>}
            </p>
          ) : resultadoElegido ? (
            <div className="bg-bg border border-border rounded-lg p-3">
              <p className="text-xs font-semibold mb-2">Resultado: {resultadoElegido}</p>
              {conObservaciones && (
                <textarea autoFocus rows={2} placeholder="Observaciones (opcional)" value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full bg-surface2 border border-border rounded px-2 py-1.5 text-xs mb-2" />
              )}
              {SUGERENCIAS_PROXIMA_ACCION[resultadoElegido] && (
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {SUGERENCIAS_PROXIMA_ACCION[resultadoElegido].map((s) => (
                    <button key={s} type="button" onClick={() => setProximaAccion(s)}
                      className={`text-[11px] px-2 py-1 rounded-full border ${
                        proximaAccion === s ? 'bg-accentPurple border-accentPurple text-white' : 'bg-surface2 border-border text-textSec'
                      }`}>{s}</button>
                  ))}
                </div>
              )}
              {!RESULTADOS_FINALES.includes(resultadoElegido) && (
                <div className="mb-2">
                  <label className="text-[11px] text-textMuted block mb-1">📅 ¿Te pidió que lo contactes en una fecha puntual? (opcional)</label>
                  <input type="date" value={fechaProgramada} onChange={(e) => setFechaProgramada(e.target.value)}
                    className="bg-surface2 border border-border rounded px-2 py-1 text-xs" />
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setResultadoElegido(null)} className="text-xs px-3 py-1 rounded bg-surface2 border border-border">Cancelar</button>
                <button onClick={confirmarResultado} className="text-xs px-3 py-1 rounded bg-accentPurple text-white font-semibold">Guardar ✓</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {RESULTADOS_PRINCIPALES.map((r) => (
                <button key={r.valor} onClick={() => elegirResultado(r.valor)}
                  className="text-xs px-2.5 py-1 rounded-full bg-surface2 border border-border hover:border-accentTeal">
                  {r.emoji} {r.valor}
                </button>
              ))}
              <select onChange={(e) => { if (e.target.value) elegirResultado(e.target.value); e.target.value = ''; }}
                defaultValue="" className="text-xs px-2 py-1 rounded-full bg-surface2 border border-border text-textMuted">
                <option value="" disabled>Otro resultado…</option>
                {RESULTADOS_SECUNDARIOS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
