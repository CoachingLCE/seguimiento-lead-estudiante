'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import FichaDrawer from '../../components/FichaDrawer';
import { useSession } from '../../lib/useSession';
import { tienePermisoCrearLeads } from '../../lib/permisos';
import { CURSOS, ORIGENES, ORIGEN_OTRO, PAISES, CURSO_SIN_DEFINIR, CURSO_OTROS, detectarPaisPorWhatsapp } from '../../lib/constants';

function contactoVacio() {
  return { nombre: '', whatsapp: '', email: '', instagram: '', pais: 'Argentina', paisAuto: true };
}

function tieneMedioDeContacto(contacto) {
  return Boolean(contacto.whatsapp.trim() || contacto.email.trim() || contacto.instagram.trim());
}

function previewContacto(contacto, cursoTexto) {
  const partes = [
    contacto.nombre.trim(),
    cursoTexto,
    contacto.whatsapp.trim(),
    contacto.email.trim()
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
    setContactos((prev) => prev.map((c, i) => {
      if (i !== index) return c;
      const actualizado = { ...c, [campo]: valor };
      if (campo === 'pais') {
        // El usuario tocó el país a mano: dejamos de autocompletarlo para no pisarle la corrección.
        actualizado.paisAuto = false;
      } else if (campo === 'whatsapp' && c.paisAuto) {
        const detectado = detectarPaisPorWhatsapp(valor);
        if (detectado) actualizado.pais = detectado;
      }
      return actualizado;
    }));
    if (['nombre', 'whatsapp', 'email'].includes(campo)) {
      setIgnorarDuplicado((prev) => ({ ...prev, [index]: false }));
      clearTimeout(timersDuplicados.current[index]);
      timersDuplicados.current[index] = setTimeout(() => verificarDuplicado(index), 500);
    }
  }

  async function verificarDuplicado(index) {
    const contacto = contactos[index];
    if (!contacto) return;
    const params = new URLSearchParams({
      nombre: contacto.nombre,
      whatsapp: contacto.whatsapp,
      email: contacto.email,
      solicitanteEmail: usuario.email
    });
    const res = await fetch(`/api/leads/duplicados?${params}`);
    const data = await res.json();
    setDuplicados((prev) => ({ ...prev, [index]: data.coincidencias || [] }));
  }

  function agregarContacto() {
    setContactos((prev) => [...prev, contactoVacio()]);
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
        await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: contacto.nombre,
            apellido: '',
            whatsapp: contacto.whatsapp,
            email: contacto.email,
            instagram: contacto.instagram,
            pais: contacto.pais,
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
      setErrores({});
    } finally {
      setGuardando(false);
    }
  }

  const cursoTextoPreview =
    curso === CURSO_SIN_DEFINIR ? '' : curso === CURSO_OTROS ? cursoPersonalizado.trim() : curso;

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-surface border border-border rounded-2xl p-6 max-w-xl">
          <h3 className="text-base font-semibold mb-1">Nuevo lead</h3>
          <p className="text-textMuted text-xs mb-4">
            Podés cargar varios contactos de una — comparten curso y origen.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-textSec block mb-1">Curso (para toda la tanda)</label>
                <select value={curso} onChange={(e) => setCurso(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm">
                  <option value={CURSO_SIN_DEFINIR}>{CURSO_SIN_DEFINIR}</option>
                  {CURSOS.map((c) => <option key={c}>{c}</option>)}
                  <option value={CURSO_OTROS}>{CURSO_OTROS}</option>
                </select>
                {curso === CURSO_SIN_DEFINIR && (
                  <p className="text-textMuted text-xs mt-1">Se puede completar después desde Seguimiento.</p>
                )}
                {curso === CURSO_OTROS && (
                  <input required value={cursoPersonalizado} onChange={(e) => setCursoPersonalizado(e.target.value)}
                    placeholder="Escribí el nombre del curso"
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mt-2" />
                )}
              </div>
              <div>
                <label className="text-xs text-textSec block mb-1">Cómo llegaron (para toda la tanda)</label>
                <select value={origen} onChange={(e) => setOrigen(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm">
                  {ORIGENES.map((o) => <option key={o}>{o}</option>)}
                  <option value={ORIGEN_OTRO}>{ORIGEN_OTRO}</option>
                </select>
                {origen === ORIGEN_OTRO && (
                  <input required value={origenPersonalizado} onChange={(e) => setOrigenPersonalizado(e.target.value)}
                    placeholder="Escribí el origen"
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mt-2" />
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-textSec block mb-1">
                ¿Les interesan otros cursos también? (opcional, aplica a toda la tanda)
              </label>
              <div className="flex flex-wrap gap-2 bg-bg border border-border rounded-lg p-2.5">
                {CURSOS.filter((c) => c !== curso).map((c) => (
                  <label key={c} className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={cursosAdicionales.includes(c)}
                      onChange={() => toggleCursoAdicional(c)} />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            {contactos.map((contacto, index) => {
              const preview = previewContacto(contacto, cursoTextoPreview);
              return (
                <div key={index} className="bg-bg border border-border rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-textSec">Contacto {index + 1}</span>
                    {contactos.length > 1 && (
                      <button type="button" onClick={() => quitarContacto(index)}
                        className="text-warningText text-xs">✕ Quitar</button>
                    )}
                  </div>

                  {preview && (
                    <p className="text-accentTeal text-xs font-medium mb-2 truncate">👤 {preview}</p>
                  )}

                  {duplicados[index]?.length > 0 && !ignorarDuplicado[index] && (
                    <div className="bg-warningBg border border-warningText/30 rounded-lg p-2.5 mb-2">
                      <p className="text-warningText text-xs font-semibold mb-1.5">
                        ⚠️ Ya existe un contacto similar: {duplicados[index][0].nombre} ({duplicados[index][0].curso})
                      </p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setFichaLeadId(duplicados[index][0].id)}
                          className="text-xs px-2.5 py-1 rounded bg-surface2 border border-border">Ver ficha</button>
                        <a href={`/buscador?leadId=${duplicados[index][0].id}&editar=1`}
                          className="text-xs px-2.5 py-1 rounded bg-surface2 border border-border">Actualizar</a>
                        <button type="button" onClick={() => setIgnorarDuplicado((prev) => ({ ...prev, [index]: true }))}
                          className="text-xs px-2.5 py-1 rounded bg-accentPurple text-white">Crear igualmente</button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs text-textSec block mb-1">Nombre</label>
                      <input required value={contacto.nombre} placeholder="Ej: Juan Pérez, o como lo tengas identificado"
                        onChange={(e) => actualizarContacto(index, 'nombre', e.target.value)}
                        className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm" />
                      {contacto.nombre.trim().toLowerCase() === 'prueba' && (
                        <p className="text-infoText text-xs mt-1.5">
                          💡 Podés poner "Prueba" en el nombre para ver cómo funciona cada pantalla. Este lead se borra solo a las 48hs — es solo una prueba.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-textSec block mb-1">WhatsApp (opcional)</label>
                      <input value={contacto.whatsapp} placeholder="+54 9 11 1234-5678"
                        onChange={(e) => actualizarContacto(index, 'whatsapp', e.target.value)}
                        className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-textSec block mb-1">Email (opcional)</label>
                      <input type="email" value={contacto.email} placeholder="nombre@correo.com"
                        onChange={(e) => actualizarContacto(index, 'email', e.target.value)}
                        className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-textSec block mb-1">Usuario de Instagram/Facebook (opcional)</label>
                      <input value={contacto.instagram} placeholder="@usuario"
                        onChange={(e) => actualizarContacto(index, 'instagram', e.target.value)}
                        className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-textSec block mb-1">
                        País (opcional)
                        {contacto.paisAuto && contacto.whatsapp && (
                          <span className="text-infoText font-normal ml-1.5">· 🌎 detectado automáticamente</span>
                        )}
                      </label>
                      <input list="lista-paises" value={contacto.pais}
                        onChange={(e) => actualizarContacto(index, 'pais', e.target.value)}
                        className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>

                  {errores[index] && (
                    <p className="text-warningText text-xs mt-2">⚠️ {errores[index]}</p>
                  )}
                </div>
              );
            })}

            <datalist id="lista-paises">
              {PAISES.map((p) => <option key={p} value={p} />)}
            </datalist>

            <button type="button" onClick={agregarContacto}
              className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm mb-4">
              + Agregar otro contacto
            </button>

            <div className="mb-4 max-w-xs">
              <label className="text-xs text-textSec block mb-1">Fecha de ingreso</label>
              <input disabled value={new Date().toLocaleDateString('es-AR')}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-textSec" />
            </div>

            <button type="submit" disabled={guardando}
              className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-5 py-2.5 font-semibold text-sm disabled:opacity-60">
              {guardando ? 'Guardando…' : contactos.length > 1 ? `Guardar ${contactos.length} leads` : 'Guardar lead'}
            </button>
            {ok && <span className="text-successText text-sm ml-3">✓ Lead(s) guardado(s)</span>}

            <p className="text-textMuted text-[11px] mt-4">
              Solo el nombre y un medio de contacto son necesarios para crear el lead. El resto de la información puede completarse posteriormente.
            </p>
          </form>
        </div>
      </div>
      <FichaDrawer leadId={fichaLeadId} usuario={usuario} onClose={() => setFichaLeadId(null)} />
    </div>
  );
}
