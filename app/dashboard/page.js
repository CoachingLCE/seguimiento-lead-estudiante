'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav, { puedeVerOperativo } from '../../components/Nav';
import ModalVenta from '../../components/ModalVenta';
import { useSession } from '../../lib/useSession';

export default function DashboardPage() {
  const { usuario, cargando: cargandoSesion, logout } = useSession();
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [seguimiento, setSeguimiento] = useState([]);
  const [leadVenta, setLeadVenta] = useState(null);
  const [cargando, setCargando] = useState(true);

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

  const hoyStr = new Date().toDateString();
  const leadsHoy = leads.filter((l) => new Date(l.FechaIngreso).toDateString() === hoyStr).length;
  const mesActual = new Date().toISOString().slice(0, 7);
  const leadsMes = leads.filter((l) => (l.FechaIngreso || '').slice(0, 7) === mesActual).length;
  const comprados = leads.filter((l) => l.Estado === 'Comprado').length;

  const porCurso = useMemo(() => {
    const conteo = {};
    leads.forEach((l) => { conteo[l.Curso] = (conteo[l.Curso] || 0) + 1; });
    const max = Math.max(1, ...Object.values(conteo));
    return Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([curso, cant]) => ({
      curso, cant, pct: Math.round((cant / max) * 100)
    }));
  }, [leads]);

  const pendientesHoy = seguimiento.filter((s) => {
    if (s.Contactado === 'TRUE') return false;
    return new Date(s.FechaVence) <= new Date();
  });

  async function confirmarVenta(datos) {
    await fetch('/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...datos, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setLeadVenta(null);
    cargarDatos();
  }

  function exportarExcel() {
    const hoja = XLSX.utils.json_to_sheet(
      leads.map((l) => ({
        Nombre: `${l.Nombre} ${l.Apellido}`, Curso: l.Curso || 'sin definir', Estado: l.Estado,
        Origen: l.Origen, FechaIngreso: new Date(l.FechaIngreso).toLocaleDateString('es-AR'),
        CargadoPor: l.CargadoPorNombre
      }))
    );
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Leads');
    XLSX.writeFile(libro, `dashboard-leads-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Stat label="Leads hoy" value={leadsHoy} />
              <Stat label="Leads este mes" value={leadsMes} />
              <Stat label="Comprados" value={comprados} />
            </div>

            {pendientesHoy.length > 0 && (
              <div className="bg-warningBg rounded-xl p-4 mb-5">
                <p className="text-warningText text-sm font-semibold mb-3">
                  ⚠ Pendientes de contactar ({pendientesHoy.length})
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-textSec text-left border-b border-white/10">
                      <th className="py-1">Lead</th><th>Lote</th><th>Asignado a</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendientesHoy.map((s, i) => {
                      const l = leads.find((x) => x.ID === s.LeadID);
                      return (
                        <tr key={i} className="border-b border-white/10">
                          <td className="py-1">{l ? `${l.Nombre} ${l.Apellido}` : s.LeadID}</td>
                          <td>Lote {s.Lote}</td>
                          <td>{s.AsignadoANombre}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
              <p className="text-sm font-semibold mb-3">Leads por curso</p>
              {porCurso.map(({ curso, cant, pct }) => (
                <div key={curso} className="flex items-center gap-3 text-sm mb-2">
                  <span className="w-48 shrink-0 text-textSec truncate">{curso}</span>
                  <div className="flex-1 bg-surface2 rounded h-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-accentTeal to-accentPurple rounded" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-textSec">{cant}</span>
                </div>
              ))}
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5">
              <p className="text-sm font-semibold mb-3">Últimos leads</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-textSec text-left border-b border-border">
                    <th className="py-2">Nombre</th><th>Curso</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(-10).reverse().map((l) => (
                    <tr key={l.ID} className="border-b border-border">
                      <td className="py-2">{l.Nombre} {l.Apellido}</td>
                      <td>{l.Curso}</td>
                      <td>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          l.Estado === 'Comprado' ? 'bg-successBg text-successText' : 'bg-warningBg text-warningText'
                        }`}>
                          {l.Estado}
                        </span>
                      </td>
                      <td>
                        {l.Estado !== 'Comprado' && (
                          <button onClick={() => setLeadVenta(l)}
                            className="text-xs px-3 py-1 rounded-md bg-surface2 border border-border">
                            Marcar venta
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <ModalVenta lead={leadVenta} onClose={() => setLeadVenta(null)} onConfirm={confirmarVenta} />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <p className="text-textSec text-xs mb-1.5">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
