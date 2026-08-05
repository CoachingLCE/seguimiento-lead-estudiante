'use client';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { useSession } from '../../lib/useSession';

const HERRAMIENTAS = [
  { icono: '💬', nombre: 'Slack', url: 'https://app.slack.com/client/T065ZV5C7FF' },
  { icono: '📧', nombre: 'Gmail', url: 'https://gmail.com/' },
  { icono: '📅', nombre: 'Google Calendar', url: 'https://calendar.google.com/' },
  { icono: '📄', nombre: 'Google Drive', url: 'https://drive.google.com/' },
  { icono: '📑', nombre: 'Google Sheets', url: 'https://sheets.google.com/' },
  { icono: '🎥', nombre: 'Zoom', url: 'https://www.zoom.com/' },
  { icono: '🗄️', nombre: 'Baúl IN HOUSE', url: 'https://www.coachingeducativolider.com/ba%C3%BAl-inhouse' }
];

export default function HerramientasPage() {
  const { usuario, cargando, logout } = useSession();
  const router = useRouter();

  if (cargando) return null;
  if (!usuario) {
    if (typeof window !== 'undefined') router.push('/');
    return null;
  }

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <h3 className="text-lg font-bold mb-1">⚡ Herramientas de trabajo</h3>
        <p className="text-textMuted text-xs mb-5">Accesos rápidos — se abren en una pestaña nueva.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {HERRAMIENTAS.map((h) => (
            <a key={h.nombre} href={h.url} target="_blank" rel="noopener noreferrer"
              className="bg-surface border border-border rounded-2xl p-5 text-center transition-all
                hover:-translate-y-0.5 hover:border-accentPurple/40 hover:shadow-lg hover:shadow-accentPurple/10">
              <p className="text-3xl mb-2">{h.icono}</p>
              <p className="text-sm font-semibold">{h.nombre}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
