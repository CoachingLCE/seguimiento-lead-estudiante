'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav, { puedeVerOperativo } from '../../components/Nav';
import { useSession } from '../../lib/useSession';
import { CURSOS, ORIGENES, CURSO_SIN_DEFINIR, CURSO_OTROS } from '../../lib/constants';

function contactoVacio() {
  return { nombre: '', whatsapp: '', instagram: '' };
}

export default function NuevoLeadPage() {
  const { usuario, cargando: cargandoSesion, logout } = useSession();
  const router = useRouter();

  // Datos compartidos por toda la tanda (curso y origen aplican a todos los contactos)
  const [curso, setCurso] = useState(CURSO_SIN_DEFINIR);
  const [cursoPersonalizado, setCursoPersonalizado] = useState('');
  const [origen, setOrigen] = useState(ORIGENES[0]);
  const [cursosAdicionales, setCursosAdicionales] = useState([]);

  // Cada contacto de la tanda tiene sus propios datos personales
  const [contactos, setContactos] = useState([contactoVacio()]);

  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  if (cargandoSesion) {
    return null;
  }
  if (!usuario) {
    if (typeof window !== 'undefined') router.push('/');
    return null;
  }
  if (!puedeVerOperativo(usuario)) {
    if (typeof window !== 'undefined') router.push('/inscritos');
    return null;
  }

  function toggleCursoAdicional(c) {
    setCursosAdicionales((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function actualizarContacto(index, campo, valor) {
    setContactos((prev) => prev.map((c, i) => (i === index ? { ...c, [campo]: valor } : c)));
  }

  function agregarContacto() {
    setContactos((prev) => [...prev, contactoVacio()]);
  }

  function quitarContacto(index) {
    setContactos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setOk(false);
    const cursoFinal =
      curso === CURSO_SIN_DEFINIR ? '' :
      curso === CURSO_OTROS ? cursoPersonalizado.trim() :
      curso;

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
            instagram: contacto.instagram,
            curso: cursoFinal,
            cursosAdicionales: cursosAdicionales.join(', '),
            origen,
            cargadoPorEmail: usuario.email,
            cargadoPorNombre: usuario.nombre
          })
        });
      }
      setOk(true);
      setContactos([contactoVacio()]);
      setCursosAdicionales([]);
      setCursoPersonalizado('');
    } finally {
      setGuardando(false);
    }
  }

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
                </select>
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

            {contactos.map((contacto, index) => (
              <div key={index} className="bg-bg border border-border rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-textSec">Contacto {index + 1}</span>
                  {contactos.length > 1 && (
                    <button type="button" onClick={() => quitarContacto(index)}
                      className="text-warningText text-xs">✕ Quitar</button>
                  )}
                </div>
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
                    <label className="text-xs text-textSec block mb-1">WhatsApp</label>
                    <input required value={contacto.whatsapp} placeholder="+54 9 11 1234-5678"
                      onChange={(e) => actualizarContacto(index, 'whatsapp', e.target.value)}
                      className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-textSec block mb-1">Usuario de Instagram/Facebook (opcional)</label>
                    <input value={contacto.instagram} placeholder="@usuario"
                      onChange={(e) => actualizarContacto(index, 'instagram', e.target.value)}
                      className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>
            ))}

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
          </form>
        </div>
      </div>
    </div>
  );
}
