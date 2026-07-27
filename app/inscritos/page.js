'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav from '../../components/Nav';
import FichaDrawer from '../../components/FichaDrawer';
import { useToast } from '../../components/Toast';
import { useSession } from '../../lib/useSession';
import { tienePermisoEstudiantes } from '../../lib/permisos';

export default function InscritosPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();
  const { toast, mostrarToast } = useToast();
  const [inscritos, setInscritos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pidiendoEmailPara, setPidiendoEmailPara] = useState(null);
  const [emailTemporal, setEmailTemporal] = useState('');
  const [enviandoBienvenidaId, setEnviandoBienvenidaId] = useState(null);
  const [fichaLeadId, setFichaLeadId] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('');
  const [filtroEdicion, setFiltroEdicion] = useState('');
  const [filtroDocente, setFiltroDocente] = useState('');
  const [ordenPor, setOrdenPor] = useState('FechaInscripcion');
  const [ordenDir, setOrdenDir] = useState('desc');

  const puedeVer = tienePermisoEstudiantes(usuario);

  useEffect(() => {
    if (!usuario) return;
    if (!puedeVer) { router.push('/dashboard'); return; }
    cargarInscritos();
  }, [usuario]);

  async function cargarInscritos() {
    setCargando(true);
    const r = await fetch(`/api/inscritos?solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((res) => res.json());
    setInscritos(r.inscritos || []);
    setCargando(false);
  }

  async function toggleAlta(inscrito) {
    const nuevoValor = inscrito.AltaPlataforma !== 'TRUE';
    setInscritos((prev) =>
      prev.map((i) => (i.ID === inscrito.ID ? { ...i, AltaPlataforma: nuevoValor ? 'TRUE' : 'FALSE' } : i))
    );
    await fetch('/api/inscritos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'alta', id: inscrito.ID, nuevoValor,
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    mostrarToast(nuevoValor ? 'Alta registrada' : 'Alta desmarcada');
    cargarInscritos();
  }

  async function enviarBienvenidaDesdeTabla(inscrito, email) {
    setEnviandoBienvenidaId(inscrito.ID);
    const res = await fetch('/api/inscritos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'bienvenida', id: inscrito.ID, email,
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    setEnviandoBienvenidaId(null);
    setPidiendoEmailPara(null);
    setEmailTemporal('');
    if (res.ok) { mostrarToast('Bienvenida enviada'); cargarInscritos(); }
  }

  function clickEnviarBienvenida(inscrito) {
    if (inscrito.EmailEstudiante) {
      enviarBienvenidaDesdeTabla(inscrito, inscrito.EmailEstudiante);
    } else {
      setPidiendoEmailPara(inscrito.ID);
    }
  }

  if (!usuario || !puedeVer) return null;

  const cursosUnicos = [...new Set(inscritos.map((i) => i.Curso).filter(Boolean))].sort();
  const edicionesUnicas = [...new Set(inscritos.map((i) => i.Edicion).filter(Boolean))].sort();
  const docentesUnicos = [...new Set(
    inscritos.flatMap((i) => (i.Docentes || '').split(',').map((d) => d.trim()).filter(Boolean))
  )].sort();

  const inscritosFiltrados = inscritos
    .filter((i) => !busqueda.trim() || (i.NombreEstudiante || '').toLowerCase().includes(busqueda.trim().toLowerCase()))
    .filter((i) => !filtroCurso || i.Curso === filtroCurso)
    .filter((i) => !filtroEdicion || i.Edicion === filtroEdicion)
    .filter((i) => !filtroDocente || (i.Docentes || '').split(',').map((d) => d.trim()).includes(filtroDocente));

  const inscritosOrdenados = [...inscritosFiltrados].sort((a, b) => {
    let va = a[ordenPor] || '';
    let vb = b[ordenPor] || '';
    if (ordenPor === 'FechaInscripcion') { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
    if (va < vb) return ordenDir === 'asc' ? -1 : 1;
    if (va > vb) return ordenDir === 'asc' ? 1 : -1;
    return 0;
  });

  function ordenarPor(campo) {
    if (ordenPor === campo) {
      setOrdenDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrdenPor(campo);
      setOrdenDir('asc');
    }
  }

  function flecha(campo) {
    if (ordenPor !== campo) return '';
    return ordenDir === 'asc' ? ' ▲' : ' ▼';
  }

  function exportarExcel() {
    const hoja = XLSX.utils.json_to_sheet(
      inscritosFiltrados.map((i) => ({
        Estudiante: i.NombreEstudiante, Curso: i.Curso, Edicion: i.Edicion, Docentes: i.Docentes,
        FechaInscripcion: new Date(i.FechaInscripcion).toLocaleDateString('es-AR'),
        AltaPlataforma: i.AltaPlataforma === 'TRUE' ? 'Sí' : 'No', AltaPor: i.AltaPorNombre,
        BienvenidaEnviada: i.BienvenidaEnviada === 'TRUE' ? 'Sí' : 'No', BienvenidaPor: i.BienvenidaPorNombre
      }))
    );
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Estudiantes');
    XLSX.writeFile(libro, `estudiantes-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-3 no-print gap-3 flex-wrap">
          <p className="text-textMuted text-xs">
            El estudiante aparece acá solo, 24hs después de confirmarse la venta — no hace falta cargarlo a mano.
          </p>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm">
              <option value="">Todas las formaciones</option>
              {cursosUnicos.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filtroEdicion} onChange={(e) => setFiltroEdicion(e.target.value)}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm">
              <option value="">Todas las ediciones</option>
              {edicionesUnicas.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={filtroDocente} onChange={(e) => setFiltroDocente(e.target.value)}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos los docentes</option>
              {docentesUnicos.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="🔍 Buscar…" className="bg-bg border border-border rounded-lg px-3 py-2 text-sm w-40" />
            <button onClick={exportarExcel} className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm">
              ⬇ Exportar a Excel
            </button>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-sm font-semibold mb-3">Inscritos cargados</p>
          {cargando ? (
            <p className="text-textSec text-sm">Cargando…</p>
          ) : inscritos.length === 0 ? (
            <p className="text-textMuted text-sm">Todavía no hay estudiantes generados.</p>
          ) : inscritosFiltrados.length === 0 ? (
            <p className="text-textMuted text-sm">Ningún estudiante coincide con los filtros.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-textSec text-left border-b border-border">
                  <th className="py-2 cursor-pointer select-none" onClick={() => ordenarPor('NombreEstudiante')}>Estudiante{flecha('NombreEstudiante')}</th>
                  <th className="cursor-pointer select-none" onClick={() => ordenarPor('Curso')}>Curso{flecha('Curso')}</th>
                  <th className="cursor-pointer select-none" onClick={() => ordenarPor('Edicion')}>Edición{flecha('Edicion')}</th>
                  <th>Docente(s)</th>
                  <th className="cursor-pointer select-none" onClick={() => ordenarPor('FechaInscripcion')}>Fecha inscripción{flecha('FechaInscripcion')}</th>
                  <th>Alta plataforma</th><th>Bienvenida</th><th></th>
                </tr>
              </thead>
              <tbody>
                {inscritosOrdenados.map((i) => (
                  <tr key={i.ID} className="border-b border-border align-top">
                    <td className="py-2">{i.NombreEstudiante}</td>
                    <td>{i.Curso || '—'}</td>
                    <td>{i.Edicion || '—'}</td>
                    <td>{i.Docentes || '—'}</td>
                    <td>{new Date(i.FechaInscripcion).toLocaleDateString('es-AR')}</td>
                    <td>
                      <button onClick={() => toggleAlta(i)} className="text-base leading-none block">
                        {i.AltaPlataforma === 'TRUE' ? '✅' : '⬜'}
                      </button>
                      {i.AltaPlataforma === 'TRUE' && (
                        <p className="text-textMuted text-[11px] mt-0.5">
                          {i.AltaPorNombre} · {new Date(i.FechaAlta).toLocaleString('es-AR')}
                        </p>
                      )}
                    </td>
                    <td>
                      {i.BienvenidaEnviada === 'TRUE' ? (
                        <>
                          <span>✓</span>
                          <p className="text-textMuted text-[11px] mt-0.5">
                            {i.BienvenidaPorNombre} · {new Date(i.FechaBienvenida).toLocaleString('es-AR')}
                          </p>
                        </>
                      ) : pidiendoEmailPara === i.ID ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="email" autoFocus placeholder="email@mail.com" value={emailTemporal}
                            onChange={(e) => setEmailTemporal(e.target.value)}
                            className="bg-bg border border-border rounded px-2 py-1 text-xs w-36"
                          />
                          <button
                            onClick={() => emailTemporal && enviarBienvenidaDesdeTabla(i, emailTemporal)}
                            className="text-xs px-2 py-1 rounded bg-accentPurple text-white"
                          >
                            Enviar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => clickEnviarBienvenida(i)}
                          disabled={enviandoBienvenidaId === i.ID}
                          className="text-xs px-2.5 py-1 rounded-md bg-surface2 border border-border font-semibold disabled:opacity-60"
                        >
                          {enviandoBienvenidaId === i.ID ? 'Enviando…' : 'ENVIAR BIENVENIDA'}
                        </button>
                      )}
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
