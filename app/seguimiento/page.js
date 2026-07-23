'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav, { puedeVerOperativo } from '../../components/Nav';
import { useSession } from '../../lib/useSession';
import { RESULTADOS_CONTACTO } from '../../lib/constants';

const EMAILS_ASIGNABLES = [
  { email: 'jesabel.reigada@institutoilce.com', nombre: 'Jesabel Reigada' },
  { email: 'alexander.juncos@institutoilce.com', nombre: 'Alexander Juncos' }
];

export default function SeguimientoPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [seguimiento, setSeguimiento] = useState([]);
  const [cargando, setCargando] = useState(true);

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
    cargarDatos();
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

  // LOTE 0: todos los leads recién ingresados (últimos 30 días), como lista simple de nombres
  const lote0 = leads
    .filter((l) => (ahora - new Date(l.FechaIngreso)) < 30 * 24 * 60 * 60 * 1000)
    .sort((a, b) => new Date(b.FechaIngreso) - new Date(a.FechaIngreso));

  // LOTE 1: filas de seguimiento lote=1 cuya fecha de vencimiento (48hs) ya pasó
  const lote1 = seguimiento.filter((s) => s.Lote === '1' && new Date(s.FechaVence) <= ahora);

  // LOTE 2: se generan dinámicamente solo cuando corresponde (ver API) — mostrar los que ya vencieron
  const lote2 = seguimiento.filter((s) => s.Lote === '2' && new Date(s.FechaVence) <= ahora);

  // LOTE 3: al mes, sin asignación hasta que un Coordinador/Admin lo asigne
  const lote3 = seguimiento.filter((s) => s.Lote === '3' && new Date(s.FechaVence) <= ahora);

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
            <div className="flex justify-end mb-3 no-print">
              <button onClick={exportarExcel} className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm">
                ⬇ Exportar a Excel
              </button>
            </div>
            {/* LOTE 0 */}
            <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
              <p className="text-sm font-semibold mb-1">LOTE 0</p>
              <p className="text-textMuted text-xs mb-3">Leads recién ingresados (últimos 30 días)</p>
              {lote0.length === 0 ? (
                <p className="text-textMuted text-sm">Sin leads recientes.</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {lote0.map((l) => (
                    <li key={l.ID} className="text-textSec">
                      {l.Nombre} {l.Apellido}
                      {!l.Curso && <span className="text-warningText text-xs ml-2">(sin curso definido)</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* LOTE 1 */}
            <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
              <p className="text-sm font-semibold mb-1">LOTE 1 – Contactar a las 48 horas</p>
              <p className="text-textMuted text-xs mb-3">{lote1.length} lead(s) por contactar</p>
              {lote1.length === 0 ? (
                <p className="text-textMuted text-sm">Nada pendiente en este lote.</p>
              ) : (
                lote1.map((s) => (
                  <FilaLote
                    key={`${s.LeadID}-1`} fila={s} lead={buscarLead(s.LeadID)}
                    onContactar={registrarContacto} onReasignar={reasignar}
                    puedeReasignar={puedeReasignar} conObservaciones
                  />
                ))
              )}
            </div>

            {/* LOTE 2 */}
            <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
              <p className="text-sm font-semibold mb-1">LOTE 2 – Contactar a los 10 días</p>
              <p className="text-textMuted text-xs mb-3">
                {lote2.length} lead(s) que no respondieron en el Lote 1
              </p>
              {lote2.length === 0 ? (
                <p className="text-textMuted text-sm">Nada pendiente en este lote.</p>
              ) : (
                lote2.map((s) => (
                  <FilaLote
                    key={`${s.LeadID}-2`} fila={s} lead={buscarLead(s.LeadID)}
                    onContactar={registrarContacto} onReasignar={reasignar}
                    puedeReasignar={puedeReasignar}
                  />
                ))
              )}
            </div>

            {/* LOTE 3 */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <p className="text-sm font-semibold mb-1">LOTE 3 – Contactar al mes</p>
              <p className="text-textMuted text-xs mb-3">
                {lote3.length} lead(s) sin resolver al mes de ingresados
              </p>
              {lote3.length === 0 ? (
                <p className="text-textMuted text-sm">Nada pendiente en este lote.</p>
              ) : (
                lote3.map((s) => (
                  <FilaLote
                    key={`${s.LeadID}-3`} fila={s} lead={buscarLead(s.LeadID)}
                    onContactar={registrarContacto} onReasignar={reasignar}
                    puedeReasignar={puedeReasignar} sinAsignarPorDefecto
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FilaLote({ fila, lead, onContactar, onReasignar, puedeReasignar, conObservaciones, sinAsignarPorDefecto }) {
  const [resultado, setResultado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [proximaAccion, setProximaAccion] = useState('');

  if (!lead) return null;
  const contactado = fila.Contactado === 'TRUE';
  const sinAsignar = sinAsignarPorDefecto && !fila.AsignadoAEmail;

  return (
    <div className="border-t border-border first:border-t-0 py-3">
      <p className="text-sm font-medium">{lead.Nombre} {lead.Apellido} — {lead.Curso || 'sin curso'}</p>

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
            onClick={() => onContactar(fila.LeadID, fila.Lote, resultado, observaciones, proximaAccion)}
            className="text-xs px-3 py-1 rounded bg-accentPurple text-white disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      )}
    </div>
  );
}
