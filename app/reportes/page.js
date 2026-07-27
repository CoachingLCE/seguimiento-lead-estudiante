'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav from '../../components/Nav';
import FichaDrawer from '../../components/FichaDrawer';
import { tienePermisoReportes } from '../../lib/permisos';
import { useSession } from '../../lib/useSession';

function mesesDisponibles() {
  const meses = [];
  const ahora = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const valor = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    meses.push({ valor, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return meses;
}

export default function ReportesPage() {
  const { usuario, cargando: cargandoSesion, logout } = useSession();
  const router = useRouter();
  const meses = mesesDisponibles();
  const [mes, setMes] = useState(meses[0].valor);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [fichaLeadId, setFichaLeadId] = useState(null);

  useEffect(() => {
    if (!usuario) return;
    cargarReporte();
  }, [usuario, mes]);

  async function cargarReporte() {
    setCargando(true);
    const r = await fetch(`/api/reportes?mes=${mes}&solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((res) => res.json());
    setDatos(r);
    setCargando(false);
  }

  function exportarExcel() {
    if (!datos) return;
    const hoja = XLSX.utils.json_to_sheet(datos.compras);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Compras');
    XLSX.writeFile(libro, `reporte-${mes}.xlsx`);
  }

  if (cargandoSesion) {
    return null;
  }
  if (!usuario) {
    if (typeof window !== 'undefined') router.push('/');
    return null;
  }
  if (!tienePermisoReportes(usuario)) {
    if (typeof window !== 'undefined') router.push('/inscritos');
    return null;
  }

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="max-w-xs mb-4">
          <label className="text-xs text-textSec block mb-1">Mes</label>
          <select value={mes} onChange={(e) => setMes(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm">
            {meses.map((m) => <option key={m.valor} value={m.valor}>{m.label}</option>)}
          </select>
        </div>

        {cargando || !datos ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Stat label="Total leads" value={datos.totalLeads} />
              <Stat label="Compras" value={datos.totalCompras} />
              <Stat label="Monto total" value={`$${datos.montoTotal.toLocaleString('es-AR')}`} />
              <Stat label="Conversión" value={`${datos.conversion}%`} />
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5">
              <p className="text-sm font-semibold mb-3">Detalle de compras</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-textSec text-left border-b border-border">
                    <th className="py-2">Lead</th><th>Origen</th><th>Fecha compra</th>
                    <th>Medio de pago</th><th>Modalidad</th><th>Monto</th><th>Cargado por</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {datos.compras.map((c, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="py-2">{c.lead}</td>
                      <td>{c.origen}</td>
                      <td>{new Date(c.fechaVenta).toLocaleDateString('es-AR')}</td>
                      <td>{c.medioPago}</td>
                      <td>{c.modalidad}</td>
                      <td>${Number(c.montoTotal).toLocaleString('es-AR')}</td>
                      <td>{c.cargadoPor}</td>
                      <td>
                        <button onClick={() => setFichaLeadId(c.id)} className="text-accentTeal text-xs font-semibold">Ver ficha</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={exportarExcel}
                className="mt-4 bg-surface2 border border-border rounded-lg px-4 py-2 text-sm">
                ⬇ Exportar a Excel
              </button>
            </div>
          </>
        )}
      </div>
      <FichaDrawer leadId={fichaLeadId} usuario={usuario} onClose={() => setFichaLeadId(null)} />
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
