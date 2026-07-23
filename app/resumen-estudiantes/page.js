'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav from '../../components/Nav';
import { useSession } from '../../lib/useSession';
import { tienePermisoResumenEstudiantes } from '../../lib/permisos';

export default function ResumenEstudiantesPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  const puedeVer = tienePermisoResumenEstudiantes(usuario);

  useEffect(() => {
    if (!usuario) return;
    if (!puedeVer) { router.push('/dashboard'); return; }
    cargarDatos();
  }, [usuario]);

  async function cargarDatos() {
    setCargando(true);
    const r = await fetch(`/api/resumen-estudiantes?solicitanteEmail=${encodeURIComponent(usuario.email)}`)
      .then((res) => res.json());
    setDatos(r);
    setCargando(false);
  }

  if (!usuario || !puedeVer) return null;

  function exportarExcel() {
    if (!datos) return;
    const hoja = XLSX.utils.json_to_sheet(
      Object.entries(datos.porUsuario).map(([nombre, stats]) => ({
        Usuario: nombre, AltasRealizadas: stats.altas, BienvenidasEnviadas: stats.bienvenidas
      }))
    );
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Resumen Estudiantes');
    XLSX.writeFile(libro, `resumen-estudiantes-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-5xl mx-auto px-6 pb-16">
        {cargando || !datos ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : (
          <>
            <div className="flex justify-end mb-3">
              <button onClick={exportarExcel} className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm">
                ⬇ Exportar a Excel
              </button>
            </div>
            <div className="grid grid-cols-5 gap-3 mb-6">
              <Stat label="Total estudiantes" value={datos.totalEstudiantes} />
              <Stat label="Altas pendientes" value={datos.altasPendientes} />
              <Stat label="Altas hoy" value={datos.altasHoy} />
              <Stat label="Bienvenidas pendientes" value={datos.bienvenidasPendientes} />
              <Stat label="Bienvenidas hoy" value={datos.bienvenidasHoy} />
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5">
              <p className="text-sm font-semibold mb-3">Actividad por usuario</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-textSec text-left border-b border-border">
                    <th className="py-2">Usuario</th><th>Altas realizadas</th><th>Bienvenidas enviadas</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(datos.porUsuario).map(([nombre, stats]) => (
                    <tr key={nombre} className="border-b border-border">
                      <td className="py-2">{nombre}</td>
                      <td>{stats.altas}</td>
                      <td>{stats.bienvenidas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
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
