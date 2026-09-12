'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav from '../../components/Nav';
import AccesoDenegado from '../../components/AccesoDenegado';
import { useSession } from '../../lib/useSession';
import { tienePermisoResumenEstudiantes } from '../../lib/permisos';
import { colorParaCurso } from '../../lib/constants';

export default function ResumenEstudiantesPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mes, setMes] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('');

  const puedeVer = tienePermisoResumenEstudiantes(usuario);

  useEffect(() => {
    if (!usuario) return;
    if (!puedeVer) return; // ya no redirige — la pantalla en sí muestra el mensaje de acceso
    cargarDatos();
  }, [usuario, mes]);

  async function cargarDatos() {
    setCargando(true);
    const qs = new URLSearchParams({ solicitanteEmail: usuario.email });
    if (mes) qs.set('mes', mes);
    const r = await fetch(`/api/resumen-estudiantes?${qs.toString()}`).then((res) => res.json());
    setDatos(r);
    setCargando(false);
  }

  if (!usuario) return null;

  function labelDeMes(m) {
    const [anio, mm] = m.split('-').map(Number);
    const texto = new Date(anio, mm - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function exportarExcel() {
    if (!datos) return;
    const hoja = XLSX.utils.json_to_sheet(
      Object.entries(datos.porUsuario).map(([nombre, stats]) => ({
        Usuario: nombre, AltasRealizadas: stats.altas, BienvenidasEnviadas: stats.bienvenidas
      }))
    );
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Reportes Inscripciones');
    XLSX.writeFile(libro, `reportes-inscripciones-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const porCursoFiltrado = datos?.porCurso.filter((c) => !filtroCurso || c.curso === filtroCurso) || [];

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      {!puedeVer ? (
        <AccesoDenegado seccion="Reportes Inscripciones" />
      ) : (
      <div className="max-w-5xl mx-auto px-6 pb-16">
        {cargando || !datos ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
              <h3 className="text-lg font-bold">Reportes Inscripciones</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-2">
                  <span className="text-textMuted text-sm">📅</span>
                  <select value={mes} onChange={(e) => setMes(e.target.value)} className="bg-transparent text-sm font-medium focus:outline-none capitalize">
                    <option value="">Todos los meses</option>
                    {datos.mesesDisponibles.map((m) => <option key={m} value={m} className="capitalize">{labelDeMes(m)}</option>)}
                  </select>
                </div>
                <button onClick={exportarExcel} className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm">
                  ⬇ Exportar a Excel
                </button>
              </div>
            </div>
            <p className="text-textMuted text-xs mb-4">{mes ? labelDeMes(mes) : 'Todo el histórico'}</p>

            <div className="grid grid-cols-3 md:grid-cols-7 gap-3 mb-4">
              <Stat label="Total estudiantes" value={datos.totalEstudiantes} />
              <Stat label="Altas pendientes" value={datos.altasPendientes} />
              <Stat label="Altas hoy" value={datos.altasHoy} />
              <Stat label="Bienvenidas pendientes" value={datos.bienvenidasPendientes} />
              <Stat label="Bienvenidas hoy" value={datos.bienvenidasHoy} />
              <Stat label="Confirmaron recepción" value={datos.confirmaronRecepcion} />
              <Stat label="En grupo WhatsApp" value={datos.enGrupoWhatsapp} />
            </div>

            {datos.porCurso.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-4">
                <button onClick={() => setFiltroCurso('')}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    filtroCurso === '' ? 'bg-accentPurple border-accentPurple text-white' : 'bg-surface2 border-border text-textSec hover:text-text'
                  }`}>
                  Todos los cursos
                </button>
                {datos.porCurso.map((c) => (
                  <button key={c.curso} onClick={() => setFiltroCurso(c.curso)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      filtroCurso === c.curso ? 'bg-accentPurple border-accentPurple text-white' : 'bg-surface2 border-border text-textSec hover:text-text'
                    }`}>
                    {c.curso} ({c.cantidad})
                  </button>
                ))}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-surface border border-border rounded-2xl p-5">
                <p className="text-sm font-semibold mb-3">🎓 Estudiantes por curso</p>
                {porCursoFiltrado.length === 0 ? <p className="text-textMuted text-sm">Sin datos.</p> : (
                  <div className="space-y-2">
                    {porCursoFiltrado.map((c) => (
                      <div key={c.curso} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colorParaCurso(c.curso) }} />
                          <span className="truncate">{c.curso}</span>
                        </span>
                        <span className="text-textSec font-semibold shrink-0">{c.cantidad}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-surface border border-border rounded-2xl p-5">
                <p className="text-sm font-semibold mb-3">📚 Estudiantes por edición</p>
                {datos.porEdicion.length === 0 ? <p className="text-textMuted text-sm">Sin datos.</p> : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {datos.porEdicion
                      .filter((e) => !filtroCurso || e.edicion.startsWith(filtroCurso))
                      .map((e) => (
                        <div key={e.edicion} className="flex items-center justify-between text-sm gap-2">
                          <span className="truncate">{e.edicion}</span>
                          <span className="text-textSec font-semibold shrink-0">{e.cantidad}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
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
      )}
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
