'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav, { puedeVerOperativo } from '../../components/Nav';
import FichaDrawer from '../../components/FichaDrawer';
import ModalVenta from '../../components/ModalVenta';
import { useToast } from '../../components/Toast';
import { useSession } from '../../lib/useSession';
import { RESULTADOS_CONTACTO, CURSOS, RESULTADOS_FINALES } from '../../lib/constants';

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

function tiempoDesde(fecha) {
  const dias = Math.floor((new Date() - new Date(fecha)) / (24 * 60 * 60 * 1000));
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Hace 1 día';
  return `Hace ${dias} días`;
}

// Agrupa un array de filas de seguimiento por el curso del lead asociado, ordena cada grupo
// (más antiguos primero, luego por nombre) y devuelve un array de grupos ordenado alfabéticamente
// ("Sin curso" siempre al final).
function agruparPorCurso(filas, buscarLead) {
  const grupos = {};
  filas.forEach((f) => {
    const lead = buscarLead(f.LeadID);
    const curso = lead?.Curso || 'Sin curso definido';
    if (!grupos[curso]) grupos[curso] = [];
    grupos[curso].push(f);
  });
  Object.values(grupos).forEach((arr) => {
    arr.sort((a, b) => {
      const la = buscarLead(a.LeadID);
      const lb = buscarLead(b.LeadID);
      const fechaA = new Date(la?.FechaIngreso || 0);
      const fechaB = new Date(lb?.FechaIngreso || 0);
      if (fechaA - fechaB !== 0) return fechaA - fechaB;
      return (la?.Nombre || '').localeCompare(lb?.Nombre || '', 'es');
    });
  });
  return Object.entries(grupos).sort(([a], [b]) => {
    if (a === 'Sin curso definido') return 1;
    if (b === 'Sin curso definido') return -1;
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

  const puedeReasignar = usuario?.roles?.includes('Admin') || usuario?.roles?.includes('Coordinador');

  useEffect(() => {
    if (!usuario) return;
    cargarDatos();
  }, [usuario]);

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

  async function registrarContacto(leadId, lote, resultado, observaciones, proximaAccion) {
    await fetch('/api/seguimiento', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'contactar', leadId, lote, resultado, observaciones, proximaAccion,
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

  if (cargandoSesion) {
    return null;
  }
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

  // Un registro de seguimiento solo se muestra si: el lead todavía no fue marcado como venta,
  // Y no dio ya una respuesta definitiva/de avance en ningún lote previo (eso lo saca del camino
  // de seguimiento para siempre — no tiene sentido seguir "molestando").
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
  const filaValida = (s) => {
    if (!esValidoSinFiltro(s)) return false;
    const lead = buscarLead(s.LeadID);
    if (busqueda.trim() && !`${lead.Nombre} ${lead.Apellido}`.toLowerCase().includes(busqueda.trim().toLowerCase())) {
      return false;
    }
    return coincideFiltroRapido(lead);
  };

  const vencido = (s) => new Date(s.FechaVence) <= ahora;

  // LOTE 0 y LOTE 1 son EXACTAMENTE el mismo dato (la fila de Seguimiento del Lote "1"),
  // la única diferencia es si ya venció el plazo de 48hs o no — visualmente son idénticos.
  const lote0 = seguimiento.filter((s) => s.Lote === '1' && !vencido(s) && filaValida(s));
  const lote1 = seguimiento.filter((s) => s.Lote === '1' && vencido(s) && filaValida(s));
  const lote2 = seguimiento.filter((s) => s.Lote === '2' && vencido(s) && filaValida(s));
  const lote3 = seguimiento.filter((s) => s.Lote === '3' && vencido(s) && filaValida(s));
  const lote4 = seguimiento.filter((s) => s.Lote === '4' && vencido(s) && filaValida(s));
  const lote5 = seguimiento.filter((s) => s.Lote === '5' && vencido(s) && filaValida(s));

  // Contadores para los filtros rápidos: sobre TODOS los leads con seguimiento pendiente
  // (sin aplicar todavía el filtro de curso), para que el número no cambie según lo que ya esté filtrado.
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
    const hoja = XLSX.utils.json_to_sheet(
      seguimiento.map((s) => {
        const l = buscarLead(s.LeadID);
        return {
          Lead: l ? `${l.Nombre} ${l.Apellido}` : s.LeadID,
          Lote: s.Lote,
          AsignadoA: s.AsignadoANombre,
          Contactado: s.Contactado === 'TRUE' ? 'Sí' : 'No',
          Resultado: s.Resultado,
          Observaciones: s.Observaciones,
          ProximaAccion: s.ProximaAccion,
          FechaVence: s.FechaVence ? new Date(s.FechaVence).toLocaleString('es-AR') : ''
        };
      })
    );
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Seguimiento');
    XLSX.writeFile(libro, `seguimiento-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-5xl mx-auto px-6 pb-16">
        {cargando ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : (
          <>
            <div className="flex justify-between items-start mb-4 no-print gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <FiltroPill activo={!filtroCurso} onClick={() => setFiltroCurso('')} label="Todos" count={contadoresPorCurso.total} />
                {FILTROS_RAPIDOS.map((c) => (
                  <FiltroPill key={c} activo={filtroCurso === c} onClick={() => setFiltroCurso(c)}
                    label={c} count={contadoresPorCurso[c]} />
                ))}
                <FiltroPill activo={filtroCurso === 'OTROS'} onClick={() => setFiltroCurso('OTROS')}
                  label="Otros" count={contadoresPorCurso.otros} />
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="🔍 Buscar por nombre…"
                  className="bg-bg border border-border rounded-lg px-3 py-2 text-sm w-48" />
              </div>
              <button onClick={exportarExcel} className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm shrink-0">
                ⬇ Exportar a Excel
              </button>
            </div>

            <SeccionLote
              titulo="LOTE 0" subtitulo="Leads recién ingresados (últimos 30 días)"
              explicacion={<>Si todavía no lo contactaste, en 48hs va a aparecer solo en el <b>Lote 1</b>. Si registrás
                "No contestó" o "Va a pensarlo", sigue escalando de lote en lote (1 → 2 → 3 → 4 → 5) hasta
                resolverse. Si registrás <b>"No le interesa"</b>, se saca del camino de seguimiento y no vuelve
                a aparecer. Apenas se marca la venta, el lead desaparece de todos los lotes automáticamente.</>}
              filas={lote0} buscarLead={buscarLead} onContactar={registrarContacto} onReasignar={reasignar}
              onVerFicha={setFichaLeadId} onMarcarVenta={setLeadVenta} puedeReasignar={puedeReasignar} conObservaciones
            />

            <SeccionLote
              titulo="LOTE 1 – Contactar a las 48 horas" subtitulo={`${lote1.length} lead(s) por contactar`}
              explicacion={<>Si registrás "No contestó" o "Va a pensarlo" pasa solo al Lote 2 (10 días). Si marcás la venta, desaparece de acá.</>}
              filas={lote1} buscarLead={buscarLead} onContactar={registrarContacto} onReasignar={reasignar}
              onVerFicha={setFichaLeadId} onMarcarVenta={setLeadVenta} puedeReasignar={puedeReasignar} conObservaciones
            />

            <SeccionLote
              titulo="LOTE 2 – Contactar a los 10 días" subtitulo={`${lote2.length} lead(s) que no respondieron en el Lote 1`}
              explicacion={<>Si sigue sin resolverse, pasa al Lote 3 (al mes). Si marcás la venta, desaparece de acá.</>}
              filas={lote2} buscarLead={buscarLead} onContactar={registrarContacto} onReasignar={reasignar}
              onVerFicha={setFichaLeadId} onMarcarVenta={setLeadVenta} puedeReasignar={puedeReasignar}
            />

            <SeccionLote
              titulo="LOTE 3 – Contactar al mes" subtitulo={`${lote3.length} lead(s) sin resolver al mes de ingresados`}
              explicacion={<>Requiere que un Coordinador/Admin lo asigne. Si sigue sin resolverse, pasa al Lote 4 (2 meses).</>}
              filas={lote3} buscarLead={buscarLead} onContactar={registrarContacto} onReasignar={reasignar}
              onVerFicha={setFichaLeadId} onMarcarVenta={setLeadVenta} puedeReasignar={puedeReasignar} sinAsignarPorDefecto
            />

            <SeccionLote
              titulo="LOTE 4 – Contactar a los 2 meses" subtitulo={`${lote4.length} lead(s) sin resolver a los 2 meses de ingresados`}
              explicacion={<>Requiere asignación. Si sigue sin resolverse, pasa al Lote 5 (3 meses).</>}
              filas={lote4} buscarLead={buscarLead} onContactar={registrarContacto} onReasignar={reasignar}
              onVerFicha={setFichaLeadId} onMarcarVenta={setLeadVenta} puedeReasignar={puedeReasignar} sinAsignarPorDefecto
            />

            <SeccionLote
              ultima
              titulo="LOTE 5 – Contactar a los 3 meses" subtitulo={`${lote5.length} lead(s) sin resolver a los 3 meses de ingresados`}
              explicacion={<>Último lote de seguimiento automático. Si marcás la venta, desaparece de acá como cualquier otro lote.</>}
              filas={lote5} buscarLead={buscarLead} onContactar={registrarContacto} onReasignar={reasignar}
              onVerFicha={setFichaLeadId} onMarcarVenta={setLeadVenta} puedeReasignar={puedeReasignar} sinAsignarPorDefecto
            />
          </>
        )}
      </div>
      <FichaDrawer leadId={fichaLeadId} usuario={usuario} onClose={() => setFichaLeadId(null)} />
      <ModalVenta lead={leadVenta} onClose={() => setLeadVenta(null)} onConfirm={confirmarVenta} usuarioActual={usuario} />
      {toast}
    </div>
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

// Un lote completo: título + explicación + todas sus filas agrupadas por curso, cada grupo
// plegable/desplegable. Lote 0 y Lote 1 usan este mismo componente — visualmente son idénticos,
// la diferencia está solo en qué filas les llegan desde afuera (vencidas o no).
function SeccionLote({ titulo, subtitulo, explicacion, filas, buscarLead, ultima, ...propsFila }) {
  const grupos = agruparPorCurso(filas, buscarLead);
  return (
    <div className={`bg-surface border border-border rounded-2xl p-5 ${ultima ? '' : 'mb-4'}`}>
      <p className="text-sm font-semibold mb-1">{titulo}</p>
      <p className="text-textMuted text-xs mb-1">{subtitulo}</p>
      <p className="text-textMuted text-[11px] mb-3">{explicacion}</p>
      {filas.length === 0 ? (
        <p className="text-textMuted text-sm">Nada pendiente en este lote.</p>
      ) : (
        grupos.map(([curso, filasDelCurso]) => (
          <GrupoCurso key={curso} curso={curso} filas={filasDelCurso} buscarLead={buscarLead} {...propsFila} />
        ))
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

function FilaLote({ fila, lead, onContactar, onReasignar, onVerFicha, onMarcarVenta, puedeReasignar, conObservaciones, sinAsignarPorDefecto }) {
  const [resultado, setResultado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [proximaAccion, setProximaAccion] = useState('');

  if (!lead) return null;
  const contactado = fila.Contactado === 'TRUE';
  const sinAsignar = sinAsignarPorDefecto && !fila.AsignadoAEmail;

  function guardar() {
    onContactar(fila.LeadID, fila.Lote, resultado, observaciones, proximaAccion);
    // Si el resultado es "Pago recibido", abrimos directo el modal de venta —
    // no tiene sentido hacer un segundo click para lo que ya sabemos que va a pasar.
    if (resultado === 'Pago recibido') onMarcarVenta(lead);
  }

  return (
    <div className="border-t border-border first:border-t-0 py-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {lead.Nombre} {lead.Apellido} — {lead.Curso || 'sin curso'}
          <span className="text-textMuted font-normal text-xs ml-2">
            · {tiempoDesde(lead.FechaIngreso)} ({new Date(lead.FechaIngreso).toLocaleDateString('es-AR')})
          </span>
        </p>
        <div className="flex items-center gap-2">
          {lead.WhatsApp && (
            <a href={`https://wa.me/${lead.WhatsApp.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="w-6 h-6 flex items-center justify-center rounded-md border border-border text-xs" title="WhatsApp">💬</a>
          )}
          <button onClick={() => onMarcarVenta(lead)} className="text-xs px-3 py-1 rounded bg-accentPurple text-white">
            Marcar venta
          </button>
          <button onClick={() => onVerFicha(lead.ID)} className="text-accentTeal text-xs font-semibold">Ver ficha</button>
        </div>
      </div>

      <p className="text-xs text-textMuted mt-0.5 mb-1.5">
        {[
          lead.WhatsApp && `📱 ${lead.WhatsApp}`,
          lead.EmailEstudiante && `✉️ ${lead.EmailEstudiante}`,
          lead.InstagramUsuario && `📷 ${lead.InstagramUsuario}`,
          lead.Pais && `🌎 ${lead.Pais}`,
          lead.Origen && `Origen: ${lead.Origen}`
        ].filter(Boolean).join('  ·  ')}
      </p>

      <div className="flex items-center gap-2 text-xs text-textMuted mt-1 mb-2">
        {sinAsignar ? (
          <span className="text-warningText font-semibold">Sin asignación</span>
        ) : (
          <span>Asignado a: {fila.AsignadoANombre || '—'}</span>
        )}
        {puedeReasignar && (
          <select
            defaultValue=""
            onChange={(e) => {
              const opt = e.target.selectedOptions[0];
              onReasignar(fila.LeadID, fila.Lote, e.target.value, opt.text);
            }}
            className="bg-bg border border-border rounded px-2 py-0.5"
          >
            <option value="" disabled>{sinAsignar ? 'Asignar a…' : 'Reasignar a…'}</option>
            {EMAILS_ASIGNABLES.map((p) => <option key={p.email} value={p.email}>{p.nombre}</option>)}
          </select>
        )}
      </div>

      {contactado ? (
        <p className="text-successText text-xs">
          ✓ {fila.Resultado}
          {fila.Observaciones && <span className="text-textMuted"> · {fila.Observaciones}</span>}
          {fila.ProximaAccion && <span className="text-textMuted"> · Próxima acción: {fila.ProximaAccion}</span>}
        </p>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <select value={resultado} onChange={(e) => setResultado(e.target.value)}
            className="bg-bg border border-border rounded px-2 py-1 text-xs">
            <option value="">Resultado del contacto</option>
            {RESULTADOS_CONTACTO.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {conObservaciones && (
            <>
              <input placeholder="Observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
                className="bg-bg border border-border rounded px-2 py-1 text-xs w-36" />
              <input placeholder="Próxima acción" value={proximaAccion} onChange={(e) => setProximaAccion(e.target.value)}
                className="bg-bg border border-border rounded px-2 py-1 text-xs w-36" />
            </>
          )}
          <button
            disabled={!resultado}
            onClick={guardar}
            className="text-xs px-3 py-1 rounded bg-accentPurple text-white disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      )}
    </div>
  );
}
