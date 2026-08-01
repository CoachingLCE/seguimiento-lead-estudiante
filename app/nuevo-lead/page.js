'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import FichaDrawer from '../../components/FichaDrawer';
import { useSession } from '../../lib/useSession';
import { tienePermisoCrearLeads } from '../../lib/permisos';
import {
  CURSOS, ORIGENES, ORIGEN_OTRO, PAISES, CURSO_SIN_DEFINIR, CURSO_OTROS,
  detectarPaisPorWhatsapp, PRIORIDADES
} from '../../lib/constants';

function contactoVacio() {
  return { raw: '', email: '', instagram: '' };
}

// Interpreta lo que se pegó/escribió en el campo único: separa por tabs, saltos de línea,
// comas, pipes o guiones, y trata de identificar WhatsApp (secuencia de dígitos), País
// (coincide con la lista de países) y Email (si aparece ahí en vez de en su propio campo).
// Lo que sobra se junta como Nombre (primer resto) + el resto se guarda en Observaciones.
function parsearIngresoLibre(texto) {
  const partes = (texto || '')
    .split(/\t|\r?\n|\||,|;| - /)
    .map((p) => p.trim())
    .filter(Boolean);

  let whatsapp = '';
  let pais = '';
  let email = '';
  const resto = [];

  partes.forEach((parte) => {
    const soloDigitos = parte.replace(/[^\d]/g, '');
    if (!whatsapp && soloDigitos.length >= 8 && soloDigitos.length <= 15 && /^[+\d\s()-]+$/.test(parte)) {
      whatsapp = parte;
    } else if (!email && /\S+@\S+\.\S+/.test(parte)) {
      email = parte;
    } else if (!pais && PAISES.some((p) => p.toLowerCase() === parte.toLowerCase())) {
      pais = PAISES.find((p) => p.toLowerCase() === parte.toLowerCase());
    } else {
      resto.push(parte);
    }
  });

  if (!pais && whatsapp) {
    pais = detectarPaisPorWhatsapp(whatsapp);
  }

  return {
    nombre: resto[0] || '',
    whatsapp,
    pais,
    email,
    notasExtra: resto.slice(1).join(' · ')
  };
}

function tieneMedioDeContacto(contacto) {
  const p = parsearIngresoLibre(contacto.raw);
  return Boolean(p.whatsapp || contacto.email.trim() || contacto.instagram.trim());
}

function previewContacto(contacto, cursoTexto) {
  const p = parsearIngresoLibre(contacto.raw);
  const partes = [
    p.nombre,
    cursoTexto,
    p.pais && `🌎 ${p.pais}`,
    p.whatsapp && `📱 ${p.whatsapp}`,
    (p.email || contacto.email.trim()) && `✉️ ${p.email || contacto.email.trim()}`
  ].filter(Boolean);
  return partes.join(' • ');
}

export default function NuevoLeadPage() {
  const { usuario, cargando: cargandoSesion, logout } = useSession();
  const router = useRouter();

  // Datos compartidos por toda la tanda (curso y origen aplican a todos los contactos)
  const [curso, setCurso] = useState(CURSO_SIN_DEFINIR);
  const [cursoPersonalizado, setCursoPersonalizado] = useState('');
  const [origen, setOrigen] = useState(ORIGENES[0]);
  const [origenPersonalizado, setOrigenPersonalizado] = useState('');
  const [cursosAdicionales, setCursosAdicionales] = useState([]);
  const [prioridad, setPrioridad] = useState('');

  // Cada contacto de la tanda tiene sus propios datos personales
  const [contactos, setContactos] = useState([contactoVacio()]);
  const [errores, setErrores] = useState({});
  const [duplicados, setDuplicados] = useState({});
  const [ignorarDuplicado, setIgnorarDuplicado] = useState({});
  const [fichaLeadId, setFichaLeadId] = useState(null);
  const timersDuplicados = useRef({});

  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  if (cargandoSesion) {
    return null;
  }
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
      nombre: p.nombre,
      whatsapp: p.whatsapp,
      email: p.email || contacto.email,
      solicitanteEmail: usuario.email
    });
    const res = await fetch(`/api/leads/duplicados?${params}`);
    const data = await res.json();
    setDuplicados((prev) => ({ ...prev, [index]: data.coincidencias || [] }));
  }

  // Si se pegan varios contactos juntos (separados por una línea en blanco), los separamos
  // automáticamente en una tarjeta por contacto — no hace falta pegar de a uno.
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
      const copia = { ...prev[index] };
      return [...prev.slice(0, index + 1), copia, ...prev.slice(index + 1)];
    });
  }

  function quitarContacto(index) {
    setContactos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Validación: cada contacto necesita al menos un medio de contacto (WhatsApp, Email o Instagram/Facebook)
    const nuevosErrores = {};
    contactos.forEach((contacto, i) => {
      if (!tieneMedioDeContacto(contacto)) {
        nuevosErrores[i] = 'Ingresá al menos un medio de contacto (WhatsApp, Email o Instagram/Facebook).';
      }
    });
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setGuardando(true);
    setOk(false);
    const cursoFinal =
      curso === CURSO_SIN_DEFINIR ? '' :
      curso === CURSO_OTROS ? cursoPersonalizado.trim() :
      curso;
    const origenFinal = origen === ORIGEN_OTRO ? origenPersonalizado.trim() : origen;

    try {
      // Se guardan todos los contactos de la tanda, uno por uno, compartiendo curso/origen.
      for (const contacto of contactos) {
        const p = parsearIngresoLibre(contacto.raw);
        await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: p.nombre,
            apellido: '',
            whatsapp: p.whatsapp,
            email: p.email || contacto.email,
            instagram: contacto.instagram,
            pais: p.pais,
            prioridad,
            notasIniciales: p.notasExtra,
            curso: cursoFinal,
            cursosAdicionales: cursosAdicionales.join(', '),
            origen: origenFinal,
            cargadoPorEmail: usuario.email,
            cargadoPorNombre: usuario.nombre
          })
        });
      }
      setOk(true);
      setContactos([contactoVacio()]);
      setCursosAdicionales([]);
      setCursoPersonalizado('');
      setOrigenPersonalizado('');
      setPrioridad('');
      setErrores({});
    } finally {
      setGuardando(false);
    }
  }

  const cursoTextoPreview =
    curso === CURSO_SIN_DEFINIR ? '' : curso === CURSO_OTROS ? cursoPersonalizado.trim() : curso;

  const inputCls = 'w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm ' +
    'focus:outline-none focus:border-accentTeal transition-colors';
  const inputClsBg = 'w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm ' +
    'focus:outline-none focus:border-accentTeal transition-colors';

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-[1400px] mx-auto px-4 pb-16">
        <div className="bg-surface border border-border rounded-2xl p-6 w-full">
          <h3 className="text-lg font-bold mb-0.5">Nuevo lead</h3>
          <p className="text-textMuted text-xs mb-5">
            Podés cargar varios contactos de una — comparten curso y origen.
          </p>
          <form onSubmit={handleSubmit}>

            {/* Curso + Cómo llegaron */}
            <div className="grid grid-cols-2 gap-5 mb-4">
              <div>
                <label className="text-[13px] font-medium text-textSec block mb-1">Curso (para toda la tanda)</label>
                <select value={curso} onChange={(e) => setCurso(e.target.value)} className={inputClsBg}>
                  <option value={CURSO_SIN_DEFINIR}>{CURSO_SIN_DEFINIR}</option>
                  {CURSOS.map((c) => <option key={c}>{c}</option>)}
                  <option value={CURSO_OTROS}>{CURSO_OTROS}</option>
                </select>
                {curso === CURSO_SIN_DEFINIR && (
                  <p className="text-textMuted text-[12px] mt-1 flex items-center gap-1">
                    <span>ℹ️</span> Podrás modificar esta información más adelante.
                  </p>
                )}
                {curso === CURSO_OTROS && (
                  <input required value={cursoPersonalizado} onChange={(e) => setCursoPersonalizado(e.target.value)}
                    placeholder="Escribí el nombre del curso" className={`${inputClsBg} mt-2`} />
                )}
              </div>
              <div>
                <label className="text-[13px] font-medium text-textSec block mb-1">Cómo llegaron (para toda la tanda)</label>
                <select value={origen} onChange={(e) => setOrigen(e.target.value)} className={inputClsBg}>
                  {ORIGENES.map((o) => <option key={o}>{o}</option>)}
                  <option value={ORIGEN_OTRO}>{ORIGEN_OTRO}</option>
                </select>
                {origen === ORIGEN_OTRO && (
                  <input required value={origenPersonalizado} onChange={(e) => setOrigenPersonalizado(e.target.value)}
                    placeholder="Escribí el origen" className={`${inputClsBg} mt-2`} />
                )}
              </div>
            </div>

            <hr className="border-border mb-4" />

            {/* Otros cursos — chips */}
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
                        activo
                          ? 'bg-accentPurple border-accentPurple text-white font-medium'
                          : 'bg-surface2 border-border text-textSec hover:border-accentTeal hover:text-text'
                      }`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contactos */}
            {contactos.map((contacto, index) => {
              const preview = previewContacto(contacto, cursoTextoPreview);
              return (
                <div key={index} className={index > 0 ? 'border-t border-border pt-4 mt-4' : ''}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[14px] font-semibold text-text">Contacto {index + 1}</span>
                    {contactos.length > 1 && (
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => duplicarContacto(index)}
                          className="text-textMuted hover:text-accentTeal text-[12px]">⧉ Duplicar</button>
                        <button type="button" onClick={() => quitarContacto(index)}
                          className="text-textMuted hover:text-warningText text-[12px]">🗑 Eliminar</button>
                      </div>
                    )}
                  </div>

                  {duplicados[index]?.length > 0 && !ignorarDuplicado[index] && (
                    <div className="bg-warningBg border border-warningText/30 rounded-lg p-2.5 mb-3">
                      <p className="text-warningText text-[13px] font-semibold mb-1.5">
                        ⚠️ Ya existe un contacto similar: {duplicados[index][0].nombre} ({duplicados[index][0].curso})
                      </p>
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

                  {/* Campo protagonista: Nombre + País + WhatsApp */}
                  <label className="text-[13px] font-medium text-textSec block mb-1">
                    Nombre, país y WhatsApp — pegá o escribí como tengas el dato
                  </label>
                  <textarea required rows={3} value={contacto.raw}
                    onPaste={(e) => manejarPegado(e, index)}
                    placeholder={'Juan Pérez\nArgentina\n+54 9 11 5555 5555\n\nTambién podés pegar varios contactos juntos.'}
                    onChange={(e) => actualizarContacto(index, 'raw', e.target.value)}
                    className="w-full bg-bg border-2 border-border rounded-xl px-4 py-3.5 text-[15px] leading-relaxed
                      focus:outline-none focus:border-accentTeal transition-colors" />

                  <div className="flex items-center justify-between mt-1.5 mb-3">
                    <p className="text-textMuted text-[12px]">
                      {contactos.length} {contactos.length === 1 ? 'contacto detectado' : 'contactos detectados'}
                    </p>
                    {preview && (
                      <p className="text-accentTeal text-[12px] font-medium truncate max-w-[70%]">👤 {preview}</p>
                    )}
                  </div>

                  {contacto.raw.trim().toLowerCase().includes('prueba') && (
                    <p className="text-infoText text-[12px] mb-3 flex items-center gap-1">
                      <span>💡</span> Podés poner "Prueba" en el nombre para ver cómo funciona cada pantalla. Este lead se borra solo a las 48hs — es solo una prueba.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[13px] font-medium text-textSec block mb-1">Email</label>
                      <input type="email" value={contacto.email} placeholder="juan@email.com"
                        onChange={(e) => actualizarContacto(index, 'email', e.target.value)}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[13px] font-medium text-textSec block mb-1">Instagram / Facebook</label>
                      <input value={contacto.instagram} placeholder="@juanperez"
                        onChange={(e) => actualizarContacto(index, 'instagram', e.target.value)}
                        className={inputCls} />
                    </div>
                  </div>

                  {errores[index] && (
                    <p className="text-warningText text-[12px] mt-2">⚠️ {errores[index]}</p>
                  )}
                </div>
              );
            })}

            <button type="button" onClick={agregarContacto}
              className="w-full flex items-center justify-center gap-2 bg-surface2 border border-border rounded-lg
                py-2.5 text-[13px] font-medium text-textSec hover:text-text hover:border-accentTeal transition-colors mt-4 mb-5">
              <span className="text-base leading-none">＋</span> Agregar otro contacto
            </button>

            <div className="grid grid-cols-2 gap-5 mb-5">
              <div>
                <label className="text-[13px] font-medium text-textSec block mb-1">Fecha de ingreso</label>
                <input disabled value={new Date().toLocaleDateString('es-AR')} className={`${inputClsBg} text-textSec`} />
              </div>
              <div>
                <label className="text-[13px] font-medium text-textSec block mb-1">Prioridad (opcional)</label>
                <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={inputClsBg}>
                  <option value="">Sin definir</option>
                  {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" disabled={guardando}
              className="w-full bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-xl
                py-3.5 text-[15px] font-semibold shadow-lg shadow-accentPurple/20
                hover:shadow-xl hover:shadow-accentPurple/30 hover:brightness-110
                transition-all disabled:opacity-60 disabled:hover:shadow-lg disabled:hover:brightness-100">
              {guardando ? 'Guardando…' : contactos.length > 1 ? `Guardar ${contactos.length} leads` : 'Guardar lead'}
            </button>
            {ok && <p className="text-successText text-sm mt-2 text-center">✓ Lead(s) guardado(s)</p>}

            <p className="text-textMuted text-[12px] mt-3 flex items-center gap-1">
              <span>ℹ️</span> Solo el nombre y un medio de contacto son necesarios para crear el lead. El resto de la información puede completarse posteriormente.
            </p>
          </form>
        </div>
      </div>
      <FichaDrawer leadId={fichaLeadId} usuario={usuario} onClose={() => setFichaLeadId(null)} />
    </div>
  );
}
