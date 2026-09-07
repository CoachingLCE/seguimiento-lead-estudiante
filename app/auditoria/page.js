'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav from '../../components/Nav';
import { useSession } from '../../lib/useSession';
import { tienePermisoAuditoria } from '../../lib/permisos';

// Colores distintos por persona, para reconocerla rápido en la lista sin leer el nombre —
// el mismo nombre siempre cae en el mismo color (hash simple sobre una paleta fija).
const PALETA_USUARIOS = [
  { bg: 'bg-accentPurple/20', text: 'text-accentPurple' },
  { bg: 'bg-accentTeal/20', text: 'text-accentTeal' },
  { bg: 'bg-successBg', text: 'text-successText' },
  { bg: 'bg-warningBg', text: 'text-warningText' },
  { bg: 'bg-infoBg', text: 'text-infoText' },
  { bg: 'bg-dangerBg', text: 'text-dangerText' },
  { bg: 'bg-accentMagenta/20', text: 'text-accentMagenta' }
];
function colorPorUsuario(nombre) {
  if (!nombre) return PALETA_USUARIOS[0];
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) % 997;
  return PALETA_USUARIOS[hash % PALETA_USUARIOS.length];
}

// Categoriza cada acción del historial — se usa tanto para los chips de filtro como para el
// color/ícono de cada fila, así ambos quedan siempre coherentes entre sí.
const CATEGORIAS_ACCION = [
  { id: 'venta', label: '💰 Venta', icono: '💰 ', clase: 'text-successText font-semibold', test: (a) => a === 'Registró una venta' },
  { id: 'lead', label: '📩 Lead', icono: '📩 ', clase: 'text-accentPurple font-medium', test: (a) => a === 'Creó un lead' },
  { id: 'grupoWhatsapp', label: '💬 Grupo WhatsApp', icono: '💬 ', clase: 'text-accentTeal font-medium', test: (a) => a.toLowerCase().includes('grupo de whatsapp') || a.toLowerCase().includes('grupo whatsapp') },
  { id: 'mensajeFrecuente', label: '📝 Mensaje frecuente', icono: '📝 ', clase: 'text-accentMagenta font-medium', test: (a) => a.toLowerCase().includes('mensaje frecuente') },
  { id: 'login', label: '🔑 Login', icono: '🔑 ', clase: 'text-infoText font-medium', test: (a) => a === 'Inició sesión' },
  { id: 'loginFallido', label: '⚠️ Login fallido', icono: '⚠️ ', clase: 'text-dangerText font-medium', test: (a) => a.toLowerCase().includes('login fallido') || a.toLowerCase().includes('login rechazado') },
  { id: 'eliminar', label: '🗑️ Eliminó', icono: '🗑️ ', clase: 'text-dangerText font-semibold', test: (a) => a.toLowerCase().includes('eliminó') || a.toLowerCase().includes('eliminado') },
  { id: 'editar', label: '✏️ Editó', icono: '✏️ ', clase: 'text-warningText font-medium', test: (a) => a.toLowerCase().includes('editó') || a.toLowerCase().includes('corrigió') }
];
function categoriaAccion(accion) {
  const a = accion || '';
  return CATEGORIAS_ACCION.find((c) => c.test(a)) || null;
}

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
  const [filtroCategoria, setFiltroCategoria] = useState('');
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
    if (filtroCategoria && categoriaAccion(r.Accion)?.id !== filtroCategoria) return false;
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

        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <button onClick={() => setFiltroCategoria('')}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filtroCategoria === '' ? 'bg-accentPurple border-accentPurple text-white' : 'bg-surface2 border-border text-textSec hover:text-text'
            }`}>
            Todas
          </button>
          {CATEGORIAS_ACCION.map((c) => (
            <button key={c.id} onClick={() => setFiltroCategoria(c.id)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filtroCategoria === c.id ? 'bg-accentPurple border-accentPurple text-white' : 'bg-surface2 border-border text-textSec hover:text-text'
              }`}>
              {c.label}
            </button>
          ))}
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
                  const cat = categoriaAccion(r.Accion);
                  const lead = r.LeadIdRelacionado ? leadsPorId[r.LeadIdRelacionado] : null;
                  return (
                    <tr key={i} className="border-b border-border">
                      <td className="py-2 whitespace-nowrap">{new Date(r.Fecha).toLocaleString('es-AR', { hour12: false })}</td>
                      <td className="whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorPorUsuario(r.UsuarioNombre).bg} ${colorPorUsuario(r.UsuarioNombre).text}`}>
                          {r.UsuarioNombre}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap overflow-hidden text-ellipsis ${cat?.clase || ''}`}>
                        {cat?.icono}{r.Accion}
                      </td>
                      <td className="leading-snug">
                        {r.LeadIdRelacionado ? (
                          <Link href={`/buscador?leadId=${r.LeadIdRelacionado}`} className="hover:text-accentTeal hover:underline">
                            {r.Detalle}
                          </Link>
                        ) : (
                          r.Detalle
                        )}
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
