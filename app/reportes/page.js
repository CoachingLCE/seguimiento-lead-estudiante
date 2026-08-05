'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import Nav from '../../components/Nav';
import FichaDrawer from '../../components/FichaDrawer';
import { tienePermisoReportes } from '../../lib/permisos';
import { useSession } from '../../lib/useSession';

const PALETA = ['#7c3aed', '#22d3ee', '#c026d3', '#4ade80', '#fbbf24', '#60a5fa', '#f87171', '#a78bfa'];

function meses() {
  const lista = [];
  const ahora = new Date();
  for (let i = 0; i < 12; i++) {
    const f = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const valor = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
    const label = f.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    lista.push({ valor, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return lista;
}

function money(n) {
  const num = Number(n);
  return `$${(Number.isFinite(num) ? num : 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

function Flecha({ actual, anterior, invertido = false }) {
  if (!anterior) return <span className="text-textMuted text-xs">— sin dato previo</span>;
  const delta = ((actual - anterior) / anterior) * 100;
  const mejora = invertido ? delta < 0 : delta > 0;
  if (Math.abs(delta) < 0.5) return <span className="text-textMuted text-xs">≈ sin cambios</span>;
  return (
    <span className={`text-xs font-semibold ${mejora ? 'text-successText' : 'text-dangerText'}`}>
      {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

function Kpi({ label, valor, sub, activo, onClick, tooltip }) {
  return (
    <button onClick={onClick} title={tooltip}
      className={`text-left bg-surface border rounded-xl p-4 transition-all hover:border-accentTeal ${
        activo ? 'border-accentTeal shadow-lg shadow-accentTeal/10' : 'border-border'
      }`}>
      <p className="text-textMuted text-[11px] mb-1">{label}</p>
      <p className="text-xl font-bold">{valor}</p>
      {sub && <div className="mt-1">{sub}</div>}
    </button>
  );
}

function Skeleton({ h = 'h-24' }) {
  return <div className={`bg-surface2 border border-border rounded-xl animate-pulse ${h}`} />;
}

function ChartCard({ titulo, tooltip, children }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
      <p className="text-sm font-semibold mb-3" title={tooltip}>{titulo}</p>
      <div style={{ width: '100%', height: 240 }}>{children}</div>
    </div>
  );
}

function Ranking({ titulo, items, unidad = 'ventas', onClickItem, activo }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
      <p className="text-sm font-semibold mb-3">{titulo}</p>
      {items.length === 0 ? <p className="text-textMuted text-xs">Sin datos este mes.</p> : (
        <div className="space-y-2">
          {items.slice(0, 5).map((it, i) => (
            <button key={it.nombre} onClick={() => onClickItem?.(it.nombre)}
              className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg hover:bg-bg transition-colors ${
                activo === it.nombre ? 'bg-infoBg' : ''
              }`}>
              <span className="text-sm flex items-center gap-2">
                <span className="text-textMuted text-xs w-4">{i + 1}.</span> {it.nombre}
              </span>
              <span className="text-xs text-textSec text-right">
                {it.cantidad} {unidad} · {money(it.monto)} · {it.porcentaje.toFixed(0)}%
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ children, color }) {
  return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>{children}</span>;
}
function colorParaTexto(texto) {
  const n = (texto || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETA[n % PALETA.length];
}

export default function ReportesPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();
  const [mes, setMes] = useState(meses()[0].valor);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargado, setCargado] = useState(false);
  const [fichaLeadId, setFichaLeadId] = useState(null);
  const [montosRotos, setMontosRotos] = useState(null);
  const [corrigiendo, setCorrigiendo] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState({
    curso: '', vendedor: '', origen: '', medioPago: '', modalidad: '', pais: '', montoMin: '', montoMax: ''
  });

  if (usuario && !cargado) {
    setCargado(true);
    cargarDatos(mes);
  }

  async function cargarDatos(mesElegido) {
    setCargando(true);
    const r = await fetch(`/api/reportes?mes=${mesElegido}&solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((res) => res.json());
    setDatos(r);
    setCargando(false);
  }

  function cambiarMes(m) {
    setMes(m);
    cargarDatos(m);
  }

  function setFiltro(campo, valor) {
    setFiltros((prev) => ({ ...prev, [campo]: prev[campo] === valor ? '' : valor }));
  }
  function limpiarFiltros() {
    setFiltros({ curso: '', vendedor: '', origen: '', medioPago: '', modalidad: '', pais: '', montoMin: '', montoMax: '' });
    setBusqueda('');
  }

  const comprasFiltradas = useMemo(() => {
    if (!datos) return [];
    return datos.compras.filter((c) => {
      if (busqueda.trim()) {
        const t = busqueda.trim().toLowerCase();
        if (!`${c.lead} ${c.curso} ${c.origen}`.toLowerCase().includes(t)) return false;
      }
      if (filtros.curso && c.curso !== filtros.curso) return false;
      if (filtros.vendedor && c.vendidoPor !== filtros.vendedor) return false;
      if (filtros.origen && c.origen !== filtros.origen) return false;
      if (filtros.medioPago && c.medioPago !== filtros.medioPago) return false;
      if (filtros.modalidad && c.modalidad !== filtros.modalidad) return false;
      if (filtros.pais && c.pais !== filtros.pais) return false;
      if (filtros.montoMin && Number(c.montoTotal) < Number(filtros.montoMin)) return false;
      if (filtros.montoMax && Number(c.montoTotal) > Number(filtros.montoMax)) return false;
      return true;
    });
  }, [datos, busqueda, filtros]);

  function exportarExcel() {
    const hoja = XLSX.utils.json_to_sheet(comprasFiltradas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Compras');
    XLSX.writeFile(libro, `reporte-${mes}.xlsx`);
  }
  function exportarCSV() {
    const hoja = XLSX.utils.json_to_sheet(comprasFiltradas);
    const csv = XLSX.utils.sheet_to_csv(hoja);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `reporte-${mes}.csv`; a.click();
    URL.revokeObjectURL(url);
  }
  async function verMontosRotos() {
    const r = await fetch(`/api/leads/corregir-montos?solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((res) => res.json());
    setMontosRotos(r.encontrados || []);
  }

  async function corregirMontos() {
    setCorrigiendo(true);
    const r = await fetch('/api/leads/corregir-montos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    }).then((res) => res.json());
    setCorrigiendo(false);
    setMontosRotos(null);
    cargarDatos(mes);
    alert(`✓ Se corrigieron ${r.corregidos} monto(s) automáticamente.`);
  }

  function exportarPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Reporte comercial — ${mes}`, 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [['Lead', 'Curso', 'Origen', 'Medio de pago', 'Monto', 'Vendido por']],
      body: comprasFiltradas.map((c) => [c.lead, c.curso, c.origen, c.medioPago, money(c.montoTotal), c.vendidoPor]),
      styles: { fontSize: 8 }
    });
    doc.save(`reporte-${mes}.pdf`);
  }

  if (!usuario) return null;
  if (!tienePermisoReportes(usuario)) {
    if (typeof window !== 'undefined') router.push('/inscritos');
    return null;
  }

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-[1400px] mx-auto px-4 pb-24 space-y-5">

        {/* FILTROS SUPERIORES */}
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-textSec block mb-1">Mes</label>
            <select value={mes} onChange={(e) => cambiarMes(e.target.value)}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm">
              {meses().map((m) => <option key={m.valor} value={m.valor}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-textSec block mb-1">Buscar venta o estudiante</label>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="🔍 Nombre, curso, origen…"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={exportarExcel} className="text-sm px-3 py-2 rounded-lg bg-surface2 border border-border">⬇ Excel</button>
            <button onClick={exportarCSV} className="text-sm px-3 py-2 rounded-lg bg-surface2 border border-border">⬇ CSV</button>
            <button onClick={exportarPDF} className="text-sm px-3 py-2 rounded-lg bg-surface2 border border-border">⬇ PDF</button>
          </div>
        </div>

        {cargando || !datos ? (
          <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : (
          <>
            {usuario?.roles?.includes('Admin') && (
              <div className="bg-surface border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-xs font-semibold text-textSec">🔧 Diagnóstico: montos inválidos ("$NaN")</p>
                  <button onClick={verMontosRotos} className="text-xs px-3 py-1.5 rounded-lg bg-surface2 border border-border">Buscar</button>
                </div>
                {montosRotos && (
                  montosRotos.length === 0 ? (
                    <p className="text-successText text-xs mt-2">✓ No hay montos rotos en toda la base.</p>
                  ) : (
                    <div className="mt-3 space-y-1.5">
                      {montosRotos.map((m) => (
                        <p key={m.id} className="text-xs text-textSec">
                          {m.nombre} — actual: <span className="text-dangerText">"{m.montoActual}"</span>
                          {m.seRecuperaSolo
                            ? <> → se recalcula a <span className="text-successText">${m.montoRecalculado.toLocaleString('es-AR')}</span></>
                            : <span className="text-warningText"> — necesita revisión manual (no tiene cantidad/valor de cuota guardado)</span>}
                        </p>
                      ))}
                      {montosRotos.some((m) => m.seRecuperaSolo) && (
                        <button onClick={corregirMontos} disabled={corrigiendo}
                          className="text-xs px-3 py-1.5 rounded-lg bg-accentPurple text-white font-semibold mt-2 disabled:opacity-60">
                          {corrigiendo ? 'Corrigiendo…' : `Corregir los ${montosRotos.filter((m) => m.seRecuperaSolo).length} que se pueden recalcular`}
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            )}

            {/* ALERTAS */}
            {datos.alertas.length > 0 && (
              <div className="bg-warningBg border border-warningText/30 rounded-2xl p-4">
                <p className="text-warningText text-sm font-semibold mb-1.5">⚠ Alertas de este mes</p>
                <ul className="text-warningText text-xs space-y-0.5">
                  {datos.alertas.map((a, i) => <li key={i}>• {a}</li>)}
                </ul>
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
              <Kpi label="Total leads" valor={datos.totalLeads} activo={false}
                sub={<Flecha actual={datos.comparativa.leads.actual} anterior={datos.comparativa.leads.anterior} />} />
              <Kpi label="Total ventas" valor={datos.totalCompras}
                sub={<Flecha actual={datos.comparativa.ventas.actual} anterior={datos.comparativa.ventas.anterior} />} />
              <Kpi label="Facturación" valor={money(datos.montoTotal)}
                sub={<Flecha actual={datos.comparativa.facturacion.actual} anterior={datos.comparativa.facturacion.anterior} />} />
              <Kpi label="Conversión" valor={`${datos.conversion.toFixed(1)}%`}
                sub={<Flecha actual={datos.comparativa.conversion.actual} anterior={datos.comparativa.conversion.anterior} />}
                tooltip="Porcentaje de leads del mes que terminaron comprando" />
              <Kpi label="Ticket promedio" valor={money(datos.ticketPromedio)}
                sub={<Flecha actual={datos.comparativa.ticketPromedio.actual} anterior={datos.comparativa.ticketPromedio.anterior} />} />
              <Kpi label="Venta prom./día" valor={datos.ventaPromedioPorDia.toFixed(2)}
                tooltip="Cantidad de ventas dividido los días del mes" />
              <Kpi label="Mejor día" valor={datos.mejorDia?.monto ? `Día ${datos.mejorDia.dia}` : '—'}
                sub={datos.mejorDia?.monto ? <span className="text-textMuted text-xs">{money(datos.mejorDia.monto)}</span> : null} />
            </div>

            {/* EMBUDO COMERCIAL */}
            <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-semibold mb-4">Embudo comercial</p>
              <div className="flex items-center gap-2 flex-wrap">
                {datos.embudo.map((e, i) => {
                  const anterior = datos.embudo[i - 1];
                  const pct = anterior && anterior.cantidad ? (e.cantidad / anterior.cantidad) * 100 : 100;
                  return (
                    <div key={e.etapa} className="flex items-center gap-2">
                      <div className="text-center bg-bg border border-border rounded-xl px-5 py-3" style={{ opacity: 1 - i * 0.12 }}>
                        <p className="text-textMuted text-[11px]">{e.etapa}</p>
                        <p className="text-lg font-bold">{e.cantidad}</p>
                        {i > 0 && <p className="text-textMuted text-[10px]">{pct.toFixed(0)}%</p>}
                      </div>
                      {i < datos.embudo.length - 1 && <span className="text-textMuted">→</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GRÁFICOS */}
            <div className="grid md:grid-cols-2 gap-4">
              <ChartCard titulo="Evolución de ventas por día" tooltip="Cantidad de ventas confirmadas por día del mes">
                <ResponsiveContainer>
                  <LineChart data={datos.serieDiaria}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262c4a" />
                    <XAxis dataKey="dia" stroke="#6b7299" fontSize={11} />
                    <YAxis stroke="#6b7299" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#181d35', border: '1px solid #262c4a', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="ventas" stroke="#22d3ee" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard titulo="Evolución de facturación por día" tooltip="Monto vendido por día del mes">
                <ResponsiveContainer>
                  <LineChart data={datos.serieDiaria}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262c4a" />
                    <XAxis dataKey="dia" stroke="#6b7299" fontSize={11} />
                    <YAxis stroke="#6b7299" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip formatter={(v) => money(v)} contentStyle={{ background: '#181d35', border: '1px solid #262c4a', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="monto" stroke="#7c3aed" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard titulo="Ventas por curso">
                <ResponsiveContainer>
                  <BarChart data={datos.rankingCursos} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262c4a" />
                    <XAxis type="number" stroke="#6b7299" fontSize={11} allowDecimals={false} />
                    <YAxis type="category" dataKey="nombre" stroke="#6b7299" fontSize={10} width={110} />
                    <Tooltip contentStyle={{ background: '#181d35', border: '1px solid #262c4a', borderRadius: 8 }} />
                    <Bar dataKey="cantidad" fill="#22d3ee" radius={[0, 4, 4, 0]} onClick={(d) => setFiltro('curso', d.nombre)} cursor="pointer" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard titulo="Facturación por curso">
                <ResponsiveContainer>
                  <BarChart data={datos.rankingCursos} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262c4a" />
                    <XAxis type="number" stroke="#6b7299" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                    <YAxis type="category" dataKey="nombre" stroke="#6b7299" fontSize={10} width={110} />
                    <Tooltip formatter={(v) => money(v)} contentStyle={{ background: '#181d35', border: '1px solid #262c4a', borderRadius: 8 }} />
                    <Bar dataKey="monto" fill="#7c3aed" radius={[0, 4, 4, 0]} onClick={(d) => setFiltro('curso', d.nombre)} cursor="pointer" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard titulo="Ventas por origen">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={datos.rankingOrigenes} dataKey="cantidad" nameKey="nombre" cx="50%" cy="50%" outerRadius={80}
                      onClick={(d) => setFiltro('origen', d.nombre)} cursor="pointer">
                      {datos.rankingOrigenes.map((_, i) => <Cell key={i} fill={PALETA[i % PALETA.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#181d35', border: '1px solid #262c4a', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard titulo="Ventas por vendedor">
                <ResponsiveContainer>
                  <BarChart data={datos.rankingVendedores}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262c4a" />
                    <XAxis dataKey="nombre" stroke="#6b7299" fontSize={10} />
                    <YAxis stroke="#6b7299" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#181d35', border: '1px solid #262c4a', borderRadius: 8 }} />
                    <Bar dataKey="cantidad" fill="#4ade80" radius={[4, 4, 0, 0]} onClick={(d) => setFiltro('vendedor', d.nombre)} cursor="pointer" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard titulo="Medios de pago">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={datos.rankingMedioPago} dataKey="cantidad" nameKey="nombre" cx="50%" cy="50%" outerRadius={80}
                      onClick={(d) => setFiltro('medioPago', d.nombre)} cursor="pointer">
                      {datos.rankingMedioPago.map((_, i) => <Cell key={i} fill={PALETA[i % PALETA.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#181d35', border: '1px solid #262c4a', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard titulo="Modalidades de pago">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={datos.rankingModalidad} dataKey="cantidad" nameKey="nombre" cx="50%" cy="50%" outerRadius={80}
                      onClick={(d) => setFiltro('modalidad', d.nombre)} cursor="pointer">
                      {datos.rankingModalidad.map((_, i) => <Cell key={i} fill={PALETA[i % PALETA.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#181d35', border: '1px solid #262c4a', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* RANKINGS */}
            <div className="grid md:grid-cols-3 gap-4">
              <Ranking titulo="🏆 Top vendedores" items={datos.rankingVendedores} onClickItem={(n) => setFiltro('vendedor', n)} activo={filtros.vendedor} />
              <Ranking titulo="🎓 Top cursos" items={datos.rankingCursos} onClickItem={(n) => setFiltro('curso', n)} activo={filtros.curso} />
              <Ranking titulo="📣 Top orígenes" items={datos.rankingOrigenes} onClickItem={(n) => setFiltro('origen', n)} activo={filtros.origen} />
              <Ranking titulo="👩‍🏫 Top docentes" items={datos.rankingDocentes} />
              <Ranking titulo="📚 Top ediciones" items={datos.rankingEdiciones} />
            </div>

            {/* FILTROS EXTENDIDOS */}
            <div className="bg-surface border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-textSec">Filtros de la tabla</p>
                <button onClick={limpiarFiltros} className="text-xs text-accentTeal font-semibold">Limpiar todos los filtros</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(filtros).filter(([, v]) => v).map(([k, v]) => (
                  <span key={k} className="text-[11px] px-2.5 py-1 rounded-full bg-infoBg text-infoText flex items-center gap-1.5">
                    {k}: {v} <button onClick={() => setFiltro(k, v)} className="font-bold">✕</button>
                  </span>
                ))}
                {Object.values(filtros).every((v) => !v) && <span className="text-textMuted text-xs">Ningún filtro aplicado — clickeá un gráfico o ranking para filtrar.</span>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                <input placeholder="Monto mínimo" type="number" value={filtros.montoMin} onChange={(e) => setFiltros((p) => ({ ...p, montoMin: e.target.value }))}
                  className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs" />
                <input placeholder="Monto máximo" type="number" value={filtros.montoMax} onChange={(e) => setFiltros((p) => ({ ...p, montoMax: e.target.value }))}
                  className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs" />
                <select value={filtros.pais} onChange={(e) => setFiltro('pais', e.target.value)} className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs">
                  <option value="">País (todos)</option>
                  {[...new Set(datos.compras.map((c) => c.pais).filter(Boolean))].map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* TABLA */}
            <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-semibold mb-3">Detalle de compras <span className="text-textMuted font-normal">({comprasFiltradas.length} de {datos.compras.length})</span></p>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface z-10">
                    <tr className="text-textSec text-left border-b border-border">
                      <th className="py-2">Lead</th><th>Curso</th><th>Origen</th><th>Medio de pago</th>
                      <th>Modalidad</th><th>Fecha de compra</th><th>Monto</th><th>Vendedor</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {comprasFiltradas.map((c) => (
                      <tr key={c.id} className="border-b border-border hover:bg-bg transition-colors">
                        <td className="py-2.5">{c.lead}</td>
                        <td><Badge color={colorParaTexto(c.curso)}>{c.curso}</Badge></td>
                        <td><Badge color={colorParaTexto(c.origen)}>{c.origen}</Badge></td>
                        <td><Badge color={colorParaTexto(c.medioPago)}>{c.medioPago}</Badge></td>
                        <td><Badge color={colorParaTexto(c.modalidad)}>{c.modalidad}</Badge></td>
                        <td className="text-textSec whitespace-nowrap">
                          {c.fechaVenta ? new Date(c.fechaVenta).toLocaleDateString('es-AR') : '—'}
                        </td>
                        <td className="font-bold text-successText">{money(c.montoTotal)}</td>
                        <td>{c.vendidoPor}</td>
                        <td><button onClick={() => setFichaLeadId(c.id)} className="text-accentTeal text-xs font-semibold">Ver ficha</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {comprasFiltradas.length === 0 && <p className="text-textMuted text-sm text-center py-6">Sin resultados con estos filtros.</p>}
              </div>
            </div>
          </>
        )}
      </div>
      <FichaDrawer leadId={fichaLeadId} usuario={usuario} onClose={() => setFichaLeadId(null)} />
    </div>
  );
}
