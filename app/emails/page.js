'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import AccesoDenegado from '../../components/AccesoDenegado';
import { useSession } from '../../lib/useSession';
import { tienePermisoEmails } from '../../lib/permisos';

// Documentación de los mails automáticos reales que manda esta app — se actualiza a mano si se
// agrega o cambia una automatización (ver lib/mailer.js para la lista de funciones de envío).
const AUTOMATIZACIONES = [
  { cuando: 'Se marca "Enviar bienvenida" en Estudiantes', quien: 'Al estudiante (con cc a estudiantes@)', tipo: 'Confirmación inscripción (Bienvenida)' },
  { cuando: 'Se marca "Alta en plataforma" en Estudiantes', quien: 'Al estudiante (con cc a estudiantes@)', tipo: 'Alta en plataforma' },
  { cuando: 'Se crea un usuario nuevo o se resetea una contraseña', quien: 'Al usuario (con su contraseña)', tipo: 'Credenciales de acceso' },
  { cuando: 'Se toca "Enviar mail" en la columna Reactivación de Bajas', quien: 'A la persona dada de baja', tipo: 'Reactivación de baja' },
  { cuando: 'Todos los viernes a las 8 AM (automático)', quien: 'Lourdes, Victoria y Sofía', tipo: 'Resumen semanal' }
];

function normalizar(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function fechaAmigable(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function EmailsPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();

  const [emails, setEmails] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const puedeVer = tienePermisoEmails(usuario);

  useEffect(() => {
    if (!usuario) return;
    if (!puedeVer) return; // ya no redirige — la pantalla en sí muestra el mensaje de acceso
    cargar();
  }, [usuario]);

  async function cargar() {
    setErrorCarga('');
    try {
      const res = await fetch(`/api/emails?solicitanteEmail=${encodeURIComponent(usuario.email)}`);
      const r = await res.json();
      if (!res.ok || r.error) {
        setErrorCarga(r.error || 'No se pudo cargar el registro.');
        setEmails([]);
      } else {
        setEmails(r.emails || []);
      }
    } catch (err) {
      setErrorCarga('No se pudo conectar con el servidor.');
      setEmails([]);
    }
  }

  const tipos = useMemo(() => [...new Set((emails || []).map((e) => e.tipo).filter(Boolean))].sort(), [emails]);
  const filtrados = useMemo(() => {
    const q = normalizar(busqueda);
    return (emails || []).filter((e) => {
      if (filtroTipo && e.tipo !== filtroTipo) return false;
      if (filtroEstado && e.estado !== filtroEstado) return false;
      if (q && !normalizar(`${e.para} ${e.asunto} ${e.tipo}`).includes(q)) return false;
      return true;
    });
  }, [emails, busqueda, filtroTipo, filtroEstado]);

  if (!usuario) return null;

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      {!puedeVer ? (
        <AccesoDenegado seccion="Emails" />
      ) : (
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pb-16">
        <h3 className="text-lg font-bold mb-1">✉️ Emails</h3>
        <p className="text-textMuted text-xs mb-5">Qué mails automáticos manda el sistema, y el registro real de cada envío.</p>

        {/* DOCUMENTACIÓN */}
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 mb-4">
          <p className="text-sm font-semibold mb-3">Mails automáticos que genera el sistema</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-textSec text-left border-b border-border">
                  <th className="py-2 pr-4">Cuándo se envía</th>
                  <th className="pr-4">A quién</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {AUTOMATIZACIONES.map((a, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0">
                    <td className="py-2 pr-4">{a.cuando}</td>
                    <td className="pr-4 text-textSec">{a.quien}</td>
                    <td><span className="text-[11px] px-2.5 py-1 rounded-full bg-infoBg text-infoText whitespace-nowrap">{a.tipo}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* REGISTRO EN VIVO */}
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <p className="text-sm font-semibold">Registro de envíos <span className="text-textMuted font-normal">({emails ? filtrados.length : 0})</span></p>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="🔍 Buscar…"
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm w-48" />
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
              className="bg-bg border border-border rounded-lg px-2.5 py-1.5 text-xs">
              <option value="">Tipo: todos</option>
              {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-bg border border-border rounded-lg px-2.5 py-1.5 text-xs">
              <option value="">Estado: todos</option>
              <option value="Enviado">Enviado</option>
              <option value="Falló">Falló</option>
            </select>
            {(busqueda || filtroTipo || filtroEstado) && (
              <button onClick={() => { setBusqueda(''); setFiltroTipo(''); setFiltroEstado(''); }} className="text-xs text-accentTeal font-semibold">
                Limpiar filtros
              </button>
            )}
          </div>

          {errorCarga ? (
            <div className="text-center py-6">
              <p className="text-dangerText text-sm font-semibold mb-3">⚠️ {errorCarga}</p>
              <button onClick={cargar} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold">Reintentar</button>
            </div>
          ) : emails === null ? (
            <p className="text-textSec text-sm">Cargando…</p>
          ) : filtrados.length === 0 ? (
            <p className="text-textMuted text-sm text-center py-6">
              {emails.length === 0 ? 'Sin envíos registrados todavía. Cuando el sistema mande un mail, va a aparecer acá.' : 'Ningún envío coincide con estos filtros.'}
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface z-10">
                  <tr className="text-textSec text-left border-b border-border">
                    <th className="py-2 pr-3 whitespace-nowrap">Fecha</th>
                    <th className="pr-3 whitespace-nowrap">Tipo</th>
                    <th className="pr-3">Para</th>
                    <th className="pr-3">Asunto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((e, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      <td className="py-2 pr-3 text-textSec whitespace-nowrap">{fechaAmigable(e.fecha)}</td>
                      <td className="pr-3 whitespace-nowrap"><span className="text-[11px] px-2 py-0.5 rounded-full bg-surface2 text-textMuted">{e.tipo}</span></td>
                      <td className="pr-3 text-textSec">{e.para}</td>
                      <td className="pr-3">{e.asunto}</td>
                      <td>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${e.estado === 'Enviado' ? 'bg-successBg text-successText' : 'bg-dangerBg text-dangerText'}`}>
                          {e.estado === 'Enviado' ? '✓ Enviado' : '✕ Falló'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
