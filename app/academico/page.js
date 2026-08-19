'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav from '../../components/Nav';
import { useSession } from '../../lib/useSession';
import { tienePermisoAcademico } from '../../lib/permisos';

const SITUACIONES = ['', 'Certificado', 'No se certificó', 'Baja', 'Cambio de cursada'];
const COLOR_SITUACION = {
  'Certificado': 'bg-successBg text-successText',
  'No se certificó': 'bg-warningBg text-warningText',
  'Baja': 'bg-dangerBg text-dangerText',
  'Cambio de cursada': 'bg-infoBg text-infoText',
  '': 'bg-surface2 text-textMuted'
};

// Pega una tabla (de Sheets/Excel, separada por tabs) con columnas:
// Nombre completo | Email | Situación académica | Edición — se puede pegar con o sin el
// encabezado, lo detecta y lo ignora solo.
function parsearFilasAcademico(texto) {
  const lineas = texto.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim() !== '');
  return lineas
    .filter((l) => !/^nombre\s*completo/i.test(l.trim()))
    .map((linea) => {
      const cols = linea.split('\t');
      return {
        nombre: (cols[0] || '').trim(),
        email: (cols[1] || '').trim(),
        situacion: (cols[2] || '').trim(),
        edicion: (cols[3] || '').trim()
      };
    })
    .filter((e) => e.nombre);
}

function calcularResumenEdiciones(estudiantes, ediciones, formador) {
  const porEdicion = {};
  estudiantes.forEach((e) => {
    const ed = e.Edicion || 'Sin edición';
    if (!porEdicion[ed]) porEdicion[ed] = { edicion: ed, inscritos: 0, certificados: 0, bajas: 0, cc: 0, noCertificaron: 0 };
    porEdicion[ed].inscritos++;
    if (e.SituacionAcademica === 'Certificado') porEdicion[ed].certificados++;
    else if (e.SituacionAcademica === 'Baja') porEdicion[ed].bajas++;
    else if (e.SituacionAcademica === 'Cambio de cursada') porEdicion[ed].cc++;
    else if (e.SituacionAcademica === 'No se certificó') porEdicion[ed].noCertificaron++;
  });
  return Object.values(porEdicion)
    .map((r) => {
      const edicionInfo = ediciones.find((x) => x.Edicion === r.edicion);
      const fechaInicio = edicionInfo?.FechaInicio || '';
      let cursada = 'Sin fecha de inicio';
      if (fechaInicio) {
        const dias = Math.floor((new Date() - new Date(fechaInicio)) / (1000 * 60 * 60 * 24));
        cursada = dias > 30 ? 'Curso cerrado' : 'En curso';
      }
      return {
        ...r, formador, fechaInicio, cursada,
        porcentajeBajas: r.inscritos ? (r.bajas / r.inscritos) * 100 : 0,
        porcentajeCertificados: r.inscritos ? (r.certificados / r.inscritos) * 100 : 0
      };
    })
    .sort((a, b) => a.edicion.localeCompare(b.edicion, 'es', { numeric: true }));
}

export default function AcademicoPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();

  const [cursoActual, setCursoActual] = useState('');
  const [cursosDisponibles, setCursosDisponibles] = useState([]);
  const [nuevoCursoTexto, setNuevoCursoTexto] = useState('');
  const [estudiantes, setEstudiantes] = useState([]);
  const [ediciones, setEdiciones] = useState([]);
  const [cursosInfo, setCursosInfo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const [textoCarga, setTextoCarga] = useState('');
  const [mostrarCarga, setMostrarCarga] = useState(false);
  const [cargandoImport, setCargandoImport] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEdicion, setFiltroEdicion] = useState('');
  const [seleccionadas, setSeleccionadas] = useState(new Set());
  const [editandoFormador, setEditandoFormador] = useState(false);
  const [formadorTemp, setFormadorTemp] = useState('');
  const [editandoFecha, setEditandoFecha] = useState(null);

  const puedeVer = tienePermisoAcademico(usuario);

  useEffect(() => {
    if (!usuario) return;
    if (!puedeVer) { router.push('/dashboard'); return; }
    cargarTodo();
  }, [usuario]);

  useEffect(() => {
    if (cursoActual) cargarTodo();
  }, [cursoActual]);

  async function cargarTodo() {
    setCargando(true);
    setErrorCarga('');
    try {
      const params = new URLSearchParams({ solicitanteEmail: usuario.email });
      if (cursoActual) params.set('curso', cursoActual);
      const res = await fetch(`/api/academico?${params.toString()}`);
      const r = await res.json();
      if (!res.ok || r.error) {
        setErrorCarga(r.error || 'No se pudo cargar.');
      } else {
        setEstudiantes(r.estudiantes || []);
        setCursosDisponibles(r.cursosDisponibles || []);
        setCursosInfo(r.cursos || []);
        setEdiciones(r.ediciones || []);
        if (!cursoActual && r.cursosDisponibles?.length > 0) {
          setCursoActual(r.cursosDisponibles[0]);
          setCargando(false);
          return;
        }
      }
    } catch (err) {
      setErrorCarga('No se pudo conectar con el servidor.');
    }
    setCargando(false);
  }

  const previewCarga = useMemo(() => parsearFilasAcademico(textoCarga), [textoCarga]);

  async function confirmarCarga() {
    const cursoDestino = cursoActual || nuevoCursoTexto.trim();
    if (!cursoDestino) return;
    setCargandoImport(true);
    await fetch('/api/academico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        curso: cursoDestino, entradas: previewCarga,
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    setCargandoImport(false);
    setTextoCarga('');
    setMostrarCarga(false);
    setCursoActual(cursoDestino);
    setNuevoCursoTexto('');
    cargarTodo();
  }

  async function editarCampo(rowIndex, campo, valor) {
    setEstudiantes((prev) => prev.map((e) => (e._rowIndex === rowIndex ? { ...e, [campo]: valor } : e)));
    const cuerpo = { rowIndex, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre };
    if (campo === 'SituacionAcademica') cuerpo.situacion = valor;
    if (campo === 'Edicion') cuerpo.edicion = valor;
    if (campo === 'Email') cuerpo.email = valor;
    if (campo === 'NombreCompleto') cuerpo.nombre = valor;
    await fetch('/api/academico', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo)
    });
  }

  async function eliminarSeleccionados() {
    if (seleccionadas.size === 0) return;
    await fetch('/api/academico', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndexes: [...seleccionadas], solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setSeleccionadas(new Set());
    cargarTodo();
  }

  async function guardarFormador() {
    await fetch('/api/academico/ediciones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curso: cursoActual, formador: formadorTemp, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setEditandoFormador(false);
    cargarTodo();
  }

  async function guardarFechaInicio(edicion, fecha) {
    await fetch('/api/academico/ediciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curso: cursoActual, edicion, fechaInicio: fecha, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setEditandoFecha(null);
    cargarTodo();
  }

  function exportar() {
    const hoja = XLSX.utils.json_to_sheet(
      estudiantesFiltrados.map((e) => ({
        'Nombre completo': e.NombreCompleto, Email: e.Email,
        'Situación académica': e.SituacionAcademica, Edición: e.Edicion
      }))
    );
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Académico');
    XLSX.writeFile(libro, `academico-${cursoActual}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (!usuario || !puedeVer) return null;

  const formadorActual = cursosInfo.find((c) => c.Curso === cursoActual)?.Formador || '';
  const edicionesUnicas = [...new Set(estudiantes.map((e) => e.Edicion).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

  const estudiantesFiltrados = estudiantes.filter((e) => {
    if (filtroEdicion && e.Edicion !== filtroEdicion) return false;
    if (busqueda.trim() && !`${e.NombreCompleto} ${e.Email}`.toLowerCase().includes(busqueda.trim().toLowerCase())) return false;
    return true;
  });

  const resumen = calcularResumenEdiciones(estudiantes, ediciones, formadorActual);

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-[1300px] mx-auto px-6 pb-16">
        <h3 className="text-lg font-bold mb-1">🎓 Académico</h3>
        <p className="text-textMuted text-xs mb-5">
          Prototipo: listado de estudiantes con situación académica y reportes por edición. Se carga a mano — empezamos con un curso y vamos sumando más.
        </p>

        <div className="flex items-center gap-3 flex-wrap mb-4">
          <select value={cursoActual} onChange={(e) => setCursoActual(e.target.value)}
            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm">
            {cursosDisponibles.length === 0 && <option value="">Sin cursos todavía</option>}
            {cursosDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setMostrarCarga((v) => !v)} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold">
            {mostrarCarga ? 'Cancelar carga' : '+ Cargar estudiantes'}
          </button>
          {estudiantesFiltrados.length > 0 && (
            <button onClick={exportar} className="text-sm px-4 py-2 rounded-lg bg-surface2 border border-border">⬇ Exportar</button>
          )}
        </div>

        {mostrarCarga && (
          <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
            {!cursoActual && (
              <div className="mb-3">
                <label className="text-xs text-textSec block mb-1">Nombre del curso (nuevo)</label>
                <input value={nuevoCursoTexto} onChange={(e) => setNuevoCursoTexto(e.target.value)}
                  placeholder="Ej: Coaching Vocacional"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
            )}
            <p className="text-sm font-semibold mb-1">Pegar estudiantes</p>
            <p className="text-textMuted text-xs mb-2">
              Pegá directo desde Sheets/Excel: Nombre completo, Email, Situación académica, Edición (con o sin encabezado).
            </p>
            <textarea rows={8} value={textoCarga} onChange={(e) => setTextoCarga(e.target.value)}
              placeholder={'Alejandra Veron\tejandra_veron_@hotmail.com\tCertificado\t1'}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono mb-2" />
            {textoCarga.trim() && (
              <p className="text-textMuted text-xs mb-2">👀 Se van a cargar {previewCarga.length} estudiante(s).</p>
            )}
            <button onClick={confirmarCarga} disabled={cargandoImport || previewCarga.length === 0 || (!cursoActual && !nuevoCursoTexto.trim())}
              className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-50">
              {cargandoImport ? 'Cargando…' : `Confirmar carga de ${previewCarga.length}`}
            </button>
          </div>
        )}

        {errorCarga ? (
          <div className="bg-dangerBg border border-dangerText/30 rounded-2xl p-6 text-center">
            <p className="text-dangerText text-sm font-semibold mb-3">⚠️ {errorCarga}</p>
            <button onClick={cargarTodo} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold">Reintentar</button>
          </div>
        ) : cargando ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : !cursoActual ? (
          <p className="text-textMuted text-sm">Todavía no hay ningún curso cargado — usá "+ Cargar estudiantes" para arrancar.</p>
        ) : (
          <>
            <div className="bg-surface border border-border rounded-2xl p-4 mb-4 flex items-center gap-3">
              <p className="text-sm font-semibold">👩‍🏫 Formador/a de {cursoActual}:</p>
              {editandoFormador ? (
                <>
                  <input value={formadorTemp} onChange={(e) => setFormadorTemp(e.target.value)}
                    className="bg-bg border border-border rounded-lg px-2 py-1 text-sm" autoFocus />
                  <button onClick={guardarFormador} className="text-xs text-accentTeal font-semibold">Guardar</button>
                  <button onClick={() => setEditandoFormador(false)} className="text-xs text-textMuted">Cancelar</button>
                </>
              ) : (
                <>
                  <p className="text-sm text-textSec">{formadorActual || 'Sin definir'}</p>
                  <button onClick={() => { setFormadorTemp(formadorActual); setEditandoFormador(true); }} className="text-xs text-accentTeal font-semibold">✏️ Editar</button>
                </>
              )}
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
              <p className="text-sm font-semibold mb-3">📊 Reporte por edición</p>
              {resumen.length === 0 ? (
                <p className="text-textMuted text-sm">Sin datos todavía.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-textSec text-left border-b border-border">
                        <th className="py-2 pr-3">Edición</th>
                        <th className="pr-3">Formador</th>
                        <th className="pr-3">Inicio</th>
                        <th className="pr-3 text-center">Inscritos</th>
                        <th className="pr-3 text-center">Certificados</th>
                        <th className="pr-3 text-center">Bajas</th>
                        <th className="pr-3 text-center">CC</th>
                        <th className="pr-3 text-center">No se certificaron</th>
                        <th className="pr-3">Cursada</th>
                        <th className="pr-3 text-center">% Bajas</th>
                        <th className="text-center">% Certificados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.map((r) => (
                        <tr key={r.edicion} className="border-b border-border">
                          <td className="py-2 pr-3 font-medium">Edición {r.edicion}</td>
                          <td className="pr-3 text-textSec">{r.formador || '—'}</td>
                          <td className="pr-3">
                            {editandoFecha === r.edicion ? (
                              <input type="date" defaultValue={r.fechaInicio ? r.fechaInicio.slice(0, 10) : ''}
                                onBlur={(e) => guardarFechaInicio(r.edicion, e.target.value)}
                                className="bg-bg border border-border rounded px-1.5 py-0.5 text-xs" autoFocus />
                            ) : (
                              <button onClick={() => setEditandoFecha(r.edicion)} className="text-textSec text-xs hover:text-accentTeal">
                                {r.fechaInicio ? new Date(r.fechaInicio).toLocaleDateString('es-AR') : '📅 Definir'}
                              </button>
                            )}
                          </td>
                          <td className="pr-3 text-center">{r.inscritos}</td>
                          <td className="pr-3 text-center text-successText font-semibold">{r.certificados}</td>
                          <td className="pr-3 text-center text-dangerText font-semibold">{r.bajas}</td>
                          <td className="pr-3 text-center text-infoText">{r.cc}</td>
                          <td className="pr-3 text-center text-warningText">{r.noCertificaron}</td>
                          <td className="pr-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${r.cursada === 'Curso cerrado' ? 'bg-dangerBg text-dangerText' : r.cursada === 'En curso' ? 'bg-successBg text-successText' : 'bg-surface2 text-textMuted'}`}>
                              {r.cursada}
                            </span>
                          </td>
                          <td className="pr-3 text-center">{r.porcentajeBajas.toFixed(1)}%</td>
                          <td className="text-center">{r.porcentajeCertificados.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <p className="text-sm font-semibold">Listado de estudiantes ({estudiantesFiltrados.length})</p>
                <div className="flex items-center gap-2">
                  <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="🔍 Buscar…"
                    className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs w-40" />
                  <select value={filtroEdicion} onChange={(e) => setFiltroEdicion(e.target.value)}
                    className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs">
                    <option value="">Todas las ediciones</option>
                    {edicionesUnicas.map((ed) => <option key={ed} value={ed}>Edición {ed}</option>)}
                  </select>
                  {seleccionadas.size > 0 && (
                    <button onClick={eliminarSeleccionados} className="text-xs px-2.5 py-1.5 rounded bg-dangerText text-white font-semibold">
                      🗑 Eliminar ({seleccionadas.size})
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-textSec text-left border-b border-border">
                      <th className="py-2 w-6">
                        <input type="checkbox" checked={estudiantesFiltrados.length > 0 && seleccionadas.size === estudiantesFiltrados.length}
                          onChange={(e) => setSeleccionadas(e.target.checked ? new Set(estudiantesFiltrados.map((x) => x._rowIndex)) : new Set())} />
                      </th>
                      <th className="pr-3">Nombre completo</th>
                      <th className="pr-3">Email</th>
                      <th className="pr-3">Situación académica</th>
                      <th>Edición</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantesFiltrados.map((e) => (
                      <tr key={e._rowIndex} className="border-b border-border">
                        <td className="py-2">
                          <input type="checkbox" checked={seleccionadas.has(e._rowIndex)}
                            onChange={() => setSeleccionadas((prev) => {
                              const nuevo = new Set(prev);
                              nuevo.has(e._rowIndex) ? nuevo.delete(e._rowIndex) : nuevo.add(e._rowIndex);
                              return nuevo;
                            })} />
                        </td>
                        <td className="pr-3">
                          <input defaultValue={e.NombreCompleto} onBlur={(ev) => ev.target.value !== e.NombreCompleto && editarCampo(e._rowIndex, 'NombreCompleto', ev.target.value)}
                            className="bg-transparent border-none w-full focus:bg-bg rounded px-1" />
                        </td>
                        <td className="pr-3">
                          <input defaultValue={e.Email} onBlur={(ev) => ev.target.value !== e.Email && editarCampo(e._rowIndex, 'Email', ev.target.value)}
                            className="bg-transparent border-none w-full focus:bg-bg rounded px-1 text-textSec" />
                        </td>
                        <td className="pr-3">
                          <select value={e.SituacionAcademica || ''} onChange={(ev) => editarCampo(e._rowIndex, 'SituacionAcademica', ev.target.value)}
                            className={`text-xs px-2 py-1 rounded-md border-none ${COLOR_SITUACION[e.SituacionAcademica] || COLOR_SITUACION['']}`}>
                            {SITUACIONES.map((s) => <option key={s} value={s}>{s || 'Sin definir'}</option>)}
                          </select>
                        </td>
                        <td>
                          <input defaultValue={e.Edicion} onBlur={(ev) => ev.target.value !== e.Edicion && editarCampo(e._rowIndex, 'Edicion', ev.target.value)}
                            className="bg-transparent border-none w-16 focus:bg-bg rounded px-1" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
