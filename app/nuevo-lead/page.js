'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav, { puedeVerOperativo } from '../../components/Nav';
import { useSession } from '../../lib/useSession';
import { CURSOS, ORIGENES, CURSO_SIN_DEFINIR, CURSO_OTROS } from '../../lib/constants';

export default function NuevoLeadPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: '', apellido: '', whatsapp: '', curso: CURSO_SIN_DEFINIR, origen: ORIGENES[0]
  });
  const [cursosAdicionales, setCursosAdicionales] = useState([]);
  const [cursoPersonalizado, setCursoPersonalizado] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  if (!usuario) {
    if (typeof window !== 'undefined') router.push('/');
    return null;
  }
  if (!puedeVerOperativo(usuario)) {
    if (typeof window !== 'undefined') router.push('/inscritos');
    return null;
  }

  function toggleCursoAdicional(curso) {
    setCursosAdicionales((prev) =>
      prev.includes(curso) ? prev.filter((c) => c !== curso) : [...prev, curso]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setOk(false);
    const cursoFinal =
      form.curso === CURSO_SIN_DEFINIR ? '' :
      form.curso === CURSO_OTROS ? cursoPersonalizado.trim() :
      form.curso;
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          curso: cursoFinal,
          cursosAdicionales: cursosAdicionales.join(', '),
          cargadoPorEmail: usuario.email,
          cargadoPorNombre: usuario.nombre
        })
      });
      setOk(true);
      setForm({ nombre: '', apellido: '', whatsapp: '', curso: CURSO_SIN_DEFINIR, origen: ORIGENES[0] });
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
          <h3 className="text-base font-semibold mb-4">Nuevo lead</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-textSec block mb-1">Nombre</label>
              <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
              {form.nombre.trim().toLowerCase() === 'prueba' && (
                <p className="text-infoText text-xs mt-1.5">
                  💡 Podés poner "Prueba" en el nombre para ver cómo funciona cada pantalla. Este lead se borra solo a las 24hs — es solo una prueba.
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-textSec block mb-1">Apellido</label>
              <input required value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-textSec block mb-1">WhatsApp</label>
              <input required value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="+54 9 11 1234-5678"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-textSec block mb-1">Curso</label>
              <select value={form.curso} onChange={(e) => setForm({ ...form, curso: e.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm">
                <option value={CURSO_SIN_DEFINIR}>{CURSO_SIN_DEFINIR}</option>
                {CURSOS.map((c) => <option key={c}>{c}</option>)}
                <option value={CURSO_OTROS}>{CURSO_OTROS}</option>
              </select>
              {form.curso === CURSO_SIN_DEFINIR && (
                <p className="text-textMuted text-xs mt-1">Se puede completar después desde Seguimiento.</p>
              )}
              {form.curso === CURSO_OTROS && (
                <input
                  required
                  value={cursoPersonalizado}
                  onChange={(e) => setCursoPersonalizado(e.target.value)}
                  placeholder="Escribí el nombre del curso"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mt-2"
                />
              )}
            </div>
            <div>
              <label className="text-xs text-textSec block mb-1">Cómo llegó el lead</label>
              <select value={form.origen} onChange={(e) => setForm({ ...form, origen: e.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm">
                {ORIGENES.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs text-textSec block mb-1">
                ¿Le interesan otros cursos también? (opcional)
              </label>
              <div className="flex flex-wrap gap-2 bg-bg border border-border rounded-lg p-2.5">
                {CURSOS.filter((c) => c !== form.curso).map((c) => (
                  <label key={c} className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={cursosAdicionales.includes(c)}
                      onChange={() => toggleCursoAdicional(c)} />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-textSec block mb-1">Fecha de ingreso</label>
              <input disabled value={new Date().toLocaleDateString('es-AR')}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-textSec" />
            </div>
            <div className="col-span-2">
              <button type="submit" disabled={guardando}
                className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-5 py-2.5 font-semibold text-sm disabled:opacity-60">
                {guardando ? 'Guardando…' : 'Guardar lead'}
              </button>
              {ok && <span className="text-successText text-sm ml-3">✓ Lead guardado</span>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
