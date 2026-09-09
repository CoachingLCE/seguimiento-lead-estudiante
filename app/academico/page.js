'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
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

// Google Sheets puede devolver la fecha como texto "20/01/2026" (día/mes/año, como se escribe en
// Argentina) si se tipeó directo en la celda — el constructor de fechas de JS interpreta ese
// formato como mes/día/año (inglés) y "20" no es un mes válido, rompe. Esto entiende ambos formatos.
function parsearFechaFlexible(valor) {
  if (!valor) return null;
  const conBarras = String(valor).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (conBarras) {
    const [, dd, mm, aaaa] = conBarras;
    return new Date(Number(aaaa), Number(mm) - 1, Number(dd));
  }
  const f = new Date(valor); // ISO (AAAA-MM-DD, lo que guarda el <input type="date">) u otro formato reconocible
  return isNaN(f.getTime()) ? null : f;
}

// A diferencia de .toISOString() (que convierte a UTC y puede correr la fecha un día para atrás
// según el huso horario), esto arma el AAAA-MM-DD a partir de los componentes LOCALES de la fecha.
function fechaAISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function colorCertificacion(pct) {
  if (pct > 70) return 'text-successText';
  if (pct >= 50) return 'text-warningText';
  return 'text-dangerText';
}
function colorBajas(pct) {
  if (pct < 10) return 'text-successText';
  if (pct <= 20) return 'text-warningText';
  return 'text-dangerText';
}

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

function calcularResumenGlobal(todosLosEstudiantes, todasLasEdiciones, cursosInfo) {
  const porClave = {};
  todosLosEstudiantes.forEach((e) => {
    const ed = e.Edicion || 'Sin edición';
    const clave = `${e.Curso}|||${ed}`;
    if (!porClave[clave]) {
      porClave[clave] = { curso: e.Curso, edicion: ed, inscritos: 0, certificados: 0, bajas: 0, cc: 0, noCertificaron: 0, pendientes: 0 };
    }
    porClave[clave].inscritos++;
    if (e.SituacionAcademica === 'Certificado') porClave[clave].certificados++;
    else if (e.SituacionAcademica === 'Baja') porClave[clave].bajas++;
    else if (e.SituacionAcademica === 'Cambio de cursada') porClave[clave].cc++;
    else if (e.SituacionAcademica === 'No se certificó') porClave[clave].noCertificaron++;
    else porClave[clave].pendientes++;
  });

  return Object.values(porClave).map((r) => {
    const edicionInfo = todasLasEdiciones.find((x) => x.Curso === r.curso && x.Edicion === r.edicion);
    const fechaInicio = edicionInfo?.FechaInicio || '';
    // El formador de la edición puntual tiene prioridad; si no está definido, se usa el del
    // curso como respaldo (compatibilidad con cursos donde todas las ediciones comparten uno solo).
    const formador = edicionInfo?.Formador || cursosInfo.find((c) => c.Curso === r.curso)?.Formador || '';
    // "Cerrado" ya NO se decide por días transcurridos desde el inicio (un curso puede durar
    // mucho más de 30 días y seguir activo) — se decide por si TODOS los alumnos ya tienen una
    // situación académica definida. Si falta alguno, sigue "En curso" sin importar la fecha.
    let cursada = 'Sin fecha de inicio';
    if (r.inscritos > 0 && r.pendientes === 0) {
      cursada = 'Curso cerrado';
    } else if (parsearFechaFlexible(fechaInicio)) {
      cursada = 'En curso';
    }
    return {
      ...r, formador, fechaInicio, cursada,
      porcentajeBajas: r.inscritos ? (r.bajas / r.inscritos) * 100 : 0,
      porcentajeCertificados: r.inscritos ? (r.certificados / r.inscritos) * 100 : 0
    };
  });
}

const FILTROS_RAPIDOS = ['Todas', 'Activas', 'Finalizadas', 'Con altas bajas', 'Baja certificación'];
const TODOS = '__TODOS_LOS_CURSOS__';

export default function AcademicoPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();

  const [cursoActual, setCursoActual] = useState('');
  const [cursosDisponibles, setCursosDisponibles] = useState([]);
  const [nuevoCursoTexto, setNuevoCursoTexto] = useState('');
  const [estudiantes, setEstudiantes] = useState([]);
  const [todosLosEstudiantes, setTodosLosEstudiantes] = useState([]);
  const [ediciones, setEdiciones] = useState([]);
  const [cursosInfo, setCursosInfo] = useState([]);
  const [pagosPorEmail, setPagosPorEmail] = useState({});
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
  const [editandoFormadorEdicion, setEditandoFormadorEdicion] = useState(null);

  const [filtroRapido, setFiltroRapido] = useState('Todas');
  const [filtroDocente, setFiltroDocente] = useState('');
  const [edicionAbierta, setEdicionAbierta] = useState(null);

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
      if (cursoActual && cursoActual !== TODOS) params.set('curso', cursoActual);
      const res = await fetch(`/api/academico?${params.toString()}`);
      const r = await res.json();
      if (!res.ok || r.error) {
        setErrorCarga(r.error || 'No se pudo cargar.');
      } else {
        setEstudiantes(r.estudiantes || []);
        setTodosLosEstudiantes(r.todosLosEstudiantes || []);
        setCursosDisponibles(r.cursosDisponibles || []);
        setCursosInfo(r.cursos || []);
        setEdiciones(r.ediciones || []);
        setPagosPorEmail(r.pagosPorEmail || {});
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
    const cursoDestino = (cursoActual && cursoActual !== TODOS) ? cursoActual : nuevoCursoTexto.trim();
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
    setTodosLosEstudiantes((prev) => prev.map((e) => (e._rowIndex === rowIndex ? { ...e, [campo]: valor } : e)));
    const cuerpo = { rowIndex, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre };
    if (campo === 'SituacionAcademica') cuerpo.situacion = valor;
    if (campo === 'Edicion') cuerpo.edicion = valor;
    if (campo === 'Email') cuerpo.email = valor;
    if (campo === 'NombreCompleto') cuerpo.nombre = valor;
    if (campo === 'Observaciones') cuerpo.observaciones = valor;
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

  async function guardarFormadorEdicion(curso, edicion, formador) {
    const res = await fetch('/api/academico/ediciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curso, edicion, formador, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setEditandoFormadorEdicion(null);
    if (!res.ok) {
      const r = await res.json().catch(() => ({}));
      alert(r.error || 'No se pudo guardar el formador. Probá de nuevo.');
      return;
    }
    cargarTodo();
  }

  async function guardarFechaInicio(curso, edicion, fecha) {
    await fetch('/api/academico/ediciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curso, edicion, fechaInicio: fecha, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setEditandoFecha(null);
    cargarTodo();
  }

  function datosParaExportar() {
    return estudiantesFiltrados.map((e) => ({
      'Nombre completo': e.NombreCompleto, Email: e.Email,
      'Situación académica': e.SituacionAcademica, Edición: e.Edicion
    }));
  }

  function exportarExcel() {
    const hoja = XLSX.utils.json_to_sheet(datosParaExportar());
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Académico');
    XLSX.writeFile(libro, `academico-${cursoActual}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportarCSV() {
    const hoja = XLSX.utils.json_to_sheet(datosParaExportar());
    const csv = XLSX.utils.sheet_to_csv(hoja);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academico-${cursoActual}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!usuario || !puedeVer) return null;

  const formadorActual = cursosInfo.find((c) => c.Curso === cursoActual)?.Formador || '';
  const edicionesUnicas = [...new Set(estudiantes.map((e) => e.Edicion).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

  const estudiantesFiltrados = estudiantes.filter((e) => {
    if (filtroEdicion && e.Edicion !== filtroEdicion) return false;
    if (busqueda.trim() && !`${e.NombreCompleto} ${e.Email}`.toLowerCase().includes(busqueda.trim().toLowerCase())) return false;
    return true;
  });

  const resumenGlobalCompleto = calcularResumenGlobal(todosLosEstudiantes, ediciones, cursosInfo);
  const docentesUnicos = [...new Set([
    ...cursosInfo.map((c) => c.Formador),
    ...resumenGlobalCompleto.map((r) => r.formador)
  ].filter(Boolean))].sort();

  // Por defecto, el reporte muestra solo el curso elegido arriba (como el resto de la pantalla).
  // Con "Ver todos los cursos" tildado, se ve la vista institucional completa (para comparar
  // docentes entre sí, por ejemplo).
  const resumenPorCurso = cursoActual === TODOS
    ? resumenGlobalCompleto
    : resumenGlobalCompleto.filter((r) => r.curso === cursoActual);

  const resumenPorDocente = filtroDocente
    ? resumenPorCurso.filter((r) => r.formador === filtroDocente)
    : resumenPorCurso;

  const resumenFiltrado = resumenPorDocente.filter((r) => {
    if (filtroRapido === 'Activas') return r.cursada === 'En curso';
    if (filtroRapido === 'Finalizadas') return r.cursada === 'Curso cerrado';
    if (filtroRapido === 'Con altas bajas') return r.porcentajeBajas > 20;
    if (filtroRapido === 'Baja certificación') return r.porcentajeCertificados < 50;
    return true;
  });

  const resumenOrdenado = [...resumenFiltrado].sort((a, b) => {
    if (!a.fechaInicio && !b.fechaInicio) return 0;
    if (!a.fechaInicio) return 1;
    if (!b.fechaInicio) return -1;
    return new Date(b.fechaInicio) - new Date(a.fechaInicio);
  });

  const totInscritos = resumenFiltrado.reduce((acc, r) => acc + r.inscritos, 0);
  const totCertificados = resumenFiltrado.reduce((acc, r) => acc + r.certificados, 0);
  const totBajas = resumenFiltrado.reduce((acc, r) => acc + r.bajas, 0);
  const pctCertificacionGlobal = totInscritos ? (totCertificados / totInscritos) * 100 : 0;
  const pctBajasGlobal = totInscritos ? (totBajas / totInscritos) * 100 : 0;

  const totInscritosInstitucional = resumenGlobalCompleto.reduce((acc, r) => acc + r.inscritos, 0);
  const totCertificadosInstitucional = resumenGlobalCompleto.reduce((acc, r) => acc + r.certificados, 0);
  const pctCertificacionInstitucional = totInscritosInstitucional ? (totCertificadosInstitucional / totInscritosInstitucional) * 100 : 0;

  const serieCronologica = [...resumenPorDocente]
    .filter((r) => r.fechaInicio)
    .sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio))
    .map((r) => ({ inscritos: r.inscritos, pctCert: r.porcentajeCertificados, pctBajas: r.porcentajeBajas }));

  const edicionParaModal = edicionAbierta
    ? resumenGlobalCompleto.find((r) => r.curso === edicionAbierta.curso && r.edicion === edicionAbierta.edicion)
    : null;

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-[1400px] mx-auto px-6 pb-16">
        <h3 className="text-lg font-bold mb-1">🎓 Académico</h3>
        <p className="text-textMuted text-xs mb-5">
          Listado de estudiantes con situación académica, y reporte institucional por edición (todos los cursos juntos). Se carga a mano.
        </p>

        <div className="flex items-center gap-3 flex-wrap mb-4">
          <select value={cursoActual} onChange={(e) => setCursoActual(e.target.value)}
            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm">
            {cursosDisponibles.length === 0 && <option value="">Sin cursos todavía</option>}
            {cursosDisponibles.length > 0 && <option value={TODOS}>— Todos los cursos —</option>}
            {cursosDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setMostrarCarga((v) => !v)} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold">
            {mostrarCarga ? 'Cancelar carga' : '+ Cargar estudiantes'}
          </button>
          {estudiantesFiltrados.length > 0 && (
            <>
            <button onClick={exportarExcel} className="text-sm px-4 py-2 rounded-lg bg-surface2 border border-border">⬇ Excel</button>
            <button onClick={exportarCSV} title="El CSV se importa perfecto en Google Sheets (Archivo > Importar)"
              className="text-sm px-4 py-2 rounded-lg bg-surface2 border border-border">⬇ CSV (para Sheets)</button>
            </>
          )}
        </div>

        {mostrarCarga && (
          <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
            {(!cursoActual || cursoActual === TODOS) && (
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
            <button onClick={confirmarCarga} disabled={cargandoImport || previewCarga.length === 0 || ((!cursoActual || cursoActual === TODOS) && !nuevoCursoTexto.trim())}
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
            {cursoActual !== TODOS && (
            <div className="bg-surface border border-border rounded-2xl p-4 mb-4 flex items-center gap-3 flex-wrap">
              <p className="text-sm font-semibold">👩‍🏫 Formador/a por defecto de {cursoActual}:</p>
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
              <p className="text-textMuted text-[11px] w-full">
                Se usa solo si una edición puntual no tiene su propio formador definido. Para cursos con varios formadores (ej: Oratoria), definilo edición por edición en la tabla de abajo, columna "Formador".
              </p>
            </div>
            )}

            <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <p className="text-sm font-semibold">
                  📊 Reporte por edición <span className="text-textMuted font-normal">({cursoActual === TODOS ? 'todos los cursos' : cursoActual})</span>
                </p>
                <select value={filtroDocente} onChange={(e) => setFiltroDocente(e.target.value)}
                  className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs">
                  <option value="">Docente: Todos</option>
                  {docentesUnicos.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                <TarjetaResumen label="Ediciones" valor={resumenFiltrado.length} />
                <TarjetaResumen label="Inscriptos" valor={totInscritos} />
                <TarjetaResumen label="Certificados" valor={totCertificados} colorClase="text-successText" />
                <TarjetaResumen label="Bajas" valor={totBajas} colorClase="text-dangerText" />
                <TarjetaResumen label="% Certificación" valor={`${pctCertificacionGlobal.toFixed(1)}%`} colorClase={colorCertificacion(pctCertificacionGlobal)} />
                <TarjetaResumen label="% Bajas" valor={`${pctBajasGlobal.toFixed(1)}%`} colorClase={colorBajas(pctBajasGlobal)} />
              </div>

              {serieCronologica.length >= 2 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <Sparkline titulo="Evolución inscriptos" datos={serieCronologica} campo="inscritos" color="#a855f7" />
                  <Sparkline titulo="Evolución % certificación" datos={serieCronologica} campo="pctCert" color="#22c55e" />
                  <Sparkline titulo="Evolución % bajas" datos={serieCronologica} campo="pctBajas" color="#ef4444" />
                </div>
              )}

              {filtroDocente && (
                <div className="bg-bg border border-border rounded-lg px-3 py-2 mb-4 text-xs flex items-center gap-4 flex-wrap">
                  <span className="text-textMuted">Promedio institucional: <span className="text-text font-semibold">{pctCertificacionInstitucional.toFixed(1)}% certificación</span></span>
                  <span className={colorCertificacion(pctCertificacionGlobal)}>
                    {filtroDocente}: <span className="font-semibold">{pctCertificacionGlobal.toFixed(1)}%</span>
                    {' '}({pctCertificacionGlobal >= pctCertificacionInstitucional ? '+' : ''}{(pctCertificacionGlobal - pctCertificacionInstitucional).toFixed(1)})
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {FILTROS_RAPIDOS.map((f) => (
                  <button key={f} onClick={() => setFiltroRapido(f)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      filtroRapido === f ? 'bg-accentPurple border-accentPurple text-white' : 'bg-surface2 border-border text-textSec hover:text-text'
                    }`}>
                    {f}
                  </button>
                ))}
              </div>

              {resumenOrdenado.length === 0 ? (
                <p className="text-textMuted text-sm">Sin datos para este filtro.</p>
              ) : (
                <div className="overflow-x-auto max-h-[480px] overflow-y-auto relative">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-surface z-10">
                      <tr className="text-textSec text-left border-b border-border">
                        <th className="py-2 pr-3">Curso</th>
                        <th className="pr-3">Edición</th>
                        <th className="pr-3">Formador</th>
                        <th className="pr-3">Inicio</th>
                        <th className="pr-3 text-center">Inscritos</th>
                        <th className="pr-3 text-center">Certificados</th>
                        <th className="pr-3 text-center">Bajas</th>
                        <th className="pr-3 text-center">CC</th>
                        <th className="pr-3 text-center">No cert.</th>
                        <th className="pr-3">Cursada</th>
                        <th className="pr-3 text-center">% Bajas</th>
                        <th className="text-center">% Certificados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenOrdenado.map((r) => (
                        <tr key={`${r.curso}|${r.edicion}`}
                          onClick={() => setEdicionAbierta({ curso: r.curso, edicion: r.edicion })}
                          className="border-b border-border hover:bg-bg/60 cursor-pointer transition-colors">
                          <td className="py-2 pr-3 text-textSec">{r.curso}</td>
                          <td className="pr-3 font-medium">Edición {r.edicion}</td>
                          <td className="pr-3" onClick={(ev) => ev.stopPropagation()}>
                            {(editandoFormadorEdicion === `${r.curso}|${r.edicion}` || editandoFormadorEdicion === `nuevo:${r.curso}|${r.edicion}`) ? (
                              editandoFormadorEdicion === `nuevo:${r.curso}|${r.edicion}` ? (
                                <input type="text" defaultValue={r.formador} placeholder="Nombre del formador" autoFocus
                                  onBlur={(e) => guardarFormadorEdicion(r.curso, r.edicion, e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                  className="bg-bg border border-border rounded px-1.5 py-0.5 text-xs w-32" />
                              ) : (
                                <div className="flex items-center gap-1">
                                  <select autoFocus defaultValue={r.formador}
                                    onChange={(e) => {
                                      if (e.target.value === '__nuevo__') { setEditandoFormadorEdicion(`nuevo:${r.curso}|${r.edicion}`); return; }
                                      guardarFormadorEdicion(r.curso, r.edicion, e.target.value);
                                    }}
                                    className="bg-bg border border-border rounded px-1.5 py-0.5 text-xs w-32">
                                    <option value="">Sin definir</option>
                                    {docentesUnicos.map((d) => <option key={d} value={d}>{d}</option>)}
                                    <option value="__nuevo__">✏️ Escribir otro nombre…</option>
                                  </select>
                                  <button onClick={() => setEditandoFormadorEdicion(null)} className="text-textMuted text-xs" title="Cancelar">✕</button>
                                </div>
                              )
                            ) : (
                              <button onClick={() => setEditandoFormadorEdicion(`${r.curso}|${r.edicion}`)} className="text-textSec text-xs hover:text-accentTeal">
                                {r.formador || '✏️ Definir'}
                              </button>
                            )}
                          </td>
                          <td className="pr-3" onClick={(ev) => ev.stopPropagation()}>
                            {editandoFecha === `${r.curso}|${r.edicion}` ? (
                              <input type="date" defaultValue={r.fechaInicio ? (() => { const f = parsearFechaFlexible(r.fechaInicio); return f ? fechaAISO(f) : ''; })() : ''}
                                onBlur={(e) => guardarFechaInicio(r.curso, r.edicion, e.target.value)}
                                className="bg-bg border border-border rounded px-1.5 py-0.5 text-xs" autoFocus />
                            ) : (
                              <button onClick={() => setEditandoFecha(`${r.curso}|${r.edicion}`)} className="text-textSec text-xs hover:text-accentTeal">
                                {r.fechaInicio ? (parsearFechaFlexible(r.fechaInicio)?.toLocaleDateString('es-AR') || '⚠️ Fecha inválida') : '📅 Definir'}
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
                          <td className={`pr-3 text-center font-semibold ${colorBajas(r.porcentajeBajas)}`}>{r.porcentajeBajas.toFixed(1)}%</td>
                          <td className={`text-center font-semibold ${colorCertificacion(r.porcentajeCertificados)}`}>{r.porcentajeCertificados.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-textMuted text-[11px] mt-2">💡 Tocá una fila para ver la ficha detallada de esa edición.</p>
            </div>

            {cursoActual === TODOS ? (
              <div className="bg-surface border border-border rounded-2xl p-5 text-center">
                <p className="text-textMuted text-sm">Elegí un curso puntual arriba para ver o cargar su listado de estudiantes.</p>
              </div>
            ) : (
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <p className="text-sm font-semibold">Listado de estudiantes de {cursoActual} ({estudiantesFiltrados.length})</p>
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
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto relative">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface z-10">
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
            )}
          </>
        )}
      </div>

      {edicionParaModal && (
        <FichaEdicionModal
          info={edicionParaModal}
          estudiantes={todosLosEstudiantes.filter((e) => e.Curso === edicionParaModal.curso && (e.Edicion || 'Sin edición') === edicionParaModal.edicion)}
          pagosPorEmail={pagosPorEmail}
          onEditarCampo={editarCampo}
          onClose={() => setEdicionAbierta(null)}
        />
      )}
    </div>
  );
}

function TarjetaResumen({ label, valor, colorClase }) {
  return (
    <div className="bg-bg border border-border rounded-xl px-3 py-2.5">
      <p className="text-textMuted text-[11px] mb-0.5">{label}</p>
      <p className={`text-xl font-bold ${colorClase || 'text-text'}`}>{valor}</p>
    </div>
  );
}

function Sparkline({ titulo, datos, campo, color }) {
  return (
    <div className="bg-bg border border-border rounded-lg px-3 py-2">
      <p className="text-textMuted text-[10.5px] mb-1">{titulo}</p>
      <div style={{ height: 36 }}>
        <ResponsiveContainer>
          <LineChart data={datos} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <Line type="monotone" dataKey={campo} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FichaEdicionModal({ info, estudiantes, pagosPorEmail, onEditarCampo, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-surface2 border border-border rounded-2xl p-6 w-full max-w-4xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-lg font-bold">{info.curso} — Edición {info.edicion}</p>
            <p className="text-textMuted text-xs">
              Formador/a: {info.formador || 'sin definir'} · Inicio: {info.fechaInicio ? (parsearFechaFlexible(info.fechaInicio)?.toLocaleDateString('es-AR') || '⚠️ Fecha inválida') : 'sin definir'} ·{' '}
              <span className={info.cursada === 'Curso cerrado' ? 'text-dangerText' : info.cursada === 'En curso' ? 'text-successText' : 'text-textMuted'}>{info.cursada}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-text text-xl leading-none">✕</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 my-4">
          <TarjetaResumen label="Inscritos" valor={info.inscritos} />
          <TarjetaResumen label="Certificados" valor={info.certificados} colorClase="text-successText" />
          <TarjetaResumen label="Bajas" valor={info.bajas} colorClase="text-dangerText" />
          <TarjetaResumen label="% Certificados" valor={`${info.porcentajeCertificados.toFixed(1)}%`} colorClase={colorCertificacion(info.porcentajeCertificados)} />
          <TarjetaResumen label="% Bajas" valor={`${info.porcentajeBajas.toFixed(1)}%`} colorClase={colorBajas(info.porcentajeBajas)} />
        </div>

        <p className="text-sm font-semibold mb-2">Alumnos ({estudiantes.length})</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-textSec text-left border-b border-border">
                <th className="py-1.5 pr-2">Nombre</th>
                <th className="pr-2">Situación</th>
                <th className="pr-2">Pagos</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((e) => {
                const pago = e.Email ? pagosPorEmail[e.Email.trim().toLowerCase()] : null;
                return (
                  <tr key={e._rowIndex} className="border-b border-border align-top">
                    <td className="py-1.5 pr-2">
                      <p className="font-medium">{e.NombreCompleto}</p>
                      <p className="text-textMuted">{e.Email || 'sin email'}</p>
                    </td>
                    <td className="pr-2">
                      <select value={e.SituacionAcademica || ''} onChange={(ev) => onEditarCampo(e._rowIndex, 'SituacionAcademica', ev.target.value)}
                        className={`text-[11px] px-1.5 py-1 rounded-md border-none ${COLOR_SITUACION[e.SituacionAcademica] || COLOR_SITUACION['']}`}>
                        {SITUACIONES.map((s) => <option key={s} value={s}>{s || 'Sin definir'}</option>)}
                      </select>
                    </td>
                    <td className="pr-2 text-textSec">
                      {pago ? (
                        <>
                          <p>${Number(pago.montoTotal || 0).toLocaleString('es-AR')}{pago.cantCuotas ? ` (${pago.cantCuotas} cuotas)` : ''}</p>
                          <p className="text-textMuted">{pago.fechaVenta ? new Date(pago.fechaVenta).toLocaleDateString('es-AR') : ''} {pago.medioPago}</p>
                        </>
                      ) : (
                        <span className="text-textMuted">Sin datos vinculados</span>
                      )}
                    </td>
                    <td>
                      <input defaultValue={e.Observaciones || ''} placeholder="—"
                        onBlur={(ev) => ev.target.value !== (e.Observaciones || '') && onEditarCampo(e._rowIndex, 'Observaciones', ev.target.value)}
                        className="w-full bg-bg border border-border rounded px-1.5 py-1 text-[11px]" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
