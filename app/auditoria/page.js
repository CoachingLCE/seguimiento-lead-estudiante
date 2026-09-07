'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav from '../../components/Nav';
import { useSession } from '../../lib/useSession';
import { tienePermisoAuditoria } from '../../lib/permisos';

export default function AuditoriaPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [leadsPorId, setLeadsPorId] = useState({});

  const puedeVer = tienePermisoAuditoria(usuario);

  useEffect(() => {
    if (!usuario) return;
    if (!puedeVer) { router.push('/dashboard'); return; }
    cargarRegistros();
  }, [usuario, filtroUsuario, desde, hasta]);

  async function cargarRegistros() {
    setCargando(true);
    setErrorCarga('');
    const params = new URLSearchParams({ solicitanteEmail: usuario.email });
    if (filtroUsuario) params.set('usuario', filtroUsuario);
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    try {
      const [res, resLeads] = await Promise.all([
        fetch(`/api/auditoria?${params.toString()}`),
        fetch(`/api/leads?solicitanteEmail=${encodeURIComponent(usuario.email)}`)
      ]);
      const r = await res.json();
      if (!res.ok || r.error) {
        setErrorCarga(r.error || 'No se pudo cargar el historial.');
        setRegistros([]);
      } else {
        setRegistros(r.registros || []);
      }
      const rLeads = await resLeads.json();
      const mapa = {};
      (rLeads.leads || []).forEach((l) => { mapa[l.ID] = { Email: l.EmailEstudiante, WhatsApp: l.WhatsApp }; });
      setLeadsPorId(mapa);
    } catch (err) {
      setErrorCarga('No se pudo conectar con el servidor. Probá de nuevo.');
      setRegistros([]);
    }
    setCargando(false);
  }

  function exportarExcel() {
    const hoja = XLSX.utils.json_to_sheet(
      registros.map((r) => ({
        Fecha: new Date(r.Fecha).toLocaleString('es-AR', { hour12: false }),
        Usuario: r.UsuarioNombre,
        Accion: r.Accion,
        Detalle: r.Detalle,
        LeadId: r.LeadIdRelacionado
      }))
    );
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Auditoria');
    XLSX.writeFile(libro, `historial-acciones-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (!usuario || !puedeVer) return null;

  const usuariosUnicos = [...new Set(registros.map((r) => r.UsuarioNombre))].sort();
  const registrosFiltrados = registros.filter((r) => {
    if (!busqueda.trim()) return true;
    const lead = r.LeadIdRelacionado ? leadsPorId[r.LeadIdRelacionado] : null;
    const textoBuscable = `${r.Accion} ${r.Detalle} ${lead?.Email || ''} ${lead?.WhatsApp || ''}`.toLowerCase();
    return textoBuscable.includes(busqueda.trim().toLowerCase());
  });

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-[1600px] w-[88%] mx-auto pb-16">
        <div className="flex items-end gap-3 mb-4 flex-wrap no-print">
          <div>
            <label className="text-xs text-textSec block mb-1">Usuario</label>
            <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              {usuariosUnicos.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-textSec block mb-1">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-textSec block mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-textSec block mb-1">Buscar</label>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="🔍 Nombre, acción, email o WhatsApp…"
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm w-64" />
          </div>
          <button onClick={exportarExcel} className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm">
            ⬇ Exportar a Excel
          </button>
          <button onClick={() => window.print()} className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm">
            🖨️ Imprimir
          </button>
        </div>

        <div className="print-header">
          <p className="text-xs text-textMuted uppercase tracking-widest mb-1">Instituto ILCE</p>
          <h2 className="text-lg font-bold mb-4">Historial de acciones</h2>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5 print-section">
          {errorCarga ? (
            <div className="bg-dangerBg border border-dangerText/30 rounded-2xl p-6 text-center">
              <p className="text-dangerText text-sm font-semibold mb-3">⚠️ {errorCarga}</p>
              <button onClick={cargarRegistros} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold">
                Reintentar
              </button>
            </div>
          ) : cargando ? (
            <p className="text-textSec text-sm">Cargando…</p>
          ) : registrosFiltrados.length === 0 ? (
            <p className="text-textMuted text-sm">Sin registros para este filtro.</p>
          ) : (
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[150px]" />
                <col className="w-[160px]" />
                <col className="w-[220px]" />
                <col />
              </colgroup>
              <thead>
                <tr className="text-textSec text-left border-b border-border">
                  <th className="py-2">Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((r, i) => {
                  const esVenta = r.Accion === 'Registró una venta';
                  const esLead = r.Accion === 'Creó un lead';
                  const esLogin = r.Accion === 'Inició sesión';
                  const esLoginFallido = (r.Accion || '').toLowerCase().includes('login fallido') || (r.Accion || '').toLowerCase().includes('login rechazado');
                  const esGrupoWhatsapp = (r.Accion || '').toLowerCase().includes('grupo de whatsapp') || (r.Accion || '').toLowerCase().includes('grupo whatsapp');
                  const esMensajeFrecuente = (r.Accion || '').toLowerCase().includes('mensaje frecuente');
                  const esEliminar = (r.Accion || '').toLowerCase().includes('eliminó') || (r.Accion || '').toLowerCase().includes('eliminado');
                  const lead = r.LeadIdRelacionado ? leadsPorId[r.LeadIdRelacionado] : null;
                  return (
                    <tr key={i} className="border-b border-border">
                      <td className="py-2 whitespace-nowrap">{new Date(r.Fecha).toLocaleString('es-AR', { hour12: false })}</td>
                      <td className="whitespace-nowrap overflow-hidden text-ellipsis">{r.UsuarioNombre}</td>
                      <td className={`whitespace-nowrap overflow-hidden text-ellipsis ${
                        esVenta ? 'text-successText font-semibold' :
                        esLead ? 'text-accentPurple font-medium' :
                        esGrupoWhatsapp ? 'text-accentTeal font-medium' :
                        esMensajeFrecuente ? 'text-accentMagenta font-medium' :
                        esLogin ? 'text-infoText font-medium' :
                        esLoginFallido ? 'text-dangerText font-medium' :
                        esEliminar ? 'text-dangerText font-semibold' : ''
                      }`}>
                        {esVenta && '💰 '}{esLead && '📩 '}{esGrupoWhatsapp && '💬 '}{esMensajeFrecuente && '📝 '}{esLogin && '🔑 '}{esLoginFallido && '⚠️ '}{esEliminar && '🗑️ '}{r.Accion}
                      </td>
                      <td className="leading-snug">
                        {r.Detalle}
                        {lead && (
                          <p className="text-textMuted text-[11px] mt-0.5">
                            {lead.Email && `✉️ ${lead.Email}`}{lead.Email && lead.WhatsApp && ' · '}{lead.WhatsApp && `📱 ${lead.WhatsApp}`}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
