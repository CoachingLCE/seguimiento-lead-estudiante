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
  const [filtroCurso, setFiltroCurso] = useState('');
  const [filtroEdicion, setFiltroEdicion] = useState('');
  const [filtroDocente, setFiltroDocente] = useState('');
  const [ordenPor, setOrdenPor] = useState('fechaVenta');
  const [ordenDir, setOrdenDir] = useState('desc');

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
    const hoja = XLSX.utils.json_to_sheet(comprasOrdenadas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Compras');
    XLSX.writeFile(libro, `reporte-${mes}.xlsx`);
  }

  const cursosUnicos = datos ? [...new Set(datos.compras.map((c) => c.curso).filter(Boolean))].sort() : [];
  const edicionesUnicas = datos ? [...new Set(datos.compras.map((c) => c.edicion).filter(Boolean))].sort() : [];
  const docentesUnicos = datos
    ? [...new Set(datos.compras.flatMap((c) => (c.docentes || '').split(',').map((d) => d.trim()).filter(Boolean)))].sort()
    : [];
  const comprasFiltradas = datos
    ? datos.compras
        .filter((c) => !filtroCurso || c.curso === filtroCurso)
        .filter((c) => !filtroEdicion || c.edicion === filtroEdicion)
        .filter((c) => !filtroDocente || (c.docentes || '').split(',').map((d) => d.trim()).includes(filtroDocente))
    : [];

  const comprasOrdenadas = [...comprasFiltradas].sort((a, b) => {
    let va = a[ordenPor] || '';
    let vb = b[ordenPor] || '';
    if (ordenPor === 'fechaVenta') { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
    if (ordenPor === 'montoTotal') { va = Number(va); vb = Number(vb); }
    if (va < vb) return ordenDir === 'asc' ? -1 : 1;
    if (va > vb) return ordenDir === 'asc' ? 1 : -1;
    return 0;
  });

  function ordenarPor(campo) {
    if (ordenPor === campo) {
      setOrdenDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrdenPor(campo);
      setOrdenDir('asc');
    }
  }

  function flecha(campo) {
    if (ordenPor !== campo) return '';
    return ordenDir === 'asc' ? ' ▲' : ' ▼';
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
        <div className="flex items-end gap-3 mb-4 flex-wrap">
          <div className="max-w-xs">
            <label className="text-xs text-textSec block mb-1">Mes</label>
            <select value={mes} onChange={(e) => setMes(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm">
              {meses.map((m) => <option key={m.valor} value={m.valor}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-textSec block mb-1">Formación</label>
            <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm">
              <option value="">Todas</option>
              {cursosUnicos.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-textSec block mb-1">Edición</label>
            <select value={filtroEdicion} onChange={(e) => setFiltroEdicion(e.target.value)}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm">
              <option value="">Todas</option>
              {edicionesUnicas.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-textSec block mb-1">Docente</label>
            <select value={filtroDocente} onChange={(e) => setFiltroDocente(e.target.value)}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              {docentesUnicos.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
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
                    <th className="py-2 cursor-pointer select-none" onClick={() => ordenarPor('lead')}>Lead{flecha('lead')}</th>
                    <th>Curso</th><th>Edición</th><th>Docente(s)</th><th>Origen</th>
                    <th className="cursor-pointer select-none" onClick={() => ordenarPor('fechaVenta')}>Fecha compra{flecha('fechaVenta')}</th>
                    <th>Medio de pago</th><th>Modalidad</th>
                    <th className="cursor-pointer select-none" onClick={() => ordenarPor('montoTotal')}>Monto{flecha('montoTotal')}</th>
                    <th>Cargado por</th><th>Vendido por</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {comprasOrdenadas.map((c, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="py-2">{c.lead}</td>
                      <td>{c.curso}</td>
                      <td>{c.edicion || '—'}</td>
                      <td>{c.docentes || '—'}</td>
                      <td>{c.origen}</td>
                      <td>{new Date(c.fechaVenta).toLocaleDateString('es-AR')}</td>
                      <td>{c.medioPago}</td>
                      <td>{c.modalidad}</td>
                      <td>${Number(c.montoTotal).toLocaleString('es-AR')}</td>
                      <td>{c.cargadoPor}</td>
                      <td>{c.vendidoPor || "—"}</td>
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
