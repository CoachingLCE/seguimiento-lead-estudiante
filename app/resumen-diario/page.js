'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav from '../../components/Nav';
import { tienePermisoResumenDiario } from '../../lib/permisos';
import { useSession } from '../../lib/useSession';

function hoyStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ResumenDiarioPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();
  const [fecha, setFecha] = useState(hoyStr());
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  const puedeVer = tienePermisoResumenDiario(usuario);

  useEffect(() => {
    if (!usuario) return;
    if (!puedeVer) { router.push('/dashboard'); return; }
    cargarResumen();
  }, [usuario, fecha]);

  async function cargarResumen() {
    setCargando(true);
    const r = await fetch(`/api/resumen-diario?fecha=${fecha}&solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((res) => res.json());
    setDatos(r);
    setCargando(false);
  }

  if (!usuario || !puedeVer) return null;

  const fechaLegible = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  function exportarExcel() {
    if (!datos) return;
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(datos.leadsDelDia), 'Leads');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(datos.contactosDelDia), 'Contactos');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(datos.inscritosDelDia), 'Estudiantes');
    XLSX.writeFile(libro, `resumen-diario-${fecha}.xlsx`);
  }

  return (
    <div>
      <div className="no-print">
        <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-5 no-print">
          <div>
            <label className="text-xs text-textSec block mb-1">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={exportarExcel} className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm">
              ⬇ Exportar a Excel
            </button>
            <button onClick={() => window.print()}
              className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm">
              🖨️ Imprimir / Exportar a PDF
            </button>
          </div>
        </div>

        <div className="print-header">
          <p className="text-xs text-textMuted uppercase tracking-widest mb-1">Instituto ILCE</p>
          <h2 className="text-lg font-bold capitalize mb-4">Resumen diario — {fechaLegible}</h2>
        </div>

        {cargando || !datos ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : (
          <>
            <Seccion titulo={`Leads cargados (${datos.leadsDelDia.length})`}>
              {datos.leadsDelDia.length === 0 ? (
                <p className="text-textMuted text-sm">Sin leads cargados este día.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-textSec text-left border-b border-border">
                      <th className="py-1.5">Nombre</th><th>Curso</th><th>Origen</th><th>Estado</th><th>Cargado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.leadsDelDia.map((l, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="py-1.5">{l.nombre}</td>
                        <td>{l.curso}</td>
                        <td>{l.origen}</td>
                        <td>{l.estado}</td>
                        <td>{l.cargadoPor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Seccion>

            <Seccion titulo={`Contactos de seguimiento registrados (${datos.contactosDelDia.length})`}>
              {datos.contactosDelDia.length === 0 ? (
                <p className="text-textMuted text-sm">Sin contactos registrados este día.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-textSec text-left border-b border-border">
                      <th className="py-1.5">Lead</th><th>Lote</th><th>Resultado</th><th>Contactado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.contactosDelDia.map((c, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="py-1.5">{c.lead}</td>
                        <td>Lote {c.lote}</td>
                        <td>{c.resultado}</td>
                        <td>{c.contactadoPor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Seccion>

            <Seccion titulo={`Estudiantes inscritos (${datos.inscritosDelDia.length})`}>
              {datos.inscritosDelDia.length === 0 ? (
                <p className="text-textMuted text-sm">Sin inscritos cargados este día.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-textSec text-left border-b border-border">
                      <th className="py-1.5">Estudiante</th><th>Curso</th><th>Edición</th>
                      <th>Alta plataforma</th><th>Bienvenida</th><th>Cargado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.inscritosDelDia.map((e, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="py-1.5">{e.estudiante}</td>
                        <td>{e.curso}</td>
                        <td>{e.edicion}</td>
                        <td>{e.altaPlataforma ? '✓' : '—'}</td>
                        <td>{e.bienvenidaEnviada ? '✓' : '—'}</td>
                        <td>{e.cargadoPor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Seccion>
          </>
        )}
      </div>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 mb-4 print-section">
      <p className="text-sm font-semibold mb-3">{titulo}</p>
      {children}
    </div>
  );
}
