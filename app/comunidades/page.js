'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import AccesoDenegado from '../../components/AccesoDenegado';
import { useSession } from '../../lib/useSession';
import { tienePermisoComunidades } from '../../lib/permisos';
import { numeroDesdeSheet } from '../../lib/constants';

export default function ComunidadesPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();
  const [ventas, setVentas] = useState([]);
  const [totalInteresados, setTotalInteresados] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const puedeVer = usuario && tienePermisoComunidades(usuario);

  useEffect(() => {
    if (!puedeVer) return;
    fetch(`/api/comunidades?solicitanteEmail=${encodeURIComponent(usuario.email)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setVentas(d.ventas || []);
        setTotalInteresados(d.totalInteresados || 0);
      })
      .catch(() => setError('Ocurrió un error cargando los datos. Probá de nuevo.'))
      .finally(() => setCargando(false));
  }, [puedeVer, usuario?.email]);

  if (!usuario) return null;

  const esteMes = new Date().toISOString().slice(0, 7);
  const ventasEsteMes = ventas.filter((v) => (v.FechaVenta || '').slice(0, 7) === esteMes);
  const montoTotal = ventas.reduce((acc, v) => acc + numeroDesdeSheet(v.MontoTotal), 0);

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      {!puedeVer ? (
        <AccesoDenegado seccion="Comunidades" />
      ) : (
        <div className="max-w-[1100px] mx-auto px-6 pb-16">
          <h3 className="text-lg font-bold mb-1"> Comunidades</h3>
          <p className="text-textSec text-sm mb-5">Ventas reales del curso "Comunidades" — se toman directo de Leads, igual que cualquier otro curso.</p>

          {cargando ? (
            <p className="text-textMuted text-sm">Cargando…</p>
          ) : error ? (
            <p className="text-dangerText text-sm">{error}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <Stat label="Ventas totales" value={ventas.length} />
                <Stat label="Ventas este mes" value={ventasEsteMes.length} />
                <Stat label="Monto total" value={`$${montoTotal.toLocaleString('es-AR')}`} />
                <Stat label="Interesados sin comprar" value={totalInteresados} />
              </div>

              <div className="bg-surface border border-border rounded-2xl p-5">
                <p className="text-sm font-semibold mb-3"> Listado de ventas</p>
                {ventas.length === 0 ? (
                  <p className="text-textMuted text-sm">Sin ventas registradas todavía.</p>
                ) : (
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-surface z-10">
                        <tr className="text-textSec text-left border-b border-border">
                          <th className="py-2 pr-3 whitespace-nowrap">Estudiante</th>
                          <th className="pr-3 whitespace-nowrap">Edición</th>
                          <th className="pr-3 whitespace-nowrap">Vendedor</th>
                          <th className="pr-3 whitespace-nowrap">Monto</th>
                          <th className="whitespace-nowrap">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventas.map((l) => (
                          <tr key={l.ID} className="border-b border-border">
                            <td className="py-2 pr-3 whitespace-nowrap">
                              <Link href={`/buscador?leadId=${l.ID}`} className="hover:text-accentTeal hover:underline">
                                {l.Nombre} {l.Apellido}
                              </Link>
                            </td>
                            <td className="pr-3 text-textSec whitespace-nowrap">{l.Edicion || '—'}</td>
                            <td className="pr-3 text-textSec whitespace-nowrap">{l.VendidoPorNombre || '—'}</td>
                            <td className="pr-3 font-semibold text-successText whitespace-nowrap">
                              ${numeroDesdeSheet(l.MontoTotal).toLocaleString('es-AR')}
                            </td>
                            <td className="whitespace-nowrap">
                              {l.FechaVenta ? new Date(l.FechaVenta).toLocaleDateString('es-AR') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3.5">
      <p className="text-textSec text-[12px] mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
