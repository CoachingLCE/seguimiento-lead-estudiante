'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import AccesoDenegado from '../../components/AccesoDenegado';
import { useSession } from '../../lib/useSession';
import { tienePermisoOperativo } from '../../lib/permisos';

export default function FichasEnviadasPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();

  const [fichas, setFichas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const puedeVer = tienePermisoOperativo(usuario);

  useEffect(() => {
    if (!usuario) return;
    if (!puedeVer) return; // ya no redirige — la pantalla en sí muestra el mensaje de acceso
    cargar();
  }, [usuario]);

  async function cargar() {
    setCargando(true);
    setErrorCarga('');
    try {
      const res = await fetch(`/api/fichas-enviadas?solicitanteEmail=${encodeURIComponent(usuario.email)}`);
      const r = await res.json();
      if (!res.ok || r.error) {
        setErrorCarga(r.error || 'No se pudieron cargar los datos.');
      } else {
        setFichas(r.fichas || []);
      }
    } catch (err) {
      setErrorCarga('No se pudo conectar con el servidor.');
    }
    setCargando(false);
  }

  if (!usuario) return null;

  const fichasFiltradas = fichas.filter((f) =>
    !busqueda.trim() || `${f.nombre} ${f.curso}`.toLowerCase().includes(busqueda.trim().toLowerCase())
  );

  const ahora = new Date();
  function diasSinInscribirse(fecha) {
    return Math.floor((ahora - new Date(fecha)) / 86400000);
  }
  function colorAlerta(dias) {
    if (dias >= 7) return 'bg-dangerBg text-dangerText';
    if (dias >= 3) return 'bg-warningBg text-warningText';
    return 'bg-surface2 text-textMuted';
  }
  const conAlerta = fichasFiltradas.filter((f) => diasSinInscribirse(f.fecha) >= 3);

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      {!puedeVer ? (
        <AccesoDenegado seccion="Fichas enviadas" />
      ) : (
      <div className="max-w-[1100px] mx-auto px-6 pb-16">
        <h3 className="text-lg font-bold mb-1">📄 Fichas enviadas</h3>
        <p className="text-textMuted text-xs mb-3">
          Todos los leads a los que se les marcó "Ficha enviada" como resultado, con fecha y quién la mandó.
        </p>

        {conAlerta.length > 0 && (
          <div className="bg-warningBg border border-warningText/30 rounded-xl px-4 py-2.5 mb-4">
            <p className="text-warningText text-sm font-semibold">
              ⚠️ {conAlerta.length} ficha{conAlerta.length !== 1 ? 's' : ''} enviada{conAlerta.length !== 1 ? 's' : ''} hace 3 días o más, sin inscribirse todavía
            </p>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="🔍 Buscar por nombre o curso…"
            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm w-64" />
          <p className="text-textMuted text-xs">{fichasFiltradas.length} de {fichas.length}</p>
        </div>

        {errorCarga ? (
          <div className="bg-dangerBg border border-dangerText/30 rounded-2xl p-6 text-center">
            <p className="text-dangerText text-sm font-semibold mb-3">⚠️ {errorCarga}</p>
            <button onClick={cargar} className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold">Reintentar</button>
          </div>
        ) : cargando ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : fichasFiltradas.length === 0 ? (
          <p className="text-textMuted text-sm">Sin resultados.</p>
        ) : (
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
            <div className="overflow-x-auto max-h-[750px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface z-10">
                  <tr className="text-textSec text-left border-b border-border">
                    <th className="py-2 pr-4 whitespace-nowrap">Lead</th>
                    <th className="pr-4 whitespace-nowrap">Curso</th>
                    <th className="pr-4 whitespace-nowrap">País</th>
                    <th className="pr-4 whitespace-nowrap">Lote</th>
                    <th className="pr-4 whitespace-nowrap">Fecha de envío</th>
                    <th className="pr-4 whitespace-nowrap">Sin inscribirse</th>
                    <th className="whitespace-nowrap">Enviada por</th>
                  </tr>
                </thead>
                <tbody>
                  {fichasFiltradas.map((f, i) => {
                    const dias = diasSinInscribirse(f.fecha);
                    return (
                      <tr key={`${f.leadId}-${i}`} className="border-b border-border">
                        <td className="py-2 pr-4 whitespace-nowrap">{f.nombre}</td>
                        <td className="pr-4 text-textSec whitespace-nowrap">{f.curso || '—'}</td>
                        <td className="pr-4 text-textSec whitespace-nowrap">{f.pais || '—'}</td>
                        <td className="pr-4 text-textSec whitespace-nowrap">Lote {f.lote}</td>
                        <td className="pr-4 whitespace-nowrap">{new Date(f.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="pr-4 whitespace-nowrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorAlerta(dias)}`}>
                            {dias <= 0 ? 'Hoy' : `${dias} día${dias !== 1 ? 's' : ''}`}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">{f.enviadaPor || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
