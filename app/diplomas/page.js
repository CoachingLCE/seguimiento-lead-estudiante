'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav from '../../components/Nav';
import FichaDrawer from '../../components/FichaDrawer';
import CheckboxVisual from '../../components/CheckboxVisual';
import { useToast } from '../../components/Toast';
import { useSession } from '../../lib/useSession';
import { tienePermisoDiplomas } from '../../lib/permisos';

export default function DiplomasPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();
  const { toast, mostrarToast } = useToast();
  const [inscritos, setInscritos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fichaLeadId, setFichaLeadId] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const puedeVer = tienePermisoDiplomas(usuario);

  useEffect(() => {
    if (!usuario) return;
    if (!puedeVer) { router.push('/dashboard'); return; }
    cargarInscritos();
  }, [usuario]);

  async function cargarInscritos() {
    setCargando(true);
    const r = await fetch(`/api/diplomas?solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((res) => res.json());
    setInscritos(r.inscritos || []);
    setCargando(false);
  }

  async function toggleDiploma(inscrito) {
    const nuevoValor = inscrito.AbonoTotalidad !== 'TRUE';
    setInscritos((prev) =>
      prev.map((i) => (i.ID === inscrito.ID ? { ...i, AbonoTotalidad: nuevoValor ? 'TRUE' : 'FALSE' } : i))
    );
    await fetch('/api/diplomas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: inscrito.ID, nuevoValor,
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    mostrarToast(nuevoValor ? 'Diploma habilitado' : 'Diploma deshabilitado');
  }

  if (!usuario || !puedeVer) return null;

  function exportarExcel() {
    const hoja = XLSX.utils.json_to_sheet(
      inscritos.map((i) => ({
        Estudiante: i.NombreEstudiante, Curso: i.Curso, Edicion: i.Edicion,
        AbonoTotalidad: i.AbonoTotalidad === 'TRUE' ? 'Sí' : 'No'
      }))
    );
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Diplomas');
    XLSX.writeFile(libro, `diplomas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-3 gap-3">
          <p className="text-textMuted text-xs">
            Marcá acá qué estudiantes ya abonaron la totalidad de la cursada (habilita el diploma).
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="🔍 Buscar…" className="bg-bg border border-border rounded-lg px-3 py-2 text-sm w-44" />
            <button onClick={exportarExcel} className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm">
              ⬇ Exportar a Excel
            </button>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          {cargando ? (
            <p className="text-textSec text-sm">Cargando…</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-textSec text-left border-b border-border">
                  <th className="py-2">Estudiante</th><th>Curso</th><th>Edición</th><th>Abonó la totalidad</th><th></th>
                </tr>
              </thead>
              <tbody>
                {inscritos
                  .filter((i) => !busqueda.trim() || (i.NombreEstudiante || '').toLowerCase().includes(busqueda.trim().toLowerCase()))
                  .map((i) => (
                  <tr key={i.ID} className="border-b border-border">
                    <td className="py-2">{i.NombreEstudiante}</td>
                    <td>{i.Curso || '—'}</td>
                    <td>{i.Edicion || '—'}</td>
                    <td>
                      <button onClick={() => toggleDiploma(i)}>
                        <CheckboxVisual marcado={i.AbonoTotalidad === 'TRUE'} />
                      </button>
                    </td>
                    <td>
                      <button onClick={() => setFichaLeadId(i.LeadId)} className="text-accentTeal text-xs font-semibold">Ver ficha</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <FichaDrawer leadId={fichaLeadId} usuario={usuario} onClose={() => setFichaLeadId(null)} />
      {toast}
    </div>
  );
}
