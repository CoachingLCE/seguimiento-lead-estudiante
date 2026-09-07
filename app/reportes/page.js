'use client';
import { useEffect, useMemo, useState } from 'react';
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

function labelDeMes(valor) {
  const [y, m] = valor.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function money(n) {
  const num = Number(n);
  return `$${(Number.isFinite(num) ? num : 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

// Objetivos: mismo criterio de estado en toda la pestaña (tarjetas, gráfico de barras, tabla por curso).
function estadoObjetivo(pct) {
  if (pct >= 100) return { icono: '🟢', label: 'Cumplido', clase: 'text-successText', barra: 'bg-successText' };
  if (pct >= 70) return { icono: '🟡', label: 'Cerca del objetivo', clase: 'text-warningText', barra: 'bg-warningText' };
  return { icono: '🔴', label: 'Lejos del objetivo', clase: 'text-dangerText', barra: 'bg-dangerText' };
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

// Si el nombre de un curso es muy largo, lo parte en 2 líneas por la palabra más cercana
// a la mitad — para que nunca se corte a mitad de palabra ni se superponga con el de al lado.
function partirEnDosLineas(texto, maxChars = 15) {
  if (!texto || texto.length <= maxChars) return [texto || ''];
  const palabras = texto.split(' ');
  let linea1 = '';
  let i = 0;
  while (i < palabras.length && (linea1 + ' ' + palabras[i]).trim().length <= maxChars) {
    linea1 = (linea1 + ' ' + palabras[i]).trim();
    i++;
  }
  if (!linea1) { linea1 = palabras[0]; i = 1; } // palabra sola más larga que maxChars: no partirla
  const linea2 = palabras.slice(i).join(' ');
  return linea2 ? [linea1, linea2] : [linea1];
}

// Tick del eje Y para el gráfico "Leads por curso": nunca reduce el tamaño de fuente,
// en cambio parte el nombre en 2 líneas si no entra en una sola.
function TickCursoDosLineas({ x, y, payload }) {
  const lineas = partirEnDosLineas(payload.value, 15);
  return (
    <g transform={`translate(${x},${y})`}>
      {lineas.map((linea, i) => (
        <text key={i} x={0} y={0} dy={(i - (lineas.length - 1) / 2) * 13 + 4} textAnchor="end" fill="#9aa1c2" fontSize={11}>
          {linea}
        </text>
      ))}
    </g>
  );
}

// Tooltip del gráfico "Días hasta la conversión": además de la cantidad, lista de quiénes
// fueron esas ventas — si son muchas, corta la lista y avisa cuántas más hay.
// Tooltip de "Evolución de ventas por día": además de las ventas de ese día puntual, muestra
// el acumulado del mes hasta ese día — ej: "el 3 se hicieron 2 ventas y el acumulado es 14".
function TooltipVentasPorDia({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#181d35', border: '1px solid #262c4a', borderRadius: 8 }} className="px-3 py-2.5">
      <p className="text-text text-xs font-semibold mb-1">Día {label}</p>
      <p className="text-textSec text-xs">Ventas ese día: <b className="text-accentTeal">{d.ventas}</b></p>
      <p className="text-textSec text-xs">Acumulado del mes: <b className="text-text">{d.acumulado}</b></p>
      <p className="text-textMuted text-xs mt-1.5 pt-1.5 border-t border-border">Mes anterior (mismo día): {d.ventasMesAnterior}</p>
      <p className="text-textMuted text-xs">Acumulado mes anterior: <b className="text-textSec">{d.acumuladoMesAnterior}</b></p>
    </div>
  );
}

function TooltipDiasConversion({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  const porVendedor = d.porVendedor || [];

  return (
    <div style={{ background: '#181d35', border: '1px solid #262c4a', borderRadius: 8 }} className="px-3 py-2.5 max-w-[220px]">
      <p className="text-text text-xs font-semibold mb-1">{d.nombre}</p>
      <p className="text-textSec text-xs mb-1.5">{d.cantidad} venta{d.cantidad !== 1 ? 's' : ''} ({d.porcentaje.toFixed(1)}%)</p>
      {porVendedor.length > 0 && (
        <div className="text-textMuted text-[11px] leading-relaxed border-t border-border pt-1.5 space-y-0.5">
          {porVendedor.map((v) => (
            <div key={v.nombre} className="flex justify-between gap-3">
              <span>{v.nombre}</span>
              <span className="text-text font-medium">{v.cantidad}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChartCard({ titulo, subtitulo, valorGrande, comparacion, tooltip, onExportar, alto = 300, children }) {
  return (
    <div className="group bg-surface border border-border rounded-2xl p-5 shadow-sm transition-all duration-200
      hover:-translate-y-0.5 hover:border-accentPurple/40 hover:shadow-lg hover:shadow-accentPurple/10">
      <div className="flex items-start justify-between mb-1 gap-2">
        <div>
          <p className="text-sm font-semibold" title={tooltip}>{titulo}</p>
          <p className="text-textMuted text-[10.5px]">{subtitulo || 'Mes seleccionado'}</p>
        </div>
        {onExportar && (
          <button onClick={onExportar}
            className="text-textMuted hover:text-accentTeal text-[11px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            ⬇ Exportar
          </button>
        )}
      </div>
      {valorGrande !== undefined && (
        <div className="flex items-baseline gap-2 mb-1">
          <p className="text-2xl font-bold">{valorGrande}</p>
          {comparacion}
        </div>
      )}
      <div style={{ width: '100%', height: alto }}>{children}</div>
    </div>
  );
}

// Dona con % principal + total en el centro, y leyenda a la derecha (en vez de abajo).
const ESTILO_PRIORIDAD = {
  critica: { icono: '🔴', label: 'Crítica', clase: 'border-dangerText/40 bg-dangerBg' },
  atencion: { icono: '🟡', label: 'Atención', clase: 'border-warningText/40 bg-warningBg' },
  informativa: { icono: '⚪', label: 'Informativa', clase: 'border-border bg-surface2' }
};

function SeccionAlertas({ alertasGenerales, alertasCursos, mes, setFiltro }) {
  const router = useRouter();
  const [expandido, setExpandido] = useState(false);
  const totalAlertas = alertasGenerales.length + alertasCursos.length;
  if (totalAlertas === 0) return null;

  const LIMITE_INICIAL = 3;
  const cursosAMostrar = expandido ? alertasCursos : alertasCursos.slice(0, LIMITE_INICIAL);
  const hayMasParaVer = alertasCursos.length > LIMITE_INICIAL;

  return (
    <div className="bg-surface border border-warningText/20 rounded-2xl p-4">
      <p className="text-warningText text-sm font-semibold mb-3">
        ⚠ Alertas de {labelDeMes(mes).split(' ')[0]} — {totalAlertas}
      </p>

      {alertasGenerales.length > 0 && (
        <ul className="text-warningText text-xs space-y-1 mb-3">
          {alertasGenerales.map((a, i) => <li key={i}>• {a}</li>)}
        </ul>
      )}

      {cursosAMostrar.length > 0 && (
        <div className="space-y-2">
          {cursosAMostrar.map((a) => {
            const estilo = ESTILO_PRIORIDAD[a.prioridad];
            return (
              <div key={a.curso} className={`border rounded-xl p-3 ${estilo.clase}`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold">
                      {estilo.icono} {a.curso} <span className="text-textMuted font-normal text-xs">— {estilo.label}</span>
                    </p>
                    <p className="text-textMuted text-[11px] mt-0.5">
                      Ventas este mes: <b className="text-text">{a.ventasActual}</b>
                      {' · '}Mes anterior: <b className="text-text">{a.ventasMesAnterior}</b>
                      {' · '}Leads activos: <b className="text-text">{a.leadsActivos}</b>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setFiltro('curso', a.curso)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-surface2 border border-border hover:border-accentTeal">
                      Ver ventas
                    </button>
                    <button onClick={() => router.push(`/buscador?q=${encodeURIComponent(a.curso)}`)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-surface2 border border-border hover:border-accentTeal">
                      Ver leads
                    </button>
                    <button onClick={() => setFiltro('curso', a.curso)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-accentPurple text-white font-semibold">
                      Analizar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hayMasParaVer && (
        <button onClick={() => setExpandido((v) => !v)} className="text-accentTeal text-xs font-semibold mt-3">
          {expandido ? '▲ Ver menos' : `▼ Ver todas las alertas (${alertasCursos.length})`}
        </button>
      )}
    </div>
  );
}

function GraficoDona({ datos, onClickItem, activo }) {
  const total = datos.reduce((acc, d) => acc + d.cantidad, 0);
  const principal = datos[0];
  return (
    <div className="flex items-center gap-4 h-full">
      <div className="relative w-[150px] h-[150px] shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={datos} dataKey="cantidad" nameKey="nombre" innerRadius={48} outerRadius={68} paddingAngle={2}
              onClick={(d) => onClickItem?.(d.nombre)} cursor="pointer">
              {datos.map((_, i) => <Cell key={i} fill={PALETA[i % PALETA.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: '#181d35', border: '1px solid #262c4a', borderRadius: 8 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xl font-bold">{principal ? `${principal.porcentaje.toFixed(0)}%` : '0%'}</p>
          <p className="text-textMuted text-[10px]">{total} en total</p>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[160px] pr-1">
        {datos.map((d, i) => (
          <button key={d.nombre} onClick={() => onClickItem?.(d.nombre)}
            className={`w-full flex items-center justify-between text-left text-xs gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-bg ${
              activo === d.nombre ? 'bg-infoBg' : ''
            }`}>
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETA[i % PALETA.length] }} />
              <span className="truncate">{d.nombre}</span>
            </span>
            <span className="text-textSec font-medium shrink-0">{d.porcentaje.toFixed(0)}%</span>
          </button>
        ))}
      </div>
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

const TABS = [
  { id: 'general', label: '📊 General' },
  { id: 'alertas', label: '⚠️ Alertas' },
  { id: 'objetivos', label: '🎯 Objetivos' },
  { id: 'embudo', label: '🔻 Embudo' },
  { id: 'actividad', label: '👤 Actividad' },
  { id: 'analisis', label: '📈 Análisis' },
  { id: 'compras', label: '🧾 Compras' },
  { id: 'escala', label: '📐 Escala Inscripciones' }
];

function TabBar({ tab, setTab }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      {TABS.map((t) => (
        <button key={t.id} onClick={() => setTab(t.id)}
          className={`text-sm px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors shrink-0 ${
            tab === t.id ? 'bg-accentPurple text-white shadow-sm' : 'bg-surface border border-border text-textSec hover:text-text hover:border-accentTeal'
          }`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// Barra de progreso reutilizada en tarjetas, gráfico y tabla por curso de Objetivos — el
// relleno nunca pasa el 100% visualmente aunque el % real sea mayor (se indica aparte con texto).
function BarraObjetivo({ pct, colorClase }) {
  return (
    <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${colorClase}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function mensajeObjetivo({ label, pct, actual, meta, unidad }) {
  if (pct >= 100) {
    const excedente = unidad === '$' ? money(actual - meta) : Math.round(actual - meta);
    return pct > 105 ? `🚀 Vas por encima del objetivo (+${excedente} de excedente).` : '✅ Objetivo cumplido.';
  }
  const falta = unidad === '$' ? money(meta - actual) : Math.round(meta - actual);
  if (pct >= 70) return `🟡 Te faltan ${falta} para llegar a la meta de ${label.toLowerCase()}.`;
  return `🔴 El ritmo actual no alcanza para cumplir el objetivo de ${label.toLowerCase()}.`;
}

function TarjetaObjetivo({ label, actual, meta, unidad, formatear }) {
  if (!meta) return null;
  const pct = meta ? (actual / meta) * 100 : 0;
  const estado = estadoObjetivo(pct);
  const f = formatear || ((v) => v);
  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <p className="text-textMuted text-[11px] uppercase tracking-wide mb-1">{label}</p>
      <p className="text-lg font-bold mb-1">{f(actual)} <span className="text-textMuted font-normal text-sm">/ {f(meta)}</span></p>
      <p className={`text-sm font-bold mb-1.5 ${estado.clase}`}>{pct.toFixed(0)}%</p>
      <BarraObjetivo pct={pct} colorClase={estado.barra} />
      <p className={`text-xs mt-2 ${estado.clase}`}>{estado.icono} {pct > 100 ? 'Superó el objetivo' : estado.label}</p>
      <p className="text-textMuted text-[11px] mt-1.5">{mensajeObjetivo({ label, pct, actual, meta, unidad })}</p>
    </div>
  );
}

function SeccionObjetivos({ datos, mes, usuario }) {
  const puedeEditar = usuario?.roles?.some((r) => ['Admin', 'Coordinador'].includes(r));
  const [cargando, setCargando] = useState(true);
  const [objetivos, setObjetivos] = useState(null);
  const [objetivosPorCurso, setObjetivosPorCurso] = useState([]);
  const [objetivosPorVendedor, setObjetivosPorVendedor] = useState([]);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ metaFacturacion: '', metaVentas: '', metaLeads: '', metaConversion: '', metaTicketPromedio: '', metaVentasDebito: '', metaContactosBajas: '' });
  const [formPorCurso, setFormPorCurso] = useState({});
  const [formPorVendedor, setFormPorVendedor] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setCargando(true);
      const r = await fetch(`/api/objetivos?mes=${mes}&solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((res) => res.json());
      if (cancelado) return;
      setObjetivos(r.objetivos || null);
      setObjetivosPorCurso(r.objetivosPorCurso || []);
      setObjetivosPorVendedor(r.objetivosPorVendedor || []);
      setForm(r.objetivos ? {
        metaFacturacion: r.objetivos.metaFacturacion || '', metaVentas: r.objetivos.metaVentas || '',
        metaLeads: r.objetivos.metaLeads || '', metaConversion: r.objetivos.metaConversion || '',
        metaTicketPromedio: r.objetivos.metaTicketPromedio || '',
        metaVentasDebito: r.objetivos.metaVentasDebito || '', metaContactosBajas: r.objetivos.metaContactosBajas || ''
      } : { metaFacturacion: '', metaVentas: '', metaLeads: '', metaConversion: '', metaTicketPromedio: '', metaVentasDebito: '', metaContactosBajas: '' });
      const porCurso = {};
      (r.objetivosPorCurso || []).forEach((o) => { porCurso[o.curso] = o.meta; });
      setFormPorCurso(porCurso);
      const porVendedor = {};
      (r.objetivosPorVendedor || []).forEach((o) => { porVendedor[o.vendedor] = o.meta; });
      setFormPorVendedor(porVendedor);
      setEditando(!r.objetivos);
      setCargando(false);
    }
    if (mes && usuario) cargar();
    return () => { cancelado = true; };
  }, [mes, usuario]);

  async function guardar() {
    setGuardando(true);
    const metasPorCurso = Object.entries(formPorCurso)
      .filter(([, v]) => v !== '' && v !== undefined)
      .map(([curso, meta]) => ({ curso, meta: Number(meta) }));
    const metasPorVendedor = Object.entries(formPorVendedor)
      .filter(([, v]) => v !== '' && v !== undefined)
      .map(([vendedor, meta]) => ({ vendedor, meta: Number(meta) }));
    await fetch('/api/objetivos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mes,
        metaFacturacion: Number(form.metaFacturacion) || 0,
        metaVentas: Number(form.metaVentas) || 0,
        metaLeads: Number(form.metaLeads) || 0,
        metaConversion: Number(form.metaConversion) || 0,
        metaTicketPromedio: Number(form.metaTicketPromedio) || 0,
        metaVentasDebito: Number(form.metaVentasDebito) || 0,
        metaContactosBajas: Number(form.metaContactosBajas) || 0,
        metasPorCurso,
        metasPorVendedor,
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    // Recarga para reflejar lo guardado con la fecha/autor correctos, ANTES de cerrar el
    // formulario — si no, hay un instante en el medio donde "objetivos" todavía es el valor
    // viejo (null la primera vez) y aparece el mensaje de "Todavía no hay objetivos definidos".
    const r = await fetch(`/api/objetivos?mes=${mes}&solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((res) => res.json());
    setObjetivos(r.objetivos || null);
    setObjetivosPorCurso(r.objetivosPorCurso || []);
    setObjetivosPorVendedor(r.objetivosPorVendedor || []);
    setGuardando(false);
    setEditando(false);
  }

  if (cargando) return <Skeleton h="h-40" />;

  // Misma lista de personas que ya se ve en la pestaña Actividad (quien cargó leads, contactó
  // o vendió este mes) — así no hace falta escribir nombres a mano ni adivinar apellidos.
  // Se excluyen quienes coordinan/administran, no venden directo — la meta individual es para
  // el equipo comercial (ej: Alexander, Lucila), no para todo el que aparece en Actividad.
  const EXCLUIDOS_METAS_VENDEDOR = ['Diego Lerner', 'Jennifer Rebasti', 'Macarena Juncos'];
  const personasActivas = datos.actividadPorPersona
    .map((p) => p.nombre)
    .filter((n) => !EXCLUIDOS_METAS_VENDEDOR.includes(n))
    .sort((a, b) => a.localeCompare(b, 'es'));

  const METRICAS = objetivos ? [
    { id: 'facturacion', label: 'Facturación', actual: datos.montoTotal, meta: objetivos.metaFacturacion, unidad: '$', formatear: money },
    { id: 'ventas', label: 'Ventas', actual: datos.totalCompras, meta: objetivos.metaVentas, unidad: '', formatear: (v) => Math.round(v) },
    { id: 'leads', label: 'Leads', actual: datos.totalLeads, meta: objetivos.metaLeads, unidad: '', formatear: (v) => Math.round(v) },
    { id: 'conversion', label: 'Conversión', actual: datos.conversion, meta: objetivos.metaConversion, unidad: '%', formatear: (v) => `${v.toFixed(1)}%` },
    { id: 'ticket', label: 'Ticket promedio', actual: datos.ticketPromedio, meta: objetivos.metaTicketPromedio, unidad: '$', formatear: money },
    { id: 'ventasDebito', label: 'Ventas débito automático', actual: datos.ventasDebitoAutomatico, meta: objetivos.metaVentasDebito, unidad: '', formatear: (v) => Math.round(v) },
    { id: 'contactosBajas', label: 'Contactos de bajas', actual: datos.contactosBajasDelMes, meta: objetivos.metaContactosBajas, unidad: '', formatear: (v) => Math.round(v) }
  ].filter((m) => m.meta > 0) : [];

  // Proyección: solo tiene sentido para el mes EN CURSO (un mes ya cerrado no se "proyecta").
  const hoy = new Date();
  const esMesActual = mes === `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const [anioMes, mesNum] = mes.split('-').map(Number);
  const diasDelMes = new Date(anioMes, mesNum, 0).getDate();
  const diasTranscurridos = esMesActual ? hoy.getDate() : diasDelMes;
  const factorProyeccion = diasTranscurridos > 0 ? diasDelMes / diasTranscurridos : 1;

  const PROYECCIONES = objetivos && esMesActual ? [
    { label: 'Facturación', actual: datos.montoTotal, proyectado: datos.montoTotal * factorProyeccion, meta: objetivos.metaFacturacion, formatear: money },
    { label: 'Ventas', actual: datos.totalCompras, proyectado: datos.totalCompras * factorProyeccion, meta: objetivos.metaVentas, formatear: (v) => Math.round(v) },
    { label: 'Leads', actual: datos.totalLeads, proyectado: datos.totalLeads * factorProyeccion, meta: objetivos.metaLeads, formatear: (v) => Math.round(v) }
  ].filter((p) => p.meta > 0) : [];

  return (
    <div className="space-y-4">
      {!objetivos && !editando && (
        <div className="bg-surface border border-border rounded-2xl p-6 text-center">
          <p className="text-textMuted text-sm">Todavía no hay objetivos definidos para {labelDeMes(mes)}.</p>
          {puedeEditar && (
            <button onClick={() => setEditando(true)} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold mt-3">
              Definir objetivos
            </button>
          )}
        </div>
      )}

      {objetivos && METRICAS.length > 0 && (
        <>
          {/* TARJETAS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {METRICAS.map((m) => (
              <TarjetaObjetivo key={m.id} label={m.label} actual={m.actual} meta={m.meta} unidad={m.unidad} formatear={m.formatear} />
            ))}
          </div>

          {/* GRÁFICO DE BARRAS HORIZONTALES */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-semibold mb-4">Cumplimiento de objetivos</p>
            <div className="space-y-3">
              {METRICAS.map((m) => {
                const pct = (m.actual / m.meta) * 100;
                const estado = estadoObjetivo(pct);
                return (
                  <div key={m.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">{m.label}</span>
                      <span className={`font-bold ${estado.clase}`}>{pct.toFixed(0)}%{pct > 100 ? ' (superado)' : ''}</span>
                    </div>
                    <BarraObjetivo pct={pct} colorClase={estado.barra} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* PROYECCIÓN AL CIERRE DEL MES */}
          {PROYECCIONES.length > 0 && (
            <div className="bg-surface border border-infoText/30 rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-semibold mb-1">📈 Proyección al cierre del mes</p>
              <p className="text-textMuted text-[11px] mb-3">
                Estimación en base al ritmo actual (día {diasTranscurridos} de {diasDelMes}) — no es un dato confirmado.
              </p>
              <div className="grid md:grid-cols-3 gap-3">
                {PROYECCIONES.map((p) => {
                  const pctProyectado = (p.proyectado / p.meta) * 100;
                  const estado = estadoObjetivo(pctProyectado);
                  return (
                    <div key={p.label} className="bg-bg border border-border rounded-xl p-3">
                      <p className="text-textMuted text-[11px] mb-1">{p.label}</p>
                      <p className="text-xs text-textSec">Actual: <b className="text-text">{p.formatear(p.actual)}</b></p>
                      <p className="text-xs text-textSec">Proyección: <b className="text-text">{p.formatear(p.proyectado)}</b></p>
                      <p className="text-xs text-textSec mb-1.5">Objetivo: <b className="text-text">{p.formatear(p.meta)}</b></p>
                      <p className={`text-xs font-bold ${estado.clase}`}>{estado.icono} Proyección: {pctProyectado.toFixed(0)}% de cumplimiento</p>
                      <p className="text-textMuted text-[11px] mt-1">
                        {pctProyectado >= 100 ? 'Al ritmo actual, cerrarías el mes por encima del objetivo.' : 'Al ritmo actual, no alcanzarías el objetivo.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* OBJETIVOS POR CURSO */}
      {objetivosPorCurso.length > 0 && !editando && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold mb-3">Objetivos por curso</p>
          <div className="space-y-2.5">
            {objetivosPorCurso.map((o) => {
              const ventasActuales = datos.rankingCursos.find((r) => r.nombre === o.curso)?.cantidad || 0;
              const pct = o.meta ? (ventasActuales / o.meta) * 100 : 0;
              const estado = estadoObjetivo(pct);
              return (
                <div key={o.curso}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{o.curso}</span>
                    <span className={`font-bold ${estado.clase}`}>
                      {ventasActuales} / {o.meta} · {pct.toFixed(0)}%
                      {' — '}{pct >= 100 ? '✅ Cumplido' : `faltan ${Math.ceil(o.meta - ventasActuales)}`}
                    </span>
                  </div>
                  <BarraObjetivo pct={pct} colorClase={estado.barra} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* OBJETIVOS POR VENDEDOR */}
      {objetivosPorVendedor.filter((o) => !EXCLUIDOS_METAS_VENDEDOR.includes(o.vendedor)).length > 0 && !editando && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold mb-3">Metas de ventas por vendedor</p>
          <div className="space-y-2.5">
            {objetivosPorVendedor.filter((o) => !EXCLUIDOS_METAS_VENDEDOR.includes(o.vendedor)).map((o) => {
              const ventasActuales = datos.rankingVendedores.find((r) => r.nombre === o.vendedor)?.cantidad || 0;
              const pct = o.meta ? (ventasActuales / o.meta) * 100 : 0;
              const estado = estadoObjetivo(pct);
              return (
                <div key={o.vendedor}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{o.vendedor}</span>
                    <span className={`font-bold ${estado.clase}`}>
                      {ventasActuales} / {o.meta} · {pct.toFixed(0)}%
                      {' — '}{pct >= 100 ? '✅ Cumplido' : `faltan ${Math.ceil(o.meta - ventasActuales)}`}
                    </span>
                  </div>
                  <BarraObjetivo pct={pct} colorClase={estado.barra} />
                </div>
              );
            })}
          </div>

          <p className="text-xs font-semibold text-textSec mt-5 mb-2.5">📊 Comparación con el mes anterior</p>
          <div className="space-y-2">
            {objetivosPorVendedor.filter((o) => !EXCLUIDOS_METAS_VENDEDOR.includes(o.vendedor)).map((o) => {
              const ventasActuales = datos.rankingVendedores.find((r) => r.nombre === o.vendedor)?.cantidad || 0;
              const ventasMesAnterior = (datos.rankingVendedoresMesAnterior || []).find((r) => r.nombre === o.vendedor)?.cantidad || 0;
              return (
                <div key={o.vendedor} className="flex items-center justify-between bg-bg border border-border rounded-lg px-3 py-2 text-xs">
                  <span className="font-medium">{o.vendedor}</span>
                  <span className="text-textSec">
                    Mes anterior: <b className="text-text">{ventasMesAnterior}</b> · Este mes: <b className="text-text">{ventasActuales}</b>
                  </span>
                  <Flecha actual={ventasActuales} anterior={ventasMesAnterior} />
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* CONFIGURACIÓN — ADMIN Y COORDINADOR */}
      {puedeEditar && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">⚙️ Configurar objetivos de {labelDeMes(mes)}</p>
            {!editando && objetivos && (
              <button onClick={() => setEditando(true)} className="text-xs text-accentTeal font-semibold">✏️ Editar</button>
            )}
          </div>
          {editando && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div>
                  <label className="text-[11px] text-textSec block mb-1">Meta facturación ($)</label>
                  <input type="text" inputMode="numeric" value={form.metaFacturacion}
                    onChange={(e) => setForm((f) => ({ ...f, metaFacturacion: e.target.value.replace(/\./g, '') }))}
                    className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] text-textSec block mb-1">Meta ventas</label>
                  <input type="text" inputMode="numeric" value={form.metaVentas}
                    onChange={(e) => setForm((f) => ({ ...f, metaVentas: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] text-textSec block mb-1">Meta leads</label>
                  <input type="text" inputMode="numeric" value={form.metaLeads}
                    onChange={(e) => setForm((f) => ({ ...f, metaLeads: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] text-textSec block mb-1">Meta conversión (%)</label>
                  <input type="text" inputMode="numeric" value={form.metaConversion}
                    onChange={(e) => setForm((f) => ({ ...f, metaConversion: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] text-textSec block mb-1">Meta ticket promedio ($)</label>
                  <input type="text" inputMode="numeric" value={form.metaTicketPromedio}
                    onChange={(e) => setForm((f) => ({ ...f, metaTicketPromedio: e.target.value.replace(/\./g, '') }))}
                    className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] text-textSec block mb-1">Meta ventas débito automático</label>
                  <input type="text" inputMode="numeric" value={form.metaVentasDebito}
                    onChange={(e) => setForm((f) => ({ ...f, metaVentasDebito: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] text-textSec block mb-1">Meta contactos de bajas</label>
                  <input type="text" inputMode="numeric" value={form.metaContactosBajas}
                    onChange={(e) => setForm((f) => ({ ...f, metaContactosBajas: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
                </div>
              </div>

              <p className="text-xs font-semibold text-textSec mb-2">Metas por curso (opcional)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                {datos.rankingCursos.map((c) => (
                  <div key={c.nombre} className="flex items-center gap-2">
                    <label className="text-[11px] text-textSec flex-1 truncate" title={c.nombre}>{c.nombre}</label>
                    <input type="text" inputMode="numeric" value={formPorCurso[c.nombre] ?? ''}
                      onChange={(e) => setFormPorCurso((f) => ({ ...f, [c.nombre]: e.target.value }))}
                      placeholder="—" className="w-16 bg-bg border border-border rounded-lg px-2 py-1 text-xs" />
                  </div>
                ))}
              </div>

              <p className="text-xs font-semibold text-textSec mb-2">Metas de ventas por vendedor (opcional)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {personasActivas.map((nombre) => {
                  const ventasActuales = datos.rankingVendedores.find((r) => r.nombre === nombre)?.cantidad || 0;
                  const metaIngresada = Number(formPorVendedor[nombre]) || 0;
                  const pct = metaIngresada > 0 ? (ventasActuales / metaIngresada) * 100 : null;
                  const estado = pct !== null ? estadoObjetivo(pct) : null;
                  return (
                    <div key={nombre} className="flex items-center gap-2 bg-bg border border-border rounded-lg px-2.5 py-1.5">
                      <label className="text-[11px] text-textSec flex-1 truncate" title={nombre}>{nombre}</label>
                      <input type="text" inputMode="numeric" value={formPorVendedor[nombre] ?? ''}
                        onChange={(e) => setFormPorVendedor((f) => ({ ...f, [nombre]: e.target.value }))}
                        placeholder="Meta" className="w-16 bg-surface border border-border rounded-lg px-2 py-1 text-xs shrink-0" />
                      <span className="text-[11px] text-textMuted shrink-0 w-24 text-right">
                        {pct !== null
                          ? <span className={`font-semibold ${estado.clase}`}>{ventasActuales} ventas · {pct.toFixed(0)}%</span>
                          : `${ventasActuales} ventas`}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                {objetivos && <button onClick={() => setEditando(false)} className="text-sm px-4 py-2 rounded-lg bg-surface2 border border-border">Cancelar</button>}
                <button onClick={guardar} disabled={guardando}
                  className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-60">
                  {guardando ? 'Guardando…' : 'Guardar objetivos'}
                </button>
              </div>
            </>
          )}
          {!editando && objetivos && (
            <p className="text-textMuted text-[11px]">
              Última actualización: {objetivos.actualizadoPorNombre} — {new Date(objetivos.fechaActualizacion).toLocaleDateString('es-AR')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SeccionEscalaInscripciones({ usuario }) {
  const esAdmin = usuario?.roles?.includes('Admin');
  const [cargando, setCargando] = useState(true);
  const [escalones, setEscalones] = useState([]);
  const [fechaActualizacion, setFechaActualizacion] = useState('');
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    const r = await fetch(`/api/escala-inscripciones?solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((res) => res.json());
    setEscalones(r.escalones?.length > 0 ? r.escalones : [{ orden: 1, rangoInscripciones: '', rango: '', valor: '' }]);
    setFechaActualizacion(r.fechaActualizacion || '');
    setCargando(false);
  }

  function actualizarEscalon(idx, campo, valor) {
    setEscalones((prev) => prev.map((e, i) => (i === idx ? { ...e, [campo]: valor } : e)));
  }

  function agregarFila() {
    setEscalones((prev) => [...prev, { orden: (prev[prev.length - 1]?.orden || 0) + 1, rangoInscripciones: '', rango: '', valor: '' }]);
  }

  async function guardar() {
    setGuardando(true);
    await fetch('/api/escala-inscripciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ escalones, fechaActualizacion, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setGuardando(false);
    setEditando(false);
    cargar();
  }

  if (cargando) return <Skeleton h="h-40" />;

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <p className="text-sm font-semibold">📐 Escala de Inscripciones</p>
        {esAdmin && !editando && (
          <button onClick={() => setEditando(true)} className="text-xs text-accentTeal font-semibold">✏️ Editar</button>
        )}
      </div>
      <p className="text-textMuted text-xs mb-4">
        Última actualización: {fechaActualizacion || 'sin definir'}
        {esAdmin && editando && (
          <input value={fechaActualizacion} onChange={(e) => setFechaActualizacion(e.target.value)}
            placeholder="Ej: Abril" className="ml-2 bg-bg border border-border rounded px-2 py-0.5 text-xs w-28" />
        )}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-textSec text-left border-b border-border">
              <th className="py-2 pr-4">Rango de inscripciones</th>
              <th className="pr-4">Rango</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {escalones.map((e, idx) => (
              <tr key={idx} className="border-b border-border">
                {editando ? (
                  <>
                    <td className="py-1.5 pr-4">
                      <input value={e.rangoInscripciones} onChange={(ev) => actualizarEscalon(idx, 'rangoInscripciones', ev.target.value)}
                        placeholder="Ej: 1 - 10" className="w-28 bg-bg border border-border rounded px-2 py-1 text-xs" />
                    </td>
                    <td className="pr-4">
                      <input value={e.rango} onChange={(ev) => actualizarEscalon(idx, 'rango', ev.target.value)}
                        placeholder="Ej: 1-20" className="w-24 bg-bg border border-border rounded px-2 py-1 text-xs" />
                    </td>
                    <td>
                      <input value={e.valor} onChange={(ev) => actualizarEscalon(idx, 'valor', ev.target.value)}
                        placeholder="Ej: 9.000" className="w-28 bg-bg border border-border rounded px-2 py-1 text-xs" />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 pr-4">{e.rangoInscripciones || '—'}</td>
                    <td className="pr-4 text-textSec">{e.rango || '—'}</td>
                    <td className="font-semibold text-successText">{e.valor ? `$${e.valor}` : '—'}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && (
        <div className="flex items-center gap-2 mt-4">
          <button onClick={agregarFila} className="text-xs px-3 py-1.5 rounded-lg bg-surface2 border border-border">+ Agregar escalón</button>
          <button onClick={() => setEditando(false)} className="text-xs px-3 py-1.5 rounded-lg bg-surface2 border border-border">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="text-xs px-3 py-1.5 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-60">
            {guardando ? 'Guardando…' : 'Guardar escala'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReportesPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState('general');
  const [mes, setMes] = useState('');
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [rangoDesde, setRangoDesde] = useState('');
  const [rangoHasta, setRangoHasta] = useState('');

  function formatoFecha(f) {
    return f.toISOString().slice(0, 10);
  }

  function cambiarRango(desde, hasta) {
    setRangoDesde(desde);
    setRangoHasta(hasta);
    if (mes) cargarDatos(mes, desde, hasta);
  }

  function filtrarHoy() {
    const hoy = formatoFecha(new Date());
    cambiarRango(hoy, hoy);
  }
  function filtrarAyer() {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const f = formatoFecha(ayer);
    cambiarRango(f, f);
  }
  function filtrarSemanaPasada() {
    // Semana pasada completa: de lunes a domingo de la semana anterior a esta.
    const hoy = new Date();
    const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay(); // 1=lunes ... 7=domingo
    const lunesDeEstaSemana = new Date(hoy);
    lunesDeEstaSemana.setDate(hoy.getDate() - diaSemana + 1);
    const domingoPasado = new Date(lunesDeEstaSemana);
    domingoPasado.setDate(lunesDeEstaSemana.getDate() - 1);
    const lunesPasado = new Date(domingoPasado);
    lunesPasado.setDate(domingoPasado.getDate() - 6);
    cambiarRango(formatoFecha(lunesPasado), formatoFecha(domingoPasado));
  }
  function filtrarMesPasado() {
    const hoy = new Date();
    const primerDiaMesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const ultimoDiaMesPasado = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    cambiarRango(formatoFecha(primerDiaMesPasado), formatoFecha(ultimoDiaMesPasado));
  }
  function limpiarRango() {
    cambiarRango('', '');
  }

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
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
    inicializar();
  }

  async function inicializar() {
    let lista = [new Date().toISOString().slice(0, 7)];
    try {
      const r = await fetch(`/api/reportes/meses-disponibles?solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((res) => res.json());
      if (r.meses?.length > 0) lista = r.meses;
    } catch (err) { /* si falla, se usa el mes actual como respaldo */ }
    setMesesDisponibles(lista);
    setMes(lista[0]);
    cargarDatos(lista[0]);
  }

  async function cargarDatos(mesElegido, desdeParametro, hastaParametro) {
    setCargando(true);
    setError('');
    try {
      const desde = desdeParametro !== undefined ? desdeParametro : rangoDesde;
      const hasta = hastaParametro !== undefined ? hastaParametro : rangoHasta;
      const rangoParam = desde && hasta ? `&desde=${desde}&hasta=${hasta}` : '';
      const res = await fetch(`/api/reportes?mes=${mesElegido}&solicitanteEmail=${encodeURIComponent(usuario.email)}${rangoParam}`);
      const r = await res.json();
      if (!res.ok || r.error) {
        setError(r.error || 'No se pudieron cargar los datos.');
        setDatos(null);
      } else {
        setDatos(r);
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor. Probá de nuevo.');
      setDatos(null);
    } finally {
      setCargando(false);
    }
  }

  function cambiarMes(m) {
    setMes(m);
    setRangoDesde('');
    setRangoHasta('');
    cargarDatos(m, '', '');
  }

  function setFiltro(campo, valor) {
    setFiltros((prev) => ({ ...prev, [campo]: prev[campo] === valor ? '' : valor }));
  }
  function limpiarFiltros() {
    setFiltros({ curso: '', vendedor: '', origen: '', medioPago: '', modalidad: '', pais: '', montoMin: '', montoMax: '' });
    setBusqueda('');
  }

  const [ordenFecha, setOrdenFecha] = useState('desc'); // 'desc' = mas reciente primero

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
    }).sort((a, b) => {
      const fa = new Date(a.fechaVenta || 0);
      const fb = new Date(b.fechaVenta || 0);
      return ordenFecha === 'desc' ? fb - fa : fa - fb;
    });
  }, [datos, busqueda, filtros, ordenFecha]);

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

  function exportarGrafico(nombreArchivo, filas) {
    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Datos');
    XLSX.writeFile(libro, `${nombreArchivo}-${mes}.xlsx`);
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
      <div className="max-w-[1900px] mx-auto px-4 pb-24 space-y-5">

        {/* FILTROS SUPERIORES */}
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-textSec block mb-1">Mes</label>
            <select value={mes} onChange={(e) => cambiarMes(e.target.value)}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm">
              {mesesDisponibles.map((m) => <option key={m} value={m}>{labelDeMes(m)}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-textSec block mb-1">Buscar venta o estudiante</label>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="🔍 Nombre, curso, origen…"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <TabBar tab={tab} setTab={setTab} />

        {error ? (
          <div className="bg-dangerBg border border-dangerText/30 rounded-2xl p-6 text-center">
            <p className="text-dangerText text-sm font-semibold mb-3">⚠️ {error}</p>
            <button onClick={() => cargarDatos(mes)} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold">
              Reintentar
            </button>
          </div>
        ) : cargando || !datos ? (
          <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : (
          <>
            {tab === 'general' && (
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

                {/* GRÁFICOS PRINCIPALES */}
                <div className="grid md:grid-cols-2 gap-4">
                  <ChartCard titulo="Evolución de ventas por día" subtitulo="Mes seleccionado — comparado con el mes anterior" tooltip="Cantidad de ventas confirmadas por día del mes, superpuesto con el mismo día del mes anterior. Pasá el mouse para ver el acumulado del mes hasta ese día."
                    valorGrande={`${datos.totalCompras} ventas`}
                    comparacion={<Flecha actual={datos.comparativa.ventas.actual} anterior={datos.comparativa.ventas.anterior} />}
                    onExportar={() => exportarGrafico('ventas-por-dia', (() => {
                      let acumulado = 0;
                      let acumuladoAnterior = 0;
                      return datos.serieDiaria.map((d, i) => {
                        acumulado += d.ventas;
                        const ventasMesAnterior = datos.serieDiariaMesAnterior?.[i]?.ventas ?? 0;
                        acumuladoAnterior += ventasMesAnterior;
                        return { dia: d.dia, ventas: d.ventas, acumulado, ventasMesAnterior, acumuladoMesAnterior: acumuladoAnterior };
                      });
                    })())}>
                    <ResponsiveContainer>
                      <LineChart data={(() => {
                        let acumulado = 0;
                        let acumuladoAnterior = 0;
                        return datos.serieDiaria.map((d, i) => {
                          acumulado += d.ventas;
                          const ventasMesAnterior = datos.serieDiariaMesAnterior?.[i]?.ventas ?? 0;
                          acumuladoAnterior += ventasMesAnterior;
                          return { dia: d.dia, ventas: d.ventas, acumulado, ventasMesAnterior, acumuladoMesAnterior: acumuladoAnterior };
                        });
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262c4a" />
                        <XAxis dataKey="dia" stroke="#6b7299" fontSize={11} />
                        <YAxis stroke="#6b7299" fontSize={11} allowDecimals={false} />
                        <Tooltip content={<TooltipVentasPorDia />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => (v === 'ventas' ? 'Este mes' : 'Mes anterior')} />
                        <Line type="monotone" dataKey="ventas" stroke="#22d3ee" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="ventasMesAnterior" stroke="#6b7299" strokeWidth={2} dot={false} strokeDasharray="4 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard titulo="Evolución de facturación e ingresos por día" subtitulo="Mes seleccionado"
                    tooltip="Facturación: valor total de cada venta, el día que se cerró. Ingresos: estimación de qué cuota cae en cada día (cada 30 días desde la venta) — no es un dato confirmado, es una proyección."
                    valorGrande={money(datos.montoTotal)}
                    comparacion={<Flecha actual={datos.comparativa.facturacion.actual} anterior={datos.comparativa.facturacion.anterior} />}
                    onExportar={() => exportarGrafico('facturacion-e-ingresos-por-dia', datos.serieDiaria.map((d, i) => ({
                      dia: d.dia, facturacion: d.monto, ingresosEstimados: datos.ingresosPorDia[i]?.monto || 0
                    })))}>
                    <ResponsiveContainer>
                      <LineChart data={datos.serieDiaria.map((d, i) => ({
                        dia: d.dia, facturacion: d.monto, ingresos: datos.ingresosPorDia[i]?.monto || 0
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262c4a" />
                        <XAxis dataKey="dia" stroke="#6b7299" fontSize={11} />
                        <YAxis stroke="#6b7299" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                        <Tooltip formatter={(v) => money(v)} contentStyle={{ background: '#181d35', border: '1px solid #262c4a', borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => (v === 'facturacion' ? 'Facturación' : 'Ingresos (estimado)')} />
                        <Line type="monotone" dataKey="facturacion" stroke="#7c3aed" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="ingresos" stroke="#4ade80" strokeWidth={2} dot={false} strokeDasharray="4 3" />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-textMuted text-[10.5px] mt-1.5">
                      🟢 Ingresos es una estimación (cuotas cada 30 días desde la venta) — no es un dato confirmado de cobro real.
                    </p>
                  </ChartCard>

                  <ChartCard titulo="Ventas por curso" subtitulo="Mes seleccionado"
                    valorGrande={`${datos.rankingCursos.length} curso${datos.rankingCursos.length !== 1 ? 's' : ''}`}
                    onExportar={() => exportarGrafico('ventas-por-curso', datos.rankingCursos)}>
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

                  <ChartCard titulo="Leads por curso" subtitulo="Mes seleccionado — todos los leads, hayan comprado o no"
                    tooltip="A diferencia de 'Ventas por curso', cuenta TODOS los leads que entraron este mes en cada formación"
                    valorGrande={`${datos.totalLeads} leads`}
                    comparacion={<Flecha actual={datos.comparativa.leads.actual} anterior={datos.comparativa.leads.anterior} />}
                    onExportar={() => exportarGrafico('leads-por-curso', datos.leadsPorCurso)}
                    alto={Math.max(280, datos.leadsPorCurso.length * 46)}>
                    <ResponsiveContainer>
                      <BarChart data={datos.leadsPorCurso} layout="vertical" margin={{ left: 50, top: 5, bottom: 5 }} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#262c4a" />
                        <XAxis type="number" stroke="#6b7299" fontSize={11} allowDecimals={false} />
                        <YAxis type="category" dataKey="nombre" stroke="#6b7299" width={140}
                          tick={<TickCursoDosLineas />} interval={0} />
                        <Tooltip contentStyle={{ background: '#181d35', border: '1px solid #262c4a', borderRadius: 8 }} />
                        <Bar dataKey="cantidad" fill="#a855f7" radius={[0, 4, 4, 0]} onClick={(d) => setFiltro('curso', d.nombre)} cursor="pointer" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard titulo="Ventas por vendedor" subtitulo="Mes seleccionado"
                    valorGrande={`${datos.rankingVendedores.length} vendedor${datos.rankingVendedores.length !== 1 ? 'es' : ''}`}
                    onExportar={() => exportarGrafico('ventas-por-vendedor', datos.rankingVendedores)}>
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
                </div>
              </>
            )}

            {tab === 'alertas' && (
              <SeccionAlertas alertasGenerales={datos.alertas} alertasCursos={datos.alertasCursos} mes={mes} setFiltro={setFiltro} />
            )}

            {tab === 'objetivos' && (
              <SeccionObjetivos datos={datos} mes={mes} usuario={usuario} />
            )}

            {tab === 'embudo' && (
              <>
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

                <div className="grid md:grid-cols-2 gap-4">
                  <ChartCard titulo="Días hasta la conversión" subtitulo="Mes seleccionado — cuánto tardó cada comprador desde que ingresó como lead" alto={200}
                    tooltip="Cuántas ventas se cerraron el mismo día, en la primera semana, al mes, etc. — para ver qué tan rápido convierte la mayoría"
                    valorGrande={`${datos.diasHastaConversion.reduce((acc, d) => acc + d.cantidad, 0)} venta${datos.diasHastaConversion.reduce((acc, d) => acc + d.cantidad, 0) !== 1 ? 's' : ''}`}
                    onExportar={() => exportarGrafico('dias-hasta-conversion', datos.diasHastaConversion)}>
                    <ResponsiveContainer>
                      <BarChart data={datos.diasHastaConversion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262c4a" vertical={false} />
                        <XAxis dataKey="nombre" stroke="#6b7299" fontSize={10} interval={0} angle={-15} textAnchor="end" height={40} />
                        <YAxis stroke="#6b7299" fontSize={11} allowDecimals={false} />
                        <Tooltip content={<TooltipDiasConversion />} />
                        <Bar dataKey="cantidad" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              </>
            )}

            {tab === 'actividad' && (
              <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <p className="text-sm font-semibold">👤 Actividad por persona</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button onClick={filtrarHoy} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${rangoDesde === formatoFecha(new Date()) && rangoHasta === rangoDesde ? 'bg-accentPurple border-accentPurple text-white' : 'bg-surface2 border-border text-textSec hover:text-text'}`}>Hoy</button>
                    <button onClick={filtrarAyer} className="text-xs px-2.5 py-1 rounded-full border bg-surface2 border-border text-textSec hover:text-text">Ayer</button>
                    <button onClick={filtrarSemanaPasada} className="text-xs px-2.5 py-1 rounded-full border bg-surface2 border-border text-textSec hover:text-text">Semana pasada</button>
                    <button onClick={filtrarMesPasado} className="text-xs px-2.5 py-1 rounded-full border bg-surface2 border-border text-textSec hover:text-text">Mes pasado</button>
                    <span className="text-textMuted text-xs mx-1">o elegí:</span>
                    <input type="date" value={rangoDesde} onChange={(e) => cambiarRango(e.target.value, rangoHasta || e.target.value)}
                      className="bg-bg border border-border rounded-lg px-2 py-1 text-xs" />
                    <span className="text-textMuted text-xs">a</span>
                    <input type="date" value={rangoHasta} onChange={(e) => cambiarRango(rangoDesde || e.target.value, e.target.value)}
                      className="bg-bg border border-border rounded-lg px-2 py-1 text-xs" />
                    {rangoDesde && rangoHasta && (
                      <button onClick={limpiarRango} className="text-textMuted text-xs underline ml-1">Ver todo el mes</button>
                    )}
                  </div>
                </div>
                <p className="text-textMuted text-xs mb-3">
                  {rangoDesde && rangoHasta
                    ? rangoDesde === rangoHasta
                      ? `Día ${new Date(rangoDesde + 'T00:00:00').toLocaleDateString('es-AR')} — leads cargados, contactos por lote y ventas cerradas.`
                      : `Del ${new Date(rangoDesde + 'T00:00:00').toLocaleDateString('es-AR')} al ${new Date(rangoHasta + 'T00:00:00').toLocaleDateString('es-AR')} — leads cargados, contactos por lote y ventas cerradas.`
                    : 'Mes seleccionado — leads cargados, contactos por lote y ventas cerradas.'}
                  {' '}Los contactos solo cuentan desde el 13/08/2026 (cuando se empezó a registrar quién contacta a cada uno de verdad).
                </p>
                {datos.actividadPorPersona.length === 0 ? (
                  <p className="text-textMuted text-sm">Sin actividad registrada este mes.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-textSec text-left border-b border-border">
                          <th className="py-2 pr-4">Persona</th>
                          <th className="pr-4">Leads cargados</th>
                          <th className="pr-3 text-center">L1</th>
                          <th className="pr-3 text-center">L2</th>
                          <th className="pr-3 text-center">L3</th>
                          <th className="pr-3 text-center">L4</th>
                          <th className="pr-3 text-center">L5</th>
                          <th className="pr-4 text-center">L6</th>
                          <th className="pr-4">Total contactos</th>
                          <th>Ventas cerradas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datos.actividadPorPersona.map((p) => (
                          <tr key={p.nombre} className="border-b border-border">
                            <td className="py-2 pr-4 font-medium">{p.nombre}</td>
                            <td className="pr-4">{p.leadsCargados}</td>
                            <td className="pr-3 text-center text-textSec">{p.contactosLote1}</td>
                            <td className="pr-3 text-center text-textSec">{p.contactosLote2}</td>
                            <td className="pr-3 text-center text-textSec">{p.contactosLote3}</td>
                            <td className="pr-3 text-center text-textSec">{p.contactosLote4}</td>
                            <td className="pr-3 text-center text-textSec">{p.contactosLote5}</td>
                            <td className="pr-4 text-center text-textSec">{p.contactosLote6}</td>
                            <td className="pr-4 font-semibold">{p.totalContactos}</td>
                            <td className="text-successText font-semibold">{p.ventasCerradas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === 'analisis' && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <ChartCard titulo="Facturación por curso" subtitulo="Mes seleccionado"
                    valorGrande={money(datos.montoTotal)}
                    onExportar={() => exportarGrafico('facturacion-por-curso', datos.rankingCursos)}>
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

                  <ChartCard titulo="Ventas por origen" subtitulo="Mes seleccionado" alto={200}
                    valorGrande={`${datos.rankingOrigenes.length} origen${datos.rankingOrigenes.length !== 1 ? 'es' : ''}`}
                    onExportar={() => exportarGrafico('ventas-por-origen', datos.rankingOrigenes)}>
                    <GraficoDona datos={datos.rankingOrigenes} onClickItem={(n) => setFiltro('origen', n)} activo={filtros.origen} />
                  </ChartCard>

                  <ChartCard titulo="Leads por origen" subtitulo="Mes seleccionado — todos los leads, hayan comprado o no" alto={200}
                    tooltip="A diferencia de 'Ventas por origen', cuenta TODOS los leads que entraron este mes por cada canal"
                    valorGrande={`${datos.leadsPorOrigen.length} origen${datos.leadsPorOrigen.length !== 1 ? 'es' : ''}`}
                    onExportar={() => exportarGrafico('leads-por-origen', datos.leadsPorOrigen)}>
                    <GraficoDona datos={datos.leadsPorOrigen} onClickItem={(n) => setFiltro('origen', n)} activo={filtros.origen} />
                  </ChartCard>

                  <ChartCard titulo="Medios de pago" subtitulo="Mes seleccionado" alto={200}
                    valorGrande={`${datos.rankingMedioPago.length} medio${datos.rankingMedioPago.length !== 1 ? 's' : ''}`}
                    onExportar={() => exportarGrafico('medios-de-pago', datos.rankingMedioPago)}>
                    <GraficoDona datos={datos.rankingMedioPago} onClickItem={(n) => setFiltro('medioPago', n)} activo={filtros.medioPago} />
                  </ChartCard>

                  <ChartCard titulo="Modalidades de pago" subtitulo="Mes seleccionado" alto={200}
                    valorGrande={`${datos.rankingModalidad.length} modalidad${datos.rankingModalidad.length !== 1 ? 'es' : ''}`}
                    onExportar={() => exportarGrafico('modalidades-de-pago', datos.rankingModalidad)}>
                    <GraficoDona datos={datos.rankingModalidad} onClickItem={(n) => setFiltro('modalidad', n)} activo={filtros.modalidad} />
                  </ChartCard>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <Ranking titulo="🏆 Top vendedores" items={datos.rankingVendedores} onClickItem={(n) => setFiltro('vendedor', n)} activo={filtros.vendedor} />
                  <Ranking titulo="🎓 Top cursos" items={datos.rankingCursos} onClickItem={(n) => setFiltro('curso', n)} activo={filtros.curso} />
                  <Ranking titulo="📣 Top orígenes" items={datos.rankingOrigenes} onClickItem={(n) => setFiltro('origen', n)} activo={filtros.origen} />
                  <Ranking titulo="👩‍🏫 Top docentes" items={datos.rankingDocentes} />
                  <Ranking titulo="📚 Top ediciones" items={datos.rankingEdiciones} />
                </div>
              </>
            )}

            {tab === 'compras' && (
              <>
                <div className="flex justify-end gap-2">
                  <button onClick={exportarExcel} className="text-sm px-3 py-2 rounded-lg bg-surface2 border border-border">⬇ Excel</button>
                  <button onClick={exportarCSV} className="text-sm px-3 py-2 rounded-lg bg-surface2 border border-border">⬇ CSV</button>
                  <button onClick={exportarPDF} className="text-sm px-3 py-2 rounded-lg bg-surface2 border border-border">⬇ PDF</button>
                </div>

                {/* FILTROS EXTENDIDOS */}
                <div className="bg-surface border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-textSec">Filtros de la tabla</p>
                    <button onClick={limpiarFiltros} className="text-xs text-accentTeal font-semibold">Limpiar todos los filtros</button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {[{ label: 'Lucila', buscar: 'Jesabel' }, { label: 'Alexander', buscar: 'Alexander' }].map(({ label, buscar }) => {
                      const nombreCompleto = [...new Set(datos.compras.map((c) => c.vendidoPor))].find((v) => v?.startsWith(buscar));
                      const cantidad = nombreCompleto ? datos.compras.filter((c) => c.vendidoPor === nombreCompleto).length : 0;
                      // Siempre visible aunque no haya ventas este mes — así no parece un error, solo dice (0).
                      return (
                        <button key={label} onClick={() => nombreCompleto && setFiltro('vendedor', nombreCompleto)}
                          disabled={!nombreCompleto}
                          className={`text-xs px-3 py-1 rounded-full border transition-colors disabled:opacity-50 ${
                            nombreCompleto && filtros.vendedor === nombreCompleto ? 'bg-accentPurple border-accentPurple text-white' : 'bg-surface2 border-border text-textSec hover:text-text'
                          }`}>
                          {label} ({cantidad})
                        </button>
                      );
                    })}
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
                    <input placeholder="Monto mínimo" type="text" inputMode="numeric" value={filtros.montoMin}
                      onChange={(e) => setFiltros((p) => ({ ...p, montoMin: e.target.value.replace(/\./g, '') }))}
                      className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs" />
                    <input placeholder="Monto máximo" type="text" inputMode="numeric" value={filtros.montoMax}
                      onChange={(e) => setFiltros((p) => ({ ...p, montoMax: e.target.value.replace(/\./g, '') }))}
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
                  <div className="overflow-x-auto max-h-[800px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-surface z-10">
                        <tr className="text-textSec text-left border-b border-border">
                          <th className="py-2 whitespace-nowrap">Lead</th><th className="whitespace-nowrap">Curso</th><th className="whitespace-nowrap">Origen</th><th className="whitespace-nowrap">Medio de pago</th>
                          <th className="whitespace-nowrap">Modalidad</th>
                          <th className="cursor-pointer select-none whitespace-nowrap" onClick={() => setOrdenFecha(ordenFecha === 'desc' ? 'asc' : 'desc')}>
                            Fecha de compra {ordenFecha === 'desc' ? '▼' : '▲'}
                          </th>
                          <th className="whitespace-nowrap">Monto</th><th className="whitespace-nowrap">Vendedor</th><th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {comprasFiltradas.map((c) => (
                          <tr key={c.id} className="border-b border-border hover:bg-bg transition-colors">
                            <td className="py-2.5 whitespace-nowrap">{c.lead}</td>
                            <td><Badge color={colorParaTexto(c.curso)}>{c.curso}</Badge></td>
                            <td><Badge color={colorParaTexto(c.origen)}>{c.origen}</Badge></td>
                            <td><Badge color={colorParaTexto(c.medioPago)}>{c.medioPago}</Badge></td>
                            <td><Badge color={colorParaTexto(c.modalidad)}>{c.modalidad}</Badge></td>
                            <td className="text-textSec whitespace-nowrap">
                              {c.fechaVenta ? new Date(c.fechaVenta).toLocaleDateString('es-AR') : '—'}
                            </td>
                            <td className="font-bold text-successText whitespace-nowrap">{money(c.montoTotal)}</td>
                            <td className="whitespace-nowrap">{c.vendidoPor}</td>
                            <td><button onClick={() => setFichaLeadId(c.id)} className="text-accentTeal text-xs font-semibold whitespace-nowrap">Ver ficha</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {comprasFiltradas.length === 0 && <p className="text-textMuted text-sm text-center py-6">Sin resultados con estos filtros.</p>}
                  </div>
                </div>
              </>
            )}

            {tab === 'escala' && (
              <SeccionEscalaInscripciones usuario={usuario} />
            )}
          </>
        )}
      </div>
      <FichaDrawer leadId={fichaLeadId} usuario={usuario} onClose={() => setFichaLeadId(null)} />
    </div>
  );
}
