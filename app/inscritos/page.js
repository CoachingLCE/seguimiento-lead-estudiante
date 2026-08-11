'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav from '../../components/Nav';
import FichaDrawer from '../../components/FichaDrawer';
import CheckboxVisual from '../../components/CheckboxVisual';
import { useToast } from '../../components/Toast';
import { useSession } from '../../lib/useSession';
import { tienePermisoEstudiantes } from '../../lib/permisos';
import { colorParaCurso, normalizarEdicion } from '../../lib/constants';

function antiguedad(fecha) {
  const dias = Math.floor((new Date() - new Date(fecha)) / (24 * 60 * 60 * 1000));
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Hace 1 día';
  if (dias < 30) return `Hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  return `Hace ${meses} mes${meses > 1 ? 'es' : ''}`;
}

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
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('');
  const [filtroEdicion, setFiltroEdicion] = useState('');
  const [filtroDocente, setFiltroDocente] = useState('');
  const [ordenPor, setOrdenPor] = useState('FechaInscripcion');
  const [ordenDir, setOrdenDir] = useState('desc');

  const puedeVer = tienePermisoEstudiantes(usuario);
  const esAdmin = usuario?.roles?.includes('Admin');

  async function eliminarEstudiante() {
    if (!confirmarEliminar) return;
    await fetch('/api/inscritos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inscritoId: confirmarEliminar.ID,
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    setConfirmarEliminar(null);
    cargarInscritos();
  }

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

  async function toggleCampoSimple(inscrito, campo, etiqueta) {
    const nuevoValor = inscrito[campo] !== 'TRUE';
    setInscritos((prev) =>
      prev.map((i) => (i.ID === inscrito.ID ? { ...i, [campo]: nuevoValor ? 'TRUE' : 'FALSE' } : i))
    );
    await fetch('/api/inscritos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'toggle', campo, id: inscrito.ID, nuevoValor,
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    mostrarToast(`${etiqueta} ${nuevoValor ? 'marcado' : 'desmarcado'}`);
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
  const edicionesUnicas = [...new Set(inscritos.map((i) => normalizarEdicion(i.Edicion)).filter(Boolean))].sort();
  const docentesUnicos = [...new Set(
    inscritos.flatMap((i) => (i.Docentes || '').split(',').map((d) => d.trim()).filter(Boolean))
  )].sort();

  const inscritosFiltrados = inscritos
    .filter((i) => !busqueda.trim() || (i.NombreEstudiante || '').toLowerCase().includes(busqueda.trim().toLowerCase()))
    .filter((i) => !filtroCurso || i.Curso === filtroCurso)
    .filter((i) => !filtroEdicion || normalizarEdicion(i.Edicion) === filtroEdicion)
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
      <div className="max-w-[1400px] mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-3 no-print gap-3 flex-wrap">
          <p className="text-textMuted text-xs">
            El estudiante aparece acá solo, 24hs después de confirmarse la venta — no hace falta cargarlo a mano.
            <br />La lista se actualiza automáticamente todos los días a las 7:00 AM.
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1200px]">
                <thead>
                  <tr className="text-textSec text-left border-b border-border">
                    <th className="py-3 pr-4 cursor-pointer select-none whitespace-normal max-w-[90px]" onClick={() => ordenarPor('FechaInscripcion')}>Fecha de<br/>inscripción{flecha('FechaInscripcion')}</th>
                    <th className="pr-4 whitespace-normal max-w-[90px]">Estudiante<br/>desde</th>
                    <th className="pr-4 cursor-pointer select-none" onClick={() => ordenarPor('NombreEstudiante')}>Estudiante{flecha('NombreEstudiante')}</th>
                    <th className="pr-4 cursor-pointer select-none" onClick={() => ordenarPor('Curso')}>Curso{flecha('Curso')}</th>
                    <th className="pr-4 cursor-pointer select-none" onClick={() => ordenarPor('Edicion')}>Edición{flecha('Edicion')}</th>
                    <th className="pr-4">Bienvenida</th>
                    <th className="pr-4 whitespace-normal max-w-[80px]">Confirmó<br/>recepción</th>
                    <th className="pr-4 whitespace-normal max-w-[80px]">Alta<br/>plataforma</th>
                    <th className="pr-4 whitespace-normal max-w-[80px]">Grupo<br/>WhatsApp</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inscritosOrdenados.map((i) => {
                    const color = colorParaCurso(i.Curso);
                    return (
                      <tr key={i.ID} className="border-b border-border align-top hover:bg-bg/40 transition-colors">
                        <td className="py-3 pr-4 text-textSec whitespace-nowrap">{new Date(i.FechaInscripcion).toLocaleDateString('es-AR')}</td>
                        <td className="py-3 pr-4 text-textMuted text-xs whitespace-nowrap">{antiguedad(i.FechaInscripcion)}</td>
                        <td className="py-3 pr-4 font-medium">{i.NombreEstudiante}</td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium whitespace-nowrap"
                            style={{ background: `${color}1A`, color }}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                            {i.Curso || 'Sin curso'}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-textSec">{normalizarEdicion(i.Edicion) || '—'}</td>
                        <td className="py-3 pr-4">
                          {i.BienvenidaEnviada === 'TRUE' ? (
                            <>
                              <span>✓</span>
                              <p className="text-textMuted text-[11px] mt-1 whitespace-nowrap">
                                {i.BienvenidaPorNombre}<br/>{new Date(i.FechaBienvenida).toLocaleDateString('es-AR')}
                              </p>
                            </>
                          ) : pidiendoEmailPara === i.ID ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="email" autoFocus placeholder="email@mail.com" value={emailTemporal}
                                onChange={(e) => setEmailTemporal(e.target.value)}
                                className="bg-bg border border-border rounded px-2 py-1 text-xs w-32"
                              />
                              <button
                                onClick={() => emailTemporal && enviarBienvenidaDesdeTabla(i, emailTemporal)}
                                className="text-xs px-2 py-1 rounded bg-accentPurple text-white shrink-0"
                              >
                                Enviar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => clickEnviarBienvenida(i)}
                              disabled={enviandoBienvenidaId === i.ID}
                              className="text-xs px-2.5 py-1 rounded-md bg-surface2 border border-border font-semibold disabled:opacity-60 whitespace-nowrap"
                            >
                              {enviandoBienvenidaId === i.ID ? 'Enviando…' : 'ENVIAR'}
                            </button>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <button onClick={() => toggleCampoSimple(i, 'ConfirmoRecepcion', 'Confirmó recepción')}>
                            <CheckboxVisual marcado={i.ConfirmoRecepcion === 'TRUE'} />
                          </button>
                        </td>
                        <td className="py-3 pr-4">
                          <button onClick={() => toggleAlta(i)} className="block">
                            <CheckboxVisual marcado={i.AltaPlataforma === 'TRUE'} />
                          </button>
                          {i.AltaPlataforma === 'TRUE' && (
                            <p className="text-textMuted text-[11px] mt-1 whitespace-nowrap">
                              {i.AltaPorNombre}<br/>{new Date(i.FechaAlta).toLocaleDateString('es-AR')}
                            </p>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <button onClick={() => toggleCampoSimple(i, 'GrupoWhatsApp', 'Grupo WhatsApp')}>
                            <CheckboxVisual marcado={i.GrupoWhatsApp === 'TRUE'} />
                          </button>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setFichaLeadId(i.LeadId)} className="text-accentTeal text-xs font-semibold whitespace-nowrap">Ver ficha</button>
                            {esAdmin && (
                              <button onClick={() => setConfirmarEliminar(i)} className="text-xs text-dangerText font-semibold">🗑</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <FichaDrawer leadId={fichaLeadId} usuario={usuario} onClose={() => setFichaLeadId(null)} />
      {toast}

      {confirmarEliminar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface2 border border-border rounded-2xl p-6 w-96">
            <p className="text-sm font-bold mb-2">¿Estás seguro de que querés eliminar este estudiante?</p>
            <p className="text-textSec text-sm mb-5">
              <b>{confirmarEliminar.NombreEstudiante}</b> — {confirmarEliminar.Curso || 'sin curso'}.<br/>
              Esto borra también el lead y la venta asociada, así el sistema no lo vuelve a generar solo al otro día.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmarEliminar(null)}
                className="flex-1 bg-surface border border-border rounded-lg py-2 text-sm">Cancelar</button>
              <button onClick={eliminarEstudiante}
                className="flex-1 bg-dangerText text-white rounded-lg py-2 text-sm font-semibold">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
