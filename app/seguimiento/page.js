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

  // LOTE 0: todos los leads recién ingresados (últimos 30 días) que todavía no compraron
  const lote0 = leads
    .filter((l) => l.Estado !== 'Comprado')
    .filter((l) => (ahora - new Date(l.FechaIngreso)) < 30 * 24 * 60 * 60 * 1000)
    .filter((l) => !busqueda.trim() || `${l.Nombre} ${l.Apellido}`.toLowerCase().includes(busqueda.trim().toLowerCase()))
    .filter((l) => !filtroCurso || l.Curso === filtroCurso)
    .sort((a, b) => new Date(b.FechaIngreso) - new Date(a.FechaIngreso));

  // Un registro de seguimiento solo se muestra si: coincide el filtro de formación Y el lead
  // todavía no fue marcado como venta, Y no dio ya una respuesta definitiva/de avance en ningún lote previo
  // (eso lo saca del camino de seguimiento para siempre — no tiene sentido seguir "molestando").
  const leadsResueltos = new Set(
    seguimiento.filter((s) => RESULTADOS_FINALES.includes(s.Resultado)).map((s) => s.LeadID)
  );
  const filaValida = (s) => {
    const l = buscarLead(s.LeadID);
    if (!l || l.Estado === 'Comprado') return false;
    if (leadsResueltos.has(s.LeadID)) return false;
    return !filtroCurso || l.Curso === filtroCurso;
  };

  const vencido = (s) => new Date(s.FechaVence) <= ahora;

  const lote1 = seguimiento.filter((s) => s.Lote === '1' && vencido(s) && filaValida(s));
  const lote2 = seguimiento.filter((s) => s.Lote === '2' && vencido(s) && filaValida(s));
  const lote3 = seguimiento.filter((s) => s.Lote === '3' && vencido(s) && filaValida(s));
  const lote4 = seguimiento.filter((s) => s.Lote === '4' && vencido(s) && filaValida(s));
  const lote5 = seguimiento.filter((s) => s.Lote === '5' && vencido(s) && filaValida(s));

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
            <div className="flex justify-between items-center mb-3 no-print gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)}
                  className="bg-bg border border-border rounded-lg px-3 py-2 text-sm">
                  <option value="">Todas las formaciones</option>
                  {CURSOS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="🔍 Buscar por nombre…"
                  className="bg-bg border border-border rounded-lg px-3 py-2 text-sm w-52" />
              </div>
              <button onClick={exportarExcel} className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm">
                ⬇ Exportar a Excel
              </button>
            </div>
            {/* LOTE 0 */}
            <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
              <p className="text-sm font-semibold mb-1">LOTE 0</p>
              <p className="text-textMuted text-xs mb-1">Leads recién ingresados (últimos 30 días)</p>
              <p className="text-textMuted text-[11px] mb-3">
                Si todavía no lo contactaste, en 48hs va a aparecer solo en el <b>Lote 1</b>. Si registrás
                "No contestó" o "Va a pensarlo", sigue escalando de lote en lote (1 → 2 → 3 → 4 → 5) hasta
                resolverse. Si registrás <b>"No le interesa"</b>, se saca del camino de seguimiento y no vuelve
                a aparecer. Apenas se marca la venta, el lead desaparece de todos los lotes automáticamente.
              </p>
              {lote0.length === 0 ? (
                <p className="text-textMuted text-sm">Sin leads recientes.</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {lote0.map((l) => (
                    <li key={l.ID} className="text-textSec flex items-center gap-2">
                      <span>
                        {l.Nombre} {l.Apellido}
                        {!l.Curso && <span className="text-warningText text-xs ml-2">(sin curso definido)</span>}
                      </span>
                      {l.WhatsApp && (
                        <a href={`https://wa.me/${l.WhatsApp.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs" title="WhatsApp">💬</a>
                      )}
                      <button onClick={() => setLeadVenta(l)} className="text-xs px-2 py-0.5 rounded bg-accentPurple text-white">Marcar venta</button>
                      <button onClick={() => setFichaLeadId(l.ID)} className="text-accentTeal text-xs font-semibold">Ver ficha</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* LOTE 1 */}
            <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
              <p className="text-sm font-semibold mb-1">LOTE 1 – Contactar a las 48 horas</p>
              <p className="text-textMuted text-xs mb-1">{lote1.length} lead(s) por contactar</p>
              <p className="text-textMuted text-[11px] mb-3">
                Si registrás "No contestó" o "Va a pensarlo" pasa solo al Lote 2 (10 días). Si marcás la venta, desaparece de acá.
              </p>
              {lote1.length === 0 ? (
                <p className="text-textMuted text-sm">Nada pendiente en este lote.</p>
              ) : (
                lote1.map((s) => (
                  <FilaLote
                    key={`${s.LeadID}-1`} fila={s} lead={buscarLead(s.LeadID)}
                    onContactar={registrarContacto} onReasignar={reasignar} onVerFicha={setFichaLeadId} onMarcarVenta={setLeadVenta}
                    puedeReasignar={puedeReasignar} conObservaciones
                  />
                ))
              )}
            </div>

            {/* LOTE 2 */}
            <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
              <p className="text-sm font-semibold mb-1">LOTE 2 – Contactar a los 10 días</p>
              <p className="text-textMuted text-xs mb-1">
                {lote2.length} lead(s) que no respondieron en el Lote 1
              </p>
              <p className="text-textMuted text-[11px] mb-3">
                Si sigue sin resolverse, pasa al Lote 3 (al mes). Si marcás la venta, desaparece de acá.
              </p>
              {lote2.length === 0 ? (
                <p className="text-textMuted text-sm">Nada pendiente en este lote.</p>
              ) : (
                lote2.map((s) => (
                  <FilaLote
                    key={`${s.LeadID}-2`} fila={s} lead={buscarLead(s.LeadID)}
                    onContactar={registrarContacto} onReasignar={reasignar} onVerFicha={setFichaLeadId} onMarcarVenta={setLeadVenta}
                    puedeReasignar={puedeReasignar}
                  />
                ))
              )}
            </div>

            {/* LOTE 3 */}
            <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
              <p className="text-sm font-semibold mb-1">LOTE 3 – Contactar al mes</p>
              <p className="text-textMuted text-xs mb-1">
                {lote3.length} lead(s) sin resolver al mes de ingresados
              </p>
              <p className="text-textMuted text-[11px] mb-3">
                Requiere que un Coordinador/Admin lo asigne. Si sigue sin resolverse, pasa al Lote 4 (2 meses).
              </p>
              {lote3.length === 0 ? (
                <p className="text-textMuted text-sm">Nada pendiente en este lote.</p>
              ) : (
                lote3.map((s) => (
                  <FilaLote
                    key={`${s.LeadID}-3`} fila={s} lead={buscarLead(s.LeadID)}
                    onContactar={registrarContacto} onReasignar={reasignar} onVerFicha={setFichaLeadId} onMarcarVenta={setLeadVenta}
                    puedeReasignar={puedeReasignar} sinAsignarPorDefecto
                  />
                ))
              )}
            </div>

            {/* LOTE 4 */}
            <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
              <p className="text-sm font-semibold mb-1">LOTE 4 – Contactar a los 2 meses</p>
              <p className="text-textMuted text-xs mb-1">
                {lote4.length} lead(s) sin resolver a los 2 meses de ingresados
              </p>
              <p className="text-textMuted text-[11px] mb-3">
                Requiere asignación. Si sigue sin resolverse, pasa al Lote 5 (3 meses).
              </p>
              {lote4.length === 0 ? (
                <p className="text-textMuted text-sm">Nada pendiente en este lote.</p>
              ) : (
                lote4.map((s) => (
                  <FilaLote
                    key={`${s.LeadID}-4`} fila={s} lead={buscarLead(s.LeadID)}
                    onContactar={registrarContacto} onReasignar={reasignar} onVerFicha={setFichaLeadId} onMarcarVenta={setLeadVenta}
                    puedeReasignar={puedeReasignar} sinAsignarPorDefecto
                  />
                ))
              )}
            </div>

            {/* LOTE 5 */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <p className="text-sm font-semibold mb-1">LOTE 5 – Contactar a los 3 meses</p>
              <p className="text-textMuted text-xs mb-1">
                {lote5.length} lead(s) sin resolver a los 3 meses de ingresados
              </p>
              <p className="text-textMuted text-[11px] mb-3">
                Último lote de seguimiento automático. Si marcás la venta, desaparece de acá como cualquier otro lote.
              </p>
              {lote5.length === 0 ? (
                <p className="text-textMuted text-sm">Nada pendiente en este lote.</p>
              ) : (
                lote5.map((s) => (
                  <FilaLote
                    key={`${s.LeadID}-5`} fila={s} lead={buscarLead(s.LeadID)}
                    onContactar={registrarContacto} onReasignar={reasignar} onVerFicha={setFichaLeadId} onMarcarVenta={setLeadVenta}
                    puedeReasignar={puedeReasignar} sinAsignarPorDefecto
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
      <FichaDrawer leadId={fichaLeadId} usuario={usuario} onClose={() => setFichaLeadId(null)} />
      <ModalVenta lead={leadVenta} onClose={() => setLeadVenta(null)} onConfirm={confirmarVenta} usuarioActual={usuario} />
      {toast}
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
        <p className="text-sm font-medium">{lead.Nombre} {lead.Apellido} — {lead.Curso || 'sin curso'}</p>
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
