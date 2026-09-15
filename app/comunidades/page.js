'use client';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import AccesoDenegado from '../../components/AccesoDenegado';
import { useSession } from '../../lib/useSession';
import { tienePermisoComunidades } from '../../lib/permisos';

export default function ComunidadesPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();

  if (!usuario) return null;
  const puedeVer = tienePermisoComunidades(usuario);

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      {!puedeVer ? (
        <AccesoDenegado seccion="Comunidades" />
      ) : (
        <div className="max-w-[900px] mx-auto px-6 pb-16">
          <h3 className="text-lg font-bold mb-1">🌐 Comunidades</h3>
          <div className="bg-surface border border-border rounded-2xl p-10 mt-6 text-center">
            <p className="text-4xl mb-3">🚧</p>
            <p className="text-base font-semibold mb-1">Próximamente</p>
            <p className="text-textMuted text-sm">Esta sección todavía está en construcción.</p>
          </div>
        </div>
      )}
    </div>
  );
}
