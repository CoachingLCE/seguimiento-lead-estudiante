'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav, { puedeVerOperativo } from '../../components/Nav';
import ModalVenta from '../../components/ModalVenta';
import FichaDrawer from '../../components/FichaDrawer';
import { useToast } from '../../components/Toast';
import { useSession } from '../../lib/useSession';
import { tienePermisoEstudiantes } from '../../lib/permisos';
import { RESULTADOS_FINALES } from '../../lib/constants';

const HORAS_ALTA_DEMORADA = 24;

export default function DashboardPage() {
  const { usuario, cargando: cargandoSesion, logout } = useSession();
  const router = useRouter();
  const { toast, mostrarToast } = useToast();
  const [leads, setLeads] = useState([]);
  const [seguimiento, setSeguimiento] = useState([]);
  const [inscritos, setInscritos] = useState([]);
  const [leadVenta, setLeadVenta] = useState(null);
  const [fichaLeadId, setFichaLeadId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [pidiendoEmailPara, setPidiendoEmailPara] = useState(null);
  const [emailTemporal, setEmailTemporal] = useState('');
  const [procesandoId, setProcesandoId] = useState(null);

  const verEstudiantes = tienePermisoEstudiantes(usuario);

  useEffect(() => {
    if (!usuario) return;
    cargarDatos();
  }, [usuario]);

  async function cargarDatos() {
    setCargando(true);
    const pedidos = [
      fetch(`/api/leads?solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((r) => r.json()),
      fetch(`/api/seguimiento?solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((r) => r.json())
    ];
    if (verEstudiantes) {
      pedidos.push(fetch(`/api/inscritos?solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((r) => r.json()));
    }
    const [rLeads, rSeg, rIns] = await Promise.all(pedidos);
    setLeads(rLeads.leads || []);
    setSeguimiento(rSeg.seguimiento || []);
    setInscritos(rIns?.inscritos || []);
    setCargando(false);
  }

  const hoyStr = new Date().toDateString();
  const leadsHoy = leads.filter((l) => new Date(l.FechaIngreso).toDateString() === hoyStr).length;
  const mesActual = new Date().toISOString().slice(0, 7);
  const leadsMes = leads.filter((l) => (l.FechaIngreso || '').slice(0, 7) === mesActual).length;
  const comprados = leads.filter((l) => l.Estado === 'Comprado').length;
  const ventasRecientes = leads
    .filter((l) => l.Estado === 'Comprado' && l.Origen !== 'Carga manual (baja)')
    .sort((a, b) => new Date(b.FechaVenta || 0) - new Date(a.FechaVenta || 0))
    .slice(0, 30);

  const porCurso = useMemo(() => {
    const conteo = {};
    leads.forEach((l) => { conteo[l.Curso] = (conteo[l.Curso] || 0) + 1; });
    const max = Math.max(1, ...Object.values(conteo));
    return Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([curso, cant]) => ({
      curso, cant, pct: Math.round((cant / max) * 100)
    }));
  }, [leads]);

  const leadsResueltos = new Set(
    seguimiento.filter((s) => RESULTADOS_FINALES.includes(s.Resultado)).map((s) => s.LeadID)
  );
  const pendientesHoy = seguimiento.filter((s) => {
    if (s.Contactado === 'TRUE') return false;
    if (new Date(s.FechaVence) > new Date()) return false;
    const l = leads.find((x) => x.ID === s.LeadID);
    if (!l || l.Estado === 'Comprado') return false;
    if (leadsResueltos.has(s.LeadID)) return false;
    return true;
  });

  const ahoraMs = Date.now();
  const altasDemoradas = inscritos.filter((i) =>
    i.AltaPlataforma !== 'TRUE' &&
    ahoraMs - new Date(i.FechaInscripcion).getTime() > HORAS_ALTA_DEMORADA * 60 * 60 * 1000
  );
  const bienvenidasPendientes = inscritos.filter((i) => i.BienvenidaEnviada !== 'TRUE');

  function horasDesde(fecha) {
    return Math.floor((ahoraMs - new Date(fecha).getTime()) / (60 * 60 * 1000));
  }

  async function toggleAltaInline(inscrito) {
    setProcesandoId(inscrito.ID);
    await fetch('/api/inscritos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'alta', id: inscrito.ID, nuevoValor: true,
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    setProcesandoId(null);
    mostrarToast('Alta registrada');
    cargarDatos();
  }

  async function enviarBienvenidaInline(inscrito, email) {
    setProcesandoId(inscrito.ID);
    const res = await fetch('/api/inscritos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'bienvenida', id: inscrito.ID, email,
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    setProcesandoId(null);
    setPidiendoEmailPara(null);
    setEmailTemporal('');
    if (res.ok) { mostrarToast('Bienvenida enviada'); cargarDatos(); }
  }

  function clickEnviarBienvenidaInline(inscrito) {
    if (inscrito.EmailEstudiante) {
      enviarBienvenidaInline(inscrito, inscrito.EmailEstudiante);
    } else {
      setPidiendoEmailPara(inscrito.ID);
    }
  }

  function linkWhatsapp(numero) {
    const limpio = (numero || '').replace(/[^\d]/g, '');
    return `https://wa.me/${limpio}`;
  }

  const totalPendientes = pendientesHoy.length + altasDemoradas.length + bienvenidasPendientes.length;

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
            <div className="flex justify-between items-center mb-3 no-print">
              <p className="text-sm font-bold flex items-center gap-2">
                📌 Necesita tu atención ahora
                {totalPendientes > 0 && (
                  <span className="text-textMuted text-xs font-normal">· {totalPendientes} acciones pendientes</span>
                )}
              </p>
              <button onClick={exportarExcel} className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm">
                ⬇ Exportar a Excel
              </button>
            </div>

            {totalPendientes === 0 ? (
              <div className="bg-successBg rounded-xl p-4 mb-5 text-successText text-sm">
                ✓ No hay nada urgente pendiente ahora mismo.
              </div>
            ) : (
              <div className="bg-surface border border-dangerText/30 rounded-2xl p-4 mb-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-textSec text-left border-b border-border">
                      <th className="py-1.5 pr-2">Prioridad</th><th className="pr-2">Quién</th>
                      <th className="pr-2">Motivo</th><th className="pr-2">Detalle</th><th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {altasDemoradas.map((i) => (
                      <tr key={`alta-${i.ID}`} className="border-b border-border">
                        <td className="py-1.5 pr-2"><Pill tono="danger">🔴 Urgente</Pill></td>
                        <td className="pr-2">{i.NombreEstudiante}</td>
                        <td className="pr-2">Alta demorada</td>
                        <td className="pr-2">{i.Curso || '—'} · <Pill tono="danger">{horasDesde(i.FechaInscripcion)}hs</Pill></td>
                        <td className="flex items-center gap-2">
                          <button disabled={procesandoId === i.ID} onClick={() => toggleAltaInline(i)}
                            className="text-xs px-3 py-1 rounded-md bg-surface2 border border-border disabled:opacity-60">
                            {procesandoId === i.ID ? '...' : '✓ Marcar alta'}
                          </button>
                          <button onClick={() => setFichaLeadId(i.LeadId)} className="text-accentTeal text-xs font-semibold">Ver ficha</button>
                        </td>
                      </tr>
                    ))}
                    {bienvenidasPendientes.map((i) => (
                      <tr key={`bien-${i.ID}`} className="border-b border-border">
                        <td className="py-1.5 pr-2"><Pill tono="warning">🟡 Hoy</Pill></td>
                        <td className="pr-2">{i.NombreEstudiante}</td>
                        <td className="pr-2">Bienvenida sin enviar</td>
                        <td className="pr-2">{i.EmailEstudiante || 'Falta email del estudiante'}</td>
                        <td className="flex items-center gap-2">
                          {pidiendoEmailPara === i.ID ? (
                            <div className="flex items-center gap-1.5">
                              <input type="email" autoFocus placeholder="email@mail.com" value={emailTemporal}
                                onChange={(e) => setEmailTemporal(e.target.value)}
                                className="bg-bg border border-border rounded px-2 py-1 text-xs w-32" />
                              <button onClick={() => emailTemporal && enviarBienvenidaInline(i, emailTemporal)}
                                className="text-xs px-2 py-1 rounded bg-accentPurple text-white">Enviar</button>
                            </div>
                          ) : (
                            <button disabled={procesandoId === i.ID} onClick={() => clickEnviarBienvenidaInline(i)}
                              className="text-xs px-3 py-1 rounded-md bg-surface2 border border-border font-semibold disabled:opacity-60">
                              {procesandoId === i.ID ? '...' : '✉ Enviar'}
                            </button>
                          )}
                          <button onClick={() => setFichaLeadId(i.LeadId)} className="text-accentTeal text-xs font-semibold">Ver ficha</button>
                        </td>
                      </tr>
                    ))}
                    {pendientesHoy.map((s, i2) => {
                      const l = leads.find((x) => x.ID === s.LeadID);
                      return (
                        <tr key={`seg-${i2}`} className="border-b border-border">
                          <td className="py-1.5 pr-2"><Pill tono="warning">🟡 Hoy</Pill></td>
                          <td className="pr-2">{l ? `${l.Nombre} ${l.Apellido}` : s.LeadID}</td>
                          <td className="pr-2">Lead sin contactar</td>
                          <td className="pr-2">Lote {s.Lote} · asignado a {s.AsignadoANombre || 'sin asignar'}</td>
                          <td className="flex items-center gap-2">
                            {l?.WhatsApp && (
                              <a href={linkWhatsapp(l.WhatsApp)} target="_blank" rel="noopener noreferrer"
                                className="w-6 h-6 flex items-center justify-center rounded-md border border-border" title="WhatsApp">💬</a>
                            )}
                            <button onClick={() => setFichaLeadId(s.LeadID)} className="text-accentTeal text-xs font-semibold">Ver ficha</button>
                            <a href="/seguimiento" className="text-textSec text-xs">Ir a Seguimiento</a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className={`grid gap-3 mb-5 ${verEstudiantes ? 'grid-cols-5' : 'grid-cols-3'}`}>
              <Stat label="Leads hoy" value={leadsHoy} />
              <Stat label="Leads este mes" value={leadsMes} />
              <Stat label="Comprados" value={comprados} />
              {verEstudiantes && <Stat label="Altas demoradas" value={altasDemoradas.length} tono={altasDemoradas.length ? 'danger' : null} />}
              {verEstudiantes && <Stat label="Bienvenidas pend." value={bienvenidasPendientes.length} tono={bienvenidasPendientes.length ? 'warning' : null} />}
            </div>

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

            <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
              <p className="text-sm font-semibold mb-3">💰 Listado de ventas</p>
              {ventasRecientes.length === 0 ? (
                <p className="text-textMuted text-sm">Sin ventas registradas todavía.</p>
              ) : (
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-surface z-10">
                      <tr className="text-textSec text-left border-b border-border">
                        <th className="py-2 pr-3 whitespace-nowrap">Estudiante</th>
                        <th className="pr-3 whitespace-nowrap">Curso</th>
                        <th className="pr-3 whitespace-nowrap">Vendedor</th>
                        <th className="pr-3 whitespace-nowrap">Monto</th>
                        <th className="whitespace-nowrap">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasRecientes.map((l) => (
                        <tr key={l.ID} className="border-b border-border">
                          <td className="py-2 pr-3 whitespace-nowrap">{l.Nombre} {l.Apellido}</td>
                          <td className="pr-3 text-textSec whitespace-nowrap">{l.Curso || '—'}</td>
                          <td className="pr-3 text-textSec whitespace-nowrap">{l.VendidoPorNombre || '—'}</td>
                          <td className="pr-3 font-semibold text-successText whitespace-nowrap">
                            ${Number(l.MontoTotal || 0).toLocaleString('es-AR')}
                          </td>
                          <td className="whitespace-nowrap">
                            {l.FechaVenta ? new Date(l.FechaVenta).toLocaleDateString('es-AR') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                        <div className="flex items-center gap-2">
                          {l.Estado !== 'Comprado' && (
                            <button onClick={() => setLeadVenta(l)}
                              className="text-xs px-3 py-1 rounded-md bg-surface2 border border-border">
                              Marcar venta
                            </button>
                          )}
                          <button onClick={() => setFichaLeadId(l.ID)} className="text-accentTeal text-xs font-semibold">Ver ficha</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <ModalVenta lead={leadVenta} onClose={() => setLeadVenta(null)} onConfirm={confirmarVenta} usuarioActual={usuario} />
      <FichaDrawer leadId={fichaLeadId} usuario={usuario} onClose={() => setFichaLeadId(null)} />
      {toast}
    </div>
  );
}

function Stat({ label, value, tono }) {
  const borde = tono === 'danger' ? 'border-dangerText/40' : tono === 'warning' ? 'border-warningText/40' : 'border-border';
  return (
    <div className={`bg-surface border ${borde} rounded-xl p-3.5 relative`}>
      {tono && (
        <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ${tono === 'danger' ? 'bg-dangerText' : 'bg-warningText'}`} />
      )}
      <p className="text-textSec text-[11px] mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function Pill({ children, tono }) {
  const clases = tono === 'danger' ? 'bg-dangerBg text-dangerText'
    : tono === 'warning' ? 'bg-warningBg text-warningText'
    : 'bg-infoBg text-infoText';
  return <span className={`text-[10.5px] px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${clases}`}>{children}</span>;
}
