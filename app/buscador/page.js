'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Nav from '../../components/Nav';
import { useSession } from '../../lib/useSession';
import { tienePermisoBuscador, tienePermisoEditarLead } from '../../lib/permisos';
import { ORIGENES, ORIGEN_OTRO, CURSOS, CURSO_OTROS, CURSO_SIN_DEFINIR, PAISES, PRIORIDADES } from '../../lib/constants';

function BuscadorContent() {
  const { usuario, logout } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qInicial = searchParams.get('q') || '';
  const leadId = searchParams.get('leadId');
  const autoEditar = searchParams.get('editar') === '1';

  const [q, setQ] = useState(qInicial);
  const [resultados, setResultados] = useState([]);
  const [ficha, setFicha] = useState(null);
  const [cargando, setCargando] = useState(false);

  const puedeVer = tienePermisoBuscador(usuario);

  useEffect(() => {
    if (!usuario || !puedeVer) return;
    if (leadId) {
      cargarFicha();
    } else if (qInicial) {
      buscar(qInicial);
    }
  }, [usuario, leadId, qInicial]);

  async function buscar(texto) {
    setCargando(true);
    setFicha(null);
    const r = await fetch(`/api/buscador?q=${encodeURIComponent(texto)}&solicitanteEmail=${encodeURIComponent(usuario.email)}`)
      .then((res) => res.json());
    setResultados(r.resultados || []);
    setCargando(false);
  }

  async function cargarFicha() {
    setCargando(true);
    const r = await fetch(`/api/buscador?leadId=${encodeURIComponent(leadId)}&solicitanteEmail=${encodeURIComponent(usuario.email)}`)
      .then((res) => res.json());
    setFicha(r);
    setCargando(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    router.push(`/buscador?q=${encodeURIComponent(q)}`);
  }

  if (!usuario || !puedeVer) return null;

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <form onSubmit={handleSubmit} className="mb-5">
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, apellido, email o celular…"
            className="w-full max-w-md bg-bg border border-border rounded-lg px-3 py-2 text-sm"
          />
        </form>

        {cargando && <p className="text-textSec text-sm">Cargando…</p>}

        {!leadId && !cargando && (
          <div className="bg-surface border border-border rounded-2xl p-5">
            {resultados.length === 0 ? (
              <p className="text-textMuted text-sm">
                {qInicial ? 'Sin resultados.' : 'Escribí algo para buscar.'}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-textSec text-left border-b border-border">
                    <th className="py-2">ID</th><th>Nombre</th><th>Curso</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r) => (
                    <tr key={r.id} className="border-b border-border">
                      <td className="py-2 text-textMuted">{r.id}</td>
                      <td>{r.nombre}</td>
                      <td>{r.curso}</td>
                      <td>{r.estado}</td>
                      <td>
                        <button onClick={() => router.push(`/buscador?leadId=${r.id}`)}
                          className="text-xs px-3 py-1 rounded bg-accentPurple text-white">
                          Ver ficha
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {leadId && ficha && !cargando && (
          <Ficha ficha={ficha} usuario={usuario} onNotasGuardadas={cargarFicha} autoEditar={autoEditar} />
        )}
      </div>
    </div>
  );
}

function Ficha({ ficha, usuario, onNotasGuardadas }) {
  const { lead, seguimiento, inscrito, historial } = ficha;
  const [notas, setNotas] = useState(lead.NotasInternas || '');
  const [guardandoNotas, setGuardandoNotas] = useState(false);
  const [notasOk, setNotasOk] = useState(false);

  async function guardarNotas() {
    setGuardandoNotas(true);
    setNotasOk(false);
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: lead.ID, notasInternas: notas,
        solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre
      })
    });
    setGuardandoNotas(false);
    setNotasOk(true);
    if (onNotasGuardadas) onNotasGuardadas();
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-2xl p-5">
        <p className="text-lg font-bold">{lead.Nombre} {lead.Apellido}</p>
        <p className="text-textSec text-sm mb-3">
          {lead.WhatsApp} {lead.EmailEstudiante && `· ${lead.EmailEstudiante}`}
        </p>
        <p className="text-textMuted text-xs">
          Ingresó {new Date(lead.FechaIngreso).toLocaleDateString('es-AR')} · Origen: {lead.Origen} ·
          Cargado por {lead.CargadoPorNombre}
        </p>
        <p className="text-textMuted text-xs mt-2">
          ⚠️ Datos de campus (último ingreso, cantidad de ingresos), tarjeta y número de referencia de pago
          no están disponibles — requieren integración con una plataforma externa que hoy no está conectada.
          El "ID Venta" es el mismo ID de este lead ({lead.ID}), ya que no existe una entidad de venta separada.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5">
        <p className="text-sm font-semibold mb-2">Formación / Ventas</p>
        <p className="text-sm">Curso principal: {lead.Curso || 'sin definir'}</p>
        {lead.CursosAdicionales && <p className="text-sm text-textSec">Interés adicional: {lead.CursosAdicionales}</p>}
        {lead.Estado === 'Comprado' && (
          <div className="text-sm mt-2 text-textSec">
            <p>Fecha de venta: {new Date(lead.FechaVenta).toLocaleDateString('es-AR')}</p>
            <p>Medio de pago: {lead.MedioPago}</p>
            <p>Modalidad: {lead.Modalidad}</p>
            <p>Monto: ${lead.MontoTotal}</p>
          </div>
        )}
      </div>

      {inscrito && (
        <div className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-sm font-semibold mb-2">Estado académico</p>
          <p className="text-sm">Edición: {inscrito.Edicion || '—'}</p>
          <p className="text-sm">Alta en plataforma: {inscrito.AltaPlataforma === 'TRUE' ? `✓ (${inscrito.AltaPorNombre})` : 'Pendiente'}</p>
          <p className="text-sm">Bienvenida enviada: {inscrito.BienvenidaEnviada === 'TRUE' ? `✓ (${inscrito.BienvenidaPorNombre})` : 'Pendiente'}</p>
          <p className="text-sm">Diploma (abonó totalidad): {inscrito.AbonoTotalidad === 'TRUE' ? '✓' : '—'}</p>
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl p-5">
        <p className="text-sm font-semibold mb-2">Seguimiento comercial</p>
        {seguimiento.length === 0 ? <p className="text-textMuted text-sm">Sin registros de seguimiento.</p> : (
          seguimiento.map((s) => (
            <p key={s.Lote} className="text-sm text-textSec">
              Lote {s.Lote}: {s.Contactado === 'TRUE'
                ? `${s.Resultado} (${new Date(s.FechaContacto).toLocaleDateString('es-AR')}) — responsable: ${s.AsignadoANombre || '—'}`
                : `pendiente — asignado a: ${s.AsignadoANombre || 'sin asignar'}`}
            </p>
          ))
        )}
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5">
        <p className="text-sm font-semibold mb-2">Historial de acciones</p>
        {historial.length === 0 ? <p className="text-textMuted text-sm">Sin historial.</p> : (
          historial.map((h, i) => (
            <p key={i} className="text-sm text-textSec">
              {new Date(h.Fecha).toLocaleDateString('es-AR')} — {h.Accion} ({h.UsuarioNombre})
            </p>
          ))
        )}
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5">
        <p className="text-sm font-semibold mb-2">Observaciones (notas internas — solo personal)</p>
        <textarea
          value={notas} onChange={(e) => setNotas(e.target.value)}
          rows={4} placeholder="Ej: Prefiere contacto por WhatsApp. Pendiente de documentación."
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-3 mt-2">
          <button onClick={guardarNotas} disabled={guardandoNotas}
            className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-1.5 text-sm font-semibold disabled:opacity-60">
            {guardandoNotas ? 'Guardando…' : 'Guardar notas'}
          </button>
          {notasOk && <span className="text-successText text-xs">✓ Guardado</span>}
        </div>
      </div>
    </div>
  );
}

export default function BuscadorPage() {
  return (
    <Suspense fallback={null}>
      <BuscadorContent />
    </Suspense>
  );
}
