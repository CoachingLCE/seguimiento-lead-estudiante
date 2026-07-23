'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Nav from '../../components/Nav';
import { useSession } from '../../lib/useSession';
import { tienePermisoEstudiantes } from '../../lib/permisos';

export default function InscritosPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();
  const [inscritos, setInscritos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pidiendoEmailPara, setPidiendoEmailPara] = useState(null);
  const [emailTemporal, setEmailTemporal] = useState('');
  const [enviandoBienvenidaId, setEnviandoBienvenidaId] = useState(null);

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
    if (res.ok) cargarInscritos();
  }

  function clickEnviarBienvenida(inscrito) {
    if (inscrito.EmailEstudiante) {
      enviarBienvenidaDesdeTabla(inscrito, inscrito.EmailEstudiante);
    } else {
      setPidiendoEmailPara(inscrito.ID);
    }
  }

  if (!usuario || !puedeVer) return null;

  function exportarExcel() {
    const hoja = XLSX.utils.json_to_sheet(
      inscritos.map((i) => ({
        Estudiante: i.NombreEstudiante, Curso: i.Curso, Edicion: i.Edicion,
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
        <div className="flex items-center justify-between mb-3 no-print">
          <p className="text-textMuted text-xs">
            El estudiante aparece acá solo, 24hs después de confirmarse la venta — no hace falta cargarlo a mano.
          </p>
          <button onClick={exportarExcel} className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm">
            ⬇ Exportar a Excel
          </button>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-sm font-semibold mb-3">Inscritos cargados</p>
          {cargando ? (
            <p className="text-textSec text-sm">Cargando…</p>
          ) : inscritos.length === 0 ? (
            <p className="text-textMuted text-sm">Todavía no hay estudiantes generados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-textSec text-left border-b border-border">
                  <th className="py-2">Estudiante</th><th>Curso</th><th>Edición</th>
                  <th>Fecha inscripción</th><th>Alta plataforma</th><th>Bienvenida</th>
                </tr>
              </thead>
              <tbody>
                {inscritos.slice().reverse().map((i) => (
                  <tr key={i.ID} className="border-b border-border align-top">
                    <td className="py-2">{i.NombreEstudiante}</td>
                    <td>{i.Curso || '—'}</td>
                    <td>{i.Edicion || '—'}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
