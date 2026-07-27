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
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const puedeVer = tienePermisoAuditoria(usuario);

  useEffect(() => {
    if (!usuario) return;
    if (!puedeVer) { router.push('/dashboard'); return; }
    cargarRegistros();
  }, [usuario, filtroUsuario, desde, hasta]);

  async function cargarRegistros() {
    setCargando(true);
    const params = new URLSearchParams({ solicitanteEmail: usuario.email });
    if (filtroUsuario) params.set('usuario', filtroUsuario);
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const r = await fetch(`/api/auditoria?${params.toString()}`).then((res) => res.json());
    setRegistros(r.registros || []);
    setCargando(false);
  }

  function exportarExcel() {
    const hoja = XLSX.utils.json_to_sheet(
      registros.map((r) => ({
        Fecha: new Date(r.Fecha).toLocaleString('es-AR'),
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
  const registrosFiltrados = registros.filter((r) =>
    !busqueda.trim() ||
    `${r.Accion} ${r.Detalle}`.toLowerCase().includes(busqueda.trim().toLowerCase())
  );

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-5xl mx-auto px-6 pb-16">
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
              placeholder="🔍 Acción o detalle…"
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm w-48" />
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
          {cargando ? (
            <p className="text-textSec text-sm">Cargando…</p>
          ) : registrosFiltrados.length === 0 ? (
            <p className="text-textMuted text-sm">Sin registros para este filtro.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-textSec text-left border-b border-border">
                  <th className="py-2">Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((r, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="py-2">{new Date(r.Fecha).toLocaleString('es-AR')}</td>
                    <td>{r.UsuarioNombre}</td>
                    <td>{r.Accion}</td>
                    <td>{r.Detalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
