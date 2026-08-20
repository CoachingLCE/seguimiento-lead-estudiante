'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import FichaDrawer from '../../components/FichaDrawer';
import { useSession } from '../../lib/useSession';
import { tienePermisoCrearLeads } from '../../lib/permisos';
import {
  CURSOS, ORIGENES, ORIGEN_OTRO, ORIGEN_SIN_DEFINIR, PAISES, CURSO_SIN_DEFINIR, CURSO_OTROS,
  detectarPaisPorWhatsapp
} from '../../lib/constants';

const CLAVE_BORRADOR = 'nuevoLead:borrador';
const CLAVE_ULTIMO_CURSO = 'nuevoLead:ultimoCurso';
const CLAVE_ULTIMO_ORIGEN = 'nuevoLead:ultimoOrigen';
const CLAVE_ULTIMOS_ADICIONALES = 'nuevoLead:ultimosAdicionales';

let contadorIds = 0;
function contactoVacio() {
  contadorIds += 1;
  return { key: `c${Date.now()}${contadorIds}`, raw: '', email: '', instagram: '' };
}

function escaparRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Interpreta lo que se pegó/escribió: separa por tabs, saltos de línea, comas, pipes o guiones,
// y también detecta teléfono/país como subcadenas sueltas dentro de una sola línea.
// Si el texto tiene etiquetas explícitas (Nombre:, Curso:, Email:, WhatsApp:, País:, Instagram:),
// las reconoce directamente — funciona con o sin saltos de línea entre cada una (busca en
// cualquier parte del texto, no depende de que cada campo esté en su propia línea).
// Devuelve { valores, restante } — "restante" es lo que sobró sin etiquetar, para que la
// heurística de siempre siga completando lo que falte (país/whatsapp/email sin etiqueta, etc).
function detectarCamposEtiquetados(texto) {
  const patron = /(nombre|curso|pa[ií]s|e[-\s]?mail|whatsapp|wpp|tel[eé]?fono?|instagram|facebook|ig|fb)\s*:\s*([\s\S]*?)(?=(?:nombre|curso|pa[ií]s|e[-\s]?mail|whatsapp|wpp|tel[eé]?fono?|instagram|facebook|ig|fb)\s*:|$)/gi;
  const valores = {};
  let huboEtiquetas = false;
  let match;
  while ((match = patron.exec(texto)) !== null) {
    const etiqueta = match[1].toLowerCase().replace(/[\s-]/g, '');
    const valor = match[2].replace(/\n+/g, ' ').trim();
    if (!valor) continue;
    huboEtiquetas = true;
    if (etiqueta.startsWith('nombre')) valores.nombre = valor;
    else if (etiqueta.startsWith('curso')) valores.curso = valor;
    else if (etiqueta.startsWith('pais')) valores.pais = valor;
    else if (etiqueta.startsWith('email') || etiqueta.startsWith('mail')) valores.email = valor;
    else if (etiqueta.startsWith('whatsapp') || etiqueta.startsWith('wpp') || etiqueta.startsWith('tel')) valores.whatsapp = valor;
    else if (etiqueta.startsWith('instagram') || etiqueta.startsWith('facebook') || etiqueta === 'ig' || etiqueta === 'fb') valores.instagram = valor;
  }
  return huboEtiquetas ? valores : null;
}

function parsearIngresoLibre(texto) {
  const etiquetados = detectarCamposEtiquetados(texto);

  let resto = texto || '';

  let email = '';
  const mEmail = resto.match(/[^\s,;|]+@[^\s,;|]+\.[^\s,;|]+/);
  if (mEmail) {
    email = mEmail[0];
    resto = resto.replace(email, ' ');
  }

  // @usuario (Instagram/Facebook) — se busca después del email para no confundir un @handle
  // suelto con la arroba de una dirección de correo.
  let instagram = '';
  const mInsta = resto.match(/@[\w.]+/);
  if (mInsta) {
    instagram = mInsta[0];
    resto = resto.replace(instagram, ' ');
  }

  let pais = '';
  for (const p of PAISES) {
    const regex = new RegExp(`\\b${escaparRegex(p)}\\b`, 'i');
    const m = resto.match(regex);
    if (m) {
      pais = p;
      resto = resto.replace(m[0], ' ');
      break;
    }
  }

  let whatsapp = '';
  const candidatos = resto.match(/[+]?[\d][\d\s\-()]{6,}\d/g) || [];
  candidatos.forEach((c) => {
    const digitos = c.replace(/[^\d]/g, '');
    const digitosActual = whatsapp.replace(/[^\d]/g, '');
    if (digitos.length >= 8 && digitos.length <= 15 && digitos.length > digitosActual.length) {
      whatsapp = c.trim();
    }
  });
  if (whatsapp) {
    resto = resto.replace(whatsapp, ' §§ ');
  }

  if (!pais && whatsapp) {
    pais = detectarPaisPorWhatsapp(whatsapp);
  }

  let nombre = '';
  let notasExtra = '';
  if (whatsapp) {
    const partes = resto.split('§§');
    nombre = (partes[0] || '').trim().replace(/[\s,;|-]+$/, '').trim();
    notasExtra = partes.slice(1).join(' ').trim().replace(/^[\s,;|-]+/, '').trim();
  } else {
    const partes = resto.split(/\t|\r?\n|\||,|;| - /).map((p) => p.trim()).filter(Boolean);
    nombre = partes[0] || '';
    notasExtra = partes.slice(1).join(' · ');
  }

  return {
    nombre: etiquetados?.nombre || nombre,
    whatsapp: etiquetados?.whatsapp || whatsapp,
    pais: etiquetados?.pais || pais,
    email: etiquetados?.email || email,
    instagram: etiquetados?.instagram || instagram,
    notasExtra
  };
}

function tieneMedioDeContacto(contacto, p) {
  return Boolean(p.whatsapp || contacto.email.trim() || p.instagram || contacto.instagram.trim());
}

// Estado visual de una card: vacio | error | duplicado | completo
function estadoContacto(contacto, p, tieneDuplicadoSinIgnorar) {
  if (!contacto.raw.trim()) return 'vacio';
  if (!p.nombre.trim() || !tieneMedioDeContacto(contacto, p)) return 'error';
  if (tieneDuplicadoSinIgnorar) return 'duplicado';
  return 'completo';
}

// Texto específico de qué falta, para no dejar el badge de error genérico sin explicación.
function motivoError(contacto, p) {
  if (!p.nombre.trim() && !tieneMedioDeContacto(contacto, p)) return 'Falta el nombre y un medio de contacto';
  if (!p.nombre.trim()) return 'Falta el nombre';
  return 'Falta un medio de contacto (WhatsApp, Email o Instagram)';
}

const ESTILOS_ESTADO = {
  vacio: { borde: 'border-border', badge: '⚪', texto: 'text-textMuted', label: 'Vacío' },
  completo: { borde: 'border-successText/50', badge: '🟢', texto: 'text-successText', label: 'Completo' },
  duplicado: { borde: 'border-warningText/60', badge: '🟠', texto: 'text-warningText', label: 'Posible duplicado' },
  error: { borde: 'border-dangerText/60', badge: '🔴', texto: 'text-dangerText', label: 'Error' }
};

export default function NuevoLeadPage() {
  const { usuario, cargando: cargandoSesion, logout } = useSession();
  const router = useRouter();

  const [curso, setCurso] = useState(CURSO_SIN_DEFINIR);
  const [cursoAutocompletado, setCursoAutocompletado] = useState(false);
  const [cursoPersonalizado, setCursoPersonalizado] = useState('');
  const [origen, setOrigen] = useState(ORIGEN_SIN_DEFINIR);
  const [origenAutocompletado, setOrigenAutocompletado] = useState(false);
  const [origenPersonalizado, setOrigenPersonalizado] = useState('');
  const [cursosAdicionales, setCursosAdicionales] = useState([]);

  const [contactos, setContactos] = useState([contactoVacio()]);
  const [errores, setErrores] = useState({});
  const [duplicados, setDuplicados] = useState({});
  const [ignorarDuplicado, setIgnorarDuplicado] = useState({});
  const [fichaLeadId, setFichaLeadId] = useState(null);
  const [colapsadas, setColapsadas] = useState({});
  const [arrastrando, setArrastrando] = useState(null);

  const [borradorDisponible, setBorradorDisponible] = useState(false);
  const [mostrarPegarLista, setMostrarPegarLista] = useState(false);
  const [textoPegarLista, setTextoPegarLista] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const [resultadoFinal, setResultadoFinal] = useState(null);

  const timersDuplicados = useRef({});
  const refsCards = useRef({});
  const cargaInicialHecha = useRef(false);

  // Cargar autocompletado / detectar borrador pendiente al entrar
  useEffect(() => {
    if (!usuario || cargaInicialHecha.current) return;
    cargaInicialHecha.current = true;
    try {
      const borradorGuardado = localStorage.getItem(CLAVE_BORRADOR);
      if (borradorGuardado) {
        const d = JSON.parse(borradorGuardado);
        const hayAlgo = (d.contactos || []).some((c) => c.raw?.trim() || c.email?.trim() || c.instagram?.trim());
        if (hayAlgo) {
          setBorradorDisponible(true);
          return;
        }
      }
    } catch (e) { /* ignorar borrador corrupto */ }
    aplicarAutocompletado();
  }, [usuario]);

  function aplicarAutocompletado() {
    try {
      const ultimoCurso = localStorage.getItem(CLAVE_ULTIMO_CURSO);
      const ultimoOrigen = localStorage.getItem(CLAVE_ULTIMO_ORIGEN);
      const ultimosAdicionales = JSON.parse(localStorage.getItem(CLAVE_ULTIMOS_ADICIONALES) || '[]');
      if (ultimoCurso) { setCurso(ultimoCurso); setCursoAutocompletado(true); }
      if (ultimoOrigen) { setOrigen(ultimoOrigen); setOrigenAutocompletado(true); }
      if (Array.isArray(ultimosAdicionales)) setCursosAdicionales(ultimosAdicionales);
    } catch (e) { /* ignorar */ }
  }

  function recuperarBorrador() {
    try {
      const d = JSON.parse(localStorage.getItem(CLAVE_BORRADOR));
      setCurso(d.curso || CURSO_SIN_DEFINIR);
      setCursoPersonalizado(d.cursoPersonalizado || '');
      setOrigen(d.origen || ORIGEN_SIN_DEFINIR);
      setOrigenPersonalizado(d.origenPersonalizado || '');
      setCursosAdicionales(d.cursosAdicionales || []);
      setContactos((d.contactos || []).length > 0 ? d.contactos.map((c) => ({ ...c, key: c.key || contactoVacio().key })) : [contactoVacio()]);
    } catch (e) { /* ignorar */ }
    setBorradorDisponible(false);
  }

  function descartarBorrador() {
    localStorage.removeItem(CLAVE_BORRADOR);
    setBorradorDisponible(false);
    aplicarAutocompletado();
  }

  // Autoguardado del borrador (debounced)
  useEffect(() => {
    if (!cargaInicialHecha.current || borradorDisponible) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({
          curso, cursoPersonalizado, origen, origenPersonalizado, cursosAdicionales, contactos
        }));
      } catch (e) { /* ignorar */ }
    }, 400);
    return () => clearTimeout(t);
  }, [curso, cursoPersonalizado, origen, origenPersonalizado, cursosAdicionales, contactos, borradorDisponible]);

  // Atajos de teclado
  useEffect(() => {
    function onKeyDown(e) {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('form-nuevo-lead')?.requestSubmit(); }
        else if (e.key.toLowerCase() === 'n') { e.preventDefault(); agregarContacto(); }
        else if (e.key.toLowerCase() === 'd') { e.preventDefault(); duplicarContacto(contactos.length - 1); }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [contactos]);

  if (cargandoSesion) return null;
  if (!usuario) {
    if (typeof window !== 'undefined') router.push('/');
    return null;
  }
  if (!tienePermisoCrearLeads(usuario)) {
    if (typeof window !== 'undefined') router.push('/inscritos');
    return null;
  }

  function toggleCursoAdicional(c) {
    setCursosAdicionales((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function actualizarContacto(index, campo, valor) {
    setContactos((prev) => prev.map((c, i) => (i === index ? { ...c, [campo]: valor } : c)));
    if (['raw', 'email'].includes(campo)) {
      setIgnorarDuplicado((prev) => ({ ...prev, [index]: false }));
      clearTimeout(timersDuplicados.current[index]);
      timersDuplicados.current[index] = setTimeout(() => verificarDuplicado(index), 500);
    }
  }

  async function verificarDuplicado(index) {
    const contacto = contactos[index];
    if (!contacto) return;
    const p = parsearIngresoLibre(contacto.raw);
    const params = new URLSearchParams({
      nombre: p.nombre, whatsapp: p.whatsapp, email: p.email || contacto.email,
      solicitanteEmail: usuario.email
    });
    const res = await fetch(`/api/leads/duplicados?${params}`);
    const data = await res.json();
    setDuplicados((prev) => ({ ...prev, [index]: data.coincidencias || [] }));
  }

  function crearContactosDesdeTexto(texto, indexBase) {
    const bloques = texto.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    if (bloques.length === 0) return null;
    return bloques.map((b) => ({ ...contactoVacio(), raw: b }));
  }

  function manejarPegado(e, index) {
    const texto = e.clipboardData.getData('text');
    const bloques = texto.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    if (bloques.length > 1) {
      e.preventDefault();
      setContactos((prev) => {
        const nuevos = [...prev];
        nuevos[index] = { ...nuevos[index], raw: bloques[0] };
        const extra = bloques.slice(1).map((b) => ({ ...contactoVacio(), raw: b }));
        return [...nuevos.slice(0, index + 1), ...extra, ...nuevos.slice(index + 1)];
      });
    }
  }

  function agregarContacto() {
    setContactos((prev) => [...prev, contactoVacio()]);
  }

  function duplicarContacto(index) {
    setContactos((prev) => {
      const copia = { ...prev[index], key: contactoVacio().key };
      return [...prev.slice(0, index + 1), copia, ...prev.slice(index + 1)];
    });
  }

  function copiarUltimoContacto() {
    if (contactos.length === 0) return;
    duplicarContacto(contactos.length - 1);
  }

  function quitarContacto(index) {
    setContactos((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleColapsada(index) {
    setColapsadas((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  function pegarListaCompleta() {
    const nuevos = crearContactosDesdeTexto(textoPegarLista);
    if (nuevos && nuevos.length > 0) {
      setContactos((prev) => {
        const primerVacio = prev.length === 1 && !prev[0].raw.trim();
        return primerVacio ? nuevos : [...prev, ...nuevos];
      });
    }
    setMostrarPegarLista(false);
    setTextoPegarLista('');
  }

  // Drag & drop simple para reordenar
  function onDragStart(index) { setArrastrando(index); }
  function onDragOver(e) { e.preventDefault(); }
  function onDrop(index) {
    if (arrastrando === null || arrastrando === index) return;
    setContactos((prev) => {
      const copia = [...prev];
      const [movido] = copia.splice(arrastrando, 1);
      copia.splice(index, 0, movido);
      return copia;
    });
    setArrastrando(null);
  }

  // Datos derivados para el panel/resumen
  const infoContactos = contactos.map((contacto, i) => {
    const p = parsearIngresoLibre(contacto.raw);
    const dupSinIgnorar = (duplicados[i]?.length > 0) && !ignorarDuplicado[i];
    return { p, estado: estadoContacto(contacto, p, dupSinIgnorar) };
  });
  const completos = infoContactos.filter((i) => i.estado === 'completo').length;
  const conError = infoContactos.filter((i) => i.estado === 'error').length;
  const conDuplicado = infoContactos.filter((i) => i.estado === 'duplicado').length;
  const listosParaGuardar = completos + conDuplicado; // el duplicado también se puede guardar si se confirma
  const cursoTextoPreview = curso === CURSO_SIN_DEFINIR ? '' : curso === CURSO_OTROS ? cursoPersonalizado.trim() : curso;

  async function handleSubmit(e) {
    e.preventDefault();

    const nuevosErrores = {};
    contactos.forEach((contacto, i) => {
      const p = parsearIngresoLibre(contacto.raw);
      if (!p.nombre.trim()) {
        nuevosErrores[i] = 'Falta el nombre.';
      } else if (!tieneMedioDeContacto(contacto, p)) {
        nuevosErrores[i] = 'Ingresá al menos un medio de contacto (WhatsApp, Email o Instagram/Facebook).';
      }
    });
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      const primerIndexError = Object.keys(nuevosErrores).map(Number).sort((a, b) => a - b)[0];
      refsCards.current[primerIndexError]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setGuardando(true);
    setProgreso({ actual: 0, total: contactos.length });
    const cursoFinal =
      curso === CURSO_SIN_DEFINIR ? '' : curso === CURSO_OTROS ? cursoPersonalizado.trim() : curso;
    const origenFinal =
      origen === ORIGEN_SIN_DEFINIR ? '' : origen === ORIGEN_OTRO ? origenPersonalizado.trim() : origen;

    try {
      let i = 0;
      for (const contacto of contactos) {
        const p = parsearIngresoLibre(contacto.raw);
        await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: p.nombre, apellido: '', whatsapp: p.whatsapp, email: p.email || contacto.email,
            instagram: p.instagram || contacto.instagram, pais: p.pais, notasIniciales: p.notasExtra,
            curso: cursoFinal, cursosAdicionales: cursosAdicionales.join(', '), origen: origenFinal,
            cargadoPorEmail: usuario.email, cargadoPorNombre: usuario.nombre
          })
        });
        i += 1;
        setProgreso({ actual: i, total: contactos.length });
      }

      // Guardar autocompletado para la próxima carga — "Otro" nunca se recuerda, porque el texto
      // libre que escribió la persona no queda guardado y volvería a pedirlo vacío sin que se note.
      try {
        localStorage.setItem(CLAVE_ULTIMO_CURSO, curso);
        if (origen !== ORIGEN_OTRO) {
          localStorage.setItem(CLAVE_ULTIMO_ORIGEN, origen);
        } else {
          localStorage.removeItem(CLAVE_ULTIMO_ORIGEN);
        }
        localStorage.setItem(CLAVE_ULTIMOS_ADICIONALES, JSON.stringify(cursosAdicionales));
        localStorage.removeItem(CLAVE_BORRADOR);
      } catch (err) { /* ignorar */ }

      setResultadoFinal({ cantidad: contactos.length, curso: cursoTextoPreview || 'sin definir' });
      setContactos([contactoVacio()]);
      setErrores({});
      setDuplicados({});
      setIgnorarDuplicado({});
    } finally {
      setGuardando(false);
    }
  }

  function seguirCargando() {
    setResultadoFinal(null);
  }

  const inputCls = 'w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accentTeal transition-colors';
  const inputClsBg = 'w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accentTeal transition-colors';

  // Pantalla de éxito
  if (resultadoFinal) {
    return (
      <div>
        <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
        <div className="max-w-xl mx-auto px-4 pb-16 pt-10 text-center">
          <div className="bg-surface border border-border rounded-2xl p-10">
            <p className="text-5xl mb-3">🎉</p>
            <h3 className="text-lg font-bold mb-1">
              {resultadoFinal.cantidad} lead{resultadoFinal.cantidad > 1 ? 's' : ''} creado{resultadoFinal.cantidad > 1 ? 's' : ''} correctamente
            </h3>
            <p className="text-textSec text-sm mb-6">{resultadoFinal.cantidad} · {resultadoFinal.curso}</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => router.push('/buscador')}
                className="w-full bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-xl py-3 text-sm font-semibold">
                Ir al buscador
              </button>
              <button onClick={seguirCargando}
                className="w-full bg-surface2 border border-border rounded-xl py-3 text-sm font-medium">
                Seguir cargando
              </button>
              <button onClick={() => router.push('/seguimiento')}
                className="w-full bg-surface2 border border-border rounded-xl py-3 text-sm font-medium">
                Ver últimos creados
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-[1500px] mx-auto px-4 pb-24">

        {borradorDisponible && (
          <div className="bg-infoBg border border-infoText/30 rounded-xl p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-text">📝 Encontramos una carga sin terminar. ¿Querés recuperarla?</p>
            <div className="flex gap-2">
              <button onClick={recuperarBorrador} className="text-xs px-3 py-1.5 rounded-md bg-accentPurple text-white font-semibold">Recuperar</button>
              <button onClick={descartarBorrador} className="text-xs px-3 py-1.5 rounded-md bg-surface2 border border-border">Descartar</button>
            </div>
          </div>
        )}

        <form id="form-nuevo-lead" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">

          {/* COLUMNA PRINCIPAL */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="text-lg font-bold">Nuevo lead</h3>
              <button type="button" onClick={() => setMostrarPegarLista(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-surface2 border border-border text-textSec hover:text-text">
                📋 Pegar lista completa
              </button>
            </div>
            <p className="text-textMuted text-xs mb-5">
              Podés cargar varios contactos de una — comparten curso y origen. Atajos: Ctrl+Enter guardar · Ctrl+N nuevo contacto · Ctrl+D duplicar.
            </p>

            <div className="grid grid-cols-2 gap-5 mb-4">
              <div>
                <label className="text-[13px] font-medium text-textSec block mb-1">
                  Producto (para toda la tanda)
                  {cursoAutocompletado && <span className="text-infoText font-normal ml-1.5">· recordado de la carga anterior</span>}
                </label>
                <select value={curso} onChange={(e) => { setCurso(e.target.value); setCursoAutocompletado(false); }} className={inputClsBg}>
                  <option value={CURSO_SIN_DEFINIR}>{CURSO_SIN_DEFINIR}</option>
                  {CURSOS.map((c) => <option key={c}>{c}</option>)}
                  <option value={CURSO_OTROS}>{CURSO_OTROS}</option>
                </select>
                {curso === CURSO_SIN_DEFINIR && (
                  <p className="text-textMuted text-[12px] mt-1 flex items-center gap-1"><span>ℹ️</span> Podrás modificar esta información más adelante.</p>
                )}
                {curso === CURSO_OTROS && (
                  <input required value={cursoPersonalizado} onChange={(e) => setCursoPersonalizado(e.target.value)}
                    placeholder="Escribí el nombre del curso" className={`${inputClsBg} mt-2`} />
                )}
              </div>
              <div>
                <label className="text-[13px] font-medium text-textSec block mb-1">
                  Cómo llegaron (para toda la tanda)
                  {origenAutocompletado && <span className="text-infoText font-normal ml-1.5">· recordado de la carga anterior</span>}
                </label>
                <select value={origen} onChange={(e) => { setOrigen(e.target.value); setOrigenAutocompletado(false); }} className={inputClsBg}>
                  <option value={ORIGEN_SIN_DEFINIR}>{ORIGEN_SIN_DEFINIR}</option>
                  {ORIGENES.map((o) => <option key={o}>{o}</option>)}
                  <option value={ORIGEN_OTRO}>{ORIGEN_OTRO}</option>
                </select>
                {origen === ORIGEN_SIN_DEFINIR && (
                  <p className="text-textMuted text-[12px] mt-1 flex items-center gap-1"><span>ℹ️</span> Podrás modificar esta información más adelante.</p>
                )}
                {origen === ORIGEN_OTRO && (
                  <input required value={origenPersonalizado} onChange={(e) => setOrigenPersonalizado(e.target.value)}
                    placeholder="Escribí el origen" className={`${inputClsBg} mt-2`} />
                )}
              </div>
            </div>

            <hr className="border-border mb-4" />

            <div className="mb-5">
              <label className="text-[13px] font-medium text-textSec block mb-1.5">
                ¿Les interesan otros cursos también? <span className="text-textMuted font-normal">(opcional, aplica a toda la tanda)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CURSOS.filter((c) => c !== curso).map((c) => {
                  const activo = cursosAdicionales.includes(c);
                  return (
                    <button type="button" key={c} onClick={() => toggleCursoAdicional(c)}
                      className={`text-[13px] px-3 py-1.5 rounded-full border transition-colors ${
                        activo ? 'bg-accentPurple border-accentPurple text-white font-medium'
                               : 'bg-surface2 border-border text-textSec hover:border-accentTeal hover:text-text'
                      }`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CONTACTOS */}
            {contactos.map((contacto, index) => {
              const { p, estado } = infoContactos[index];
              const estilo = ESTILOS_ESTADO[estado];
              const colapsada = colapsadas[index] && contactos.length > 2;

              return (
                <div key={contacto.key}
                  ref={(el) => { refsCards.current[index] = el; }}
                  draggable={contactos.length > 1}
                  onDragStart={() => onDragStart(index)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(index)}
                  className={`bg-bg border-2 rounded-xl p-4 mb-3 transition-all ${estilo.borde} ${arrastrando === index ? 'opacity-40' : 'opacity-100'}`}>

                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      {contactos.length > 1 && <span className="text-textMuted cursor-grab select-none" title="Arrastrar para reordenar">⠿</span>}
                      <span className="text-[14px]">👤</span>
                      <span className="text-[14px] font-semibold text-text">Contacto {index + 1}</span>
                      <span className={`text-[11px] font-medium ${estilo.texto}`}>
                        {estilo.badge} {estado === 'error' ? motivoError(contacto, p) : estilo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {contactos.length > 2 && (
                        <button type="button" onClick={() => toggleColapsada(index)} className="text-textMuted hover:text-text text-[12px]">
                          {colapsada ? '▼ Expandir' : '▲ Contraer'}
                        </button>
                      )}
                      {contactos.length > 1 && (
                        <>
                          <button type="button" onClick={() => duplicarContacto(index)} className="text-textMuted hover:text-accentTeal text-[12px]">⧉ Duplicar</button>
                          <button type="button" onClick={() => quitarContacto(index)} className="text-textMuted hover:text-warningText text-[12px]">🗑 Eliminar</button>
                        </>
                      )}
                    </div>
                  </div>

                  {!colapsada && (
                    <>
                      {duplicados[index]?.length > 0 && !ignorarDuplicado[index] && (
                        <div className="bg-warningBg border border-warningText/30 rounded-lg p-3 mb-3">
                          <p className="text-warningText text-[13px] font-semibold mb-1.5">
                            🟠 Ya existe un contacto similar — {duplicados[index][0].motivo}
                          </p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[12px] text-textSec mb-2.5">
                            <p><span className="text-textMuted">Nombre:</span> {duplicados[index][0].nombre}</p>
                            <p><span className="text-textMuted">Curso:</span> {duplicados[index][0].curso}</p>
                            <p><span className="text-textMuted">WhatsApp:</span> {duplicados[index][0].whatsapp || '—'}</p>
                            <p><span className="text-textMuted">Estado:</span> {duplicados[index][0].estado}</p>
                            <p><span className="text-textMuted">Responsable:</span> {duplicados[index][0].responsable || '—'}</p>
                            {duplicados[index][0].ultimaGestion && (
                              <p className="col-span-2"><span className="text-textMuted">Última gestión:</span> {duplicados[index][0].ultimaGestion}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setFichaLeadId(duplicados[index][0].id)}
                              className="text-[12px] px-2.5 py-1 rounded bg-surface2 border border-border">Ver ficha</button>
                            <a href={`/buscador?leadId=${duplicados[index][0].id}&editar=1`}
                              className="text-[12px] px-2.5 py-1 rounded bg-surface2 border border-border">Actualizar</a>
                            <button type="button" onClick={() => setIgnorarDuplicado((prev) => ({ ...prev, [index]: true }))}
                              className="text-[12px] px-2.5 py-1 rounded bg-accentPurple text-white">Crear igualmente</button>
                          </div>
                        </div>
                      )}

                      <label className="text-[13px] font-medium text-textSec block mb-1">
                        Pegá el contacto como lo recibiste
                      </label>
                      <textarea rows={3} value={contacto.raw}
                        onPaste={(e) => manejarPegado(e, index)}
                        placeholder={'Juan Pérez\nArgentina\n+54 9 11 5555 5555\n\nTambién podés pegar varios contactos juntos (separados por una línea en blanco).'}
                        onChange={(e) => actualizarContacto(index, 'raw', e.target.value)}
                        className={`w-full bg-surface2 border-2 rounded-xl px-4 py-3.5 text-[15px] leading-relaxed
                          focus:outline-none transition-colors ${
                            estado === 'error' ? 'border-dangerText/50 focus:border-dangerText' :
                            estado === 'duplicado' ? 'border-warningText/50 focus:border-warningText' :
                            estado === 'completo' ? 'border-successText/50 focus:border-successText' :
                            'border-border focus:border-accentTeal'
                          }`} />

                      {/* "Detectamos:" */}
                      {contacto.raw.trim() && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 mb-1 text-[12px]">
                          <span className={p.nombre ? 'text-successText' : 'text-textMuted'}>{p.nombre ? '✓' : '○'} Nombre{p.nombre ? `: ${p.nombre}` : ' detectado'}</span>
                          <span className={p.pais ? 'text-successText' : 'text-textMuted'}>{p.pais ? '✓' : '○'} País{p.pais ? `: ${p.pais}` : ''}</span>
                          <span className={p.whatsapp ? 'text-successText' : 'text-textMuted'}>{p.whatsapp ? '✓' : '○'} WhatsApp{p.whatsapp ? `: ${p.whatsapp}` : ''}</span>
                          <span className={(p.email || contacto.email) ? 'text-successText' : 'text-textMuted'}>{(p.email || contacto.email) ? '✓' : '○'} Email{p.email ? `: ${p.email}` : ''}</span>
                          <span className={(p.instagram || contacto.instagram) ? 'text-successText' : 'text-textMuted'}>{(p.instagram || contacto.instagram) ? '✓' : '○'} Instagram/Facebook{p.instagram ? `: ${p.instagram}` : ''}</span>
                          {p.notasExtra && <span className="text-infoText">📝 Notas: {p.notasExtra}</span>}
                        </div>
                      )}

                      {contacto.raw.trim().toLowerCase().includes('prueba') && (
                        <p className="text-infoText text-[12px] mb-2 flex items-center gap-1">
                          <span>💡</span> "Prueba" en el nombre borra este lead solo a las 48hs — es solo una prueba.
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <label className="text-[13px] font-medium text-textSec block mb-1">
                            Email {!contacto.email && p.email && <span className="text-successText font-normal">· detectado arriba</span>}
                          </label>
                          <input type="email" value={contacto.email || p.email} placeholder="juan@email.com"
                            onChange={(e) => actualizarContacto(index, 'email', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className="text-[13px] font-medium text-textSec block mb-1">
                            Instagram / Facebook {!contacto.instagram && p.instagram && <span className="text-successText font-normal">· detectado arriba</span>}
                          </label>
                          <input value={contacto.instagram || p.instagram} placeholder="@juanperez"
                            onChange={(e) => actualizarContacto(index, 'instagram', e.target.value)} className={inputCls} />
                        </div>
                      </div>

                      {errores[index] && <p className="text-dangerText text-[12px] mt-2">⚠️ {errores[index]}</p>}
                    </>
                  )}

                  {colapsada && (
                    <p className="text-textSec text-[13px]">{p.nombre || '(sin nombre)'} {p.whatsapp && `· 📱 ${p.whatsapp}`}</p>
                  )}
                </div>
              );
            })}

            <div className="flex gap-2 mt-1">
              <button type="button" onClick={agregarContacto}
                className="flex-1 flex items-center justify-center gap-2 bg-surface2 border border-border rounded-lg py-2.5 text-[13px] font-medium text-textSec hover:text-text hover:border-accentTeal transition-colors">
                <span className="text-base leading-none">＋</span> Agregar otro contacto
              </button>
              {contactos.length > 0 && contactos[contactos.length - 1].raw.trim() && (
                <button type="button" onClick={copiarUltimoContacto}
                  className="px-4 bg-surface2 border border-border rounded-lg text-[13px] font-medium text-textSec hover:text-text">
                  ⧉ Copiar último
                </button>
              )}
            </div>

            <div className="mt-5">
              <label className="text-[13px] font-medium text-textSec block mb-1">Fecha de ingreso</label>
              <input disabled value={new Date().toLocaleDateString('es-AR')} className={`${inputClsBg} text-textSec max-w-xs`} />
            </div>

            <p className="text-textMuted text-[12px] mt-4 flex items-center gap-1">
              <span>ℹ️</span> Solo el nombre y un medio de contacto son necesarios para crear el lead. El resto de la información puede completarse posteriormente.
            </p>
          </div>

          {/* PANEL LATERAL FIJO */}
          <div className="lg:sticky lg:top-4 bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3">
            <p className="text-sm font-bold">Resumen</p>
            <div className="text-[13px] text-textSec space-y-1">
              <p><span className="text-textMuted">Curso:</span> {cursoTextoPreview || 'sin definir'}</p>
              <p><span className="text-textMuted">Cómo llegó:</span> {origen === ORIGEN_SIN_DEFINIR ? 'sin definir' : (origen === ORIGEN_OTRO ? origenPersonalizado : origen)}</p>
              <p><span className="text-textMuted">Adicionales:</span> {cursosAdicionales.length > 0 ? cursosAdicionales.join(', ') : '—'}</p>
            </div>

            <hr className="border-border" />

            <div className="text-[13px] space-y-1">
              <p className="font-semibold text-text">{contactos.length} contacto{contactos.length !== 1 ? 's' : ''}</p>
              {completos > 0 && <p className="text-successText">✅ {completos} completo{completos !== 1 ? 's' : ''}</p>}
              {conError > 0 && <p className="text-dangerText">🔴 {conError} con error</p>}
              {conDuplicado > 0 && <p className="text-warningText">🟠 {conDuplicado} posible{conDuplicado !== 1 ? 's' : ''} duplicado{conDuplicado !== 1 ? 's' : ''}</p>}
            </div>

            <div>
              <div className="w-full h-2 bg-bg rounded-full overflow-hidden border border-border">
                <div className="h-full bg-gradient-to-r from-accentPurple to-accentMagenta transition-all"
                  style={{ width: `${contactos.length ? (listosParaGuardar / contactos.length) * 100 : 0}%` }} />
              </div>
              <p className="text-textMuted text-[11px] mt-1">{listosParaGuardar} de {contactos.length} listos para guardar</p>
            </div>

            <button type="submit" disabled={guardando}
              className="w-full bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-xl py-3 text-[14px] font-semibold
                shadow-lg shadow-accentPurple/20 hover:shadow-xl hover:shadow-accentPurple/30 hover:brightness-110
                transition-all disabled:opacity-60 disabled:hover:shadow-lg disabled:hover:brightness-100 mt-1">
              {guardando
                ? `Guardando ${progreso.actual} de ${progreso.total}…`
                : contactos.length > 1 ? `Guardar ${contactos.length} leads` : 'Guardar lead'}
            </button>
            {guardando && progreso.total > 1 && (
              <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden border border-border -mt-1">
                <div className="h-full bg-accentTeal transition-all" style={{ width: `${(progreso.actual / progreso.total) * 100}%` }} />
              </div>
            )}
          </div>
        </form>
      </div>

      {/* BOTÓN FLOTANTE */}
      <button type="button" onClick={agregarContacto}
        className="fixed bottom-6 right-6 lg:right-[340px] w-14 h-14 rounded-full bg-gradient-to-r from-accentPurple to-accentMagenta
          text-white text-2xl shadow-xl hover:brightness-110 transition-all flex items-center justify-center z-40"
        title="Agregar contacto (Ctrl+N)">
        ＋
      </button>

      {/* MODAL PEGAR LISTA COMPLETA */}
      {mostrarPegarLista && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface2 border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <p className="text-sm font-bold mb-1">📋 Pegar lista completa</p>
            <p className="text-textMuted text-xs mb-3">
              Pegá varios contactos separados por una línea en blanco entre cada uno. Se crea una tarjeta por cada uno.
            </p>
            <textarea rows={10} value={textoPegarLista} onChange={(e) => setTextoPegarLista(e.target.value)}
              placeholder={'Juan Pérez\nArgentina\n+54 9 11 5555 5555\n\nMaría López\n+54 9 11 4444 4444\n\nPedro Ruiz\n+54 9 11 3333 3333'}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setMostrarPegarLista(false); setTextoPegarLista(''); }}
                className="flex-1 bg-surface border border-border rounded-lg py-2 text-sm">Cancelar</button>
              <button onClick={pegarListaCompleta}
                className="flex-1 bg-accentPurple text-white rounded-lg py-2 text-sm font-semibold">Crear tarjetas</button>
            </div>
          </div>
        </div>
      )}

      <FichaDrawer leadId={fichaLeadId} usuario={usuario} onClose={() => setFichaLeadId(null)} />
    </div>
  );
}
