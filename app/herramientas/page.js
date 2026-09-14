'use client';
import { useRouter } from 'next/navigation';
import {
  MessageSquare, Mail, Calendar, HardDrive, Sheet, Video, Archive,
  GraduationCap, Settings, HelpCircle, DollarSign, BookOpen, ClipboardCheck, MessageCircle
} from 'lucide-react';
import Nav from '../../components/Nav';
import { useSession } from '../../lib/useSession';

const ACCESOS_RAPIDOS = [
  { icono: MessageSquare, color: '#611f69', nombre: 'Slack', url: 'https://app.slack.com/client/T065ZV5C7FF' },
  { icono: Mail, color: '#ea4335', nombre: 'Gmail', url: 'https://gmail.com/' },
  { icono: Calendar, color: '#1a73e8', nombre: 'Google Calendar', url: 'https://calendar.google.com/' },
  { icono: HardDrive, color: '#0f9d58', nombre: 'Google Drive', url: 'https://drive.google.com/' },
  { icono: Sheet, color: '#0f9d58', nombre: 'Google Sheets', url: 'https://sheets.google.com/' },
  { icono: Video, color: '#2d8cff', nombre: 'Zoom', url: 'https://www.zoom.com/' },
  { icono: Archive, color: '#a855f7', nombre: 'Baúl IN HOUSE', url: 'https://www.coachingeducativolider.com/ba%C3%BAl-inhouse' }
];

const RECURSOS_INSTITUCIONALES = [
  { icono: GraduationCap, nombre: 'Volver al campus', url: 'https://campus.institutoilce.com/' },
  { icono: Settings, nombre: 'Admin Campus', url: 'https://campus.institutoilce.com/wp-admin/' },
  { icono: HelpCircle, nombre: 'Preguntas frecuentes estudiantes', url: 'https://www.coachingeducativolider.com/preguntas-frecuentes-estudiantes' },
  { icono: BookOpen, nombre: 'Manual académico', url: 'https://www.coachingeducativolider.com/manualacad%C3%A9mico' },
  { icono: BookOpen, nombre: 'Manual inscripciones', url: 'https://www.coachingeducativolider.com/manual-inscripciones' },
  { icono: BookOpen, nombre: 'Cronograma ILCE', url: 'https://ilce-productos-valores.vercel.app/' },
  { icono: ClipboardCheck, nombre: 'Evaluación Coaching Deportivo', url: 'https://www.coachingeducativolider.com/evaluaci%C3%B3nfinal-coachingdeportivo' },
  { icono: MessageCircle, nombre: 'Ver feedback de estudiantes', url: 'https://ilce-feedback.vercel.app/admin' }
];

function TarjetaAcceso({ h }) {
  const Icono = h.icono;
  return (
    <a href={h.url} target="_blank" rel="noopener noreferrer"
      className="bg-surface border border-border rounded-2xl px-5 py-4 flex items-center gap-3 transition-all
        hover:-translate-y-0.5 hover:border-accentPurple/40 hover:shadow-lg hover:shadow-accentPurple/10">
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${h.color}22` }}>
        <Icono size={20} style={{ color: h.color }} />
      </span>
      <p className="text-sm font-semibold">{h.nombre}</p>
    </a>
  );
}

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
        <h3 className="text-lg font-bold mb-1">⚡ Accesos rápidos</h3>
        <p className="text-textMuted text-xs mb-5">Herramientas que utilizás habitualmente. Se abren en una pestaña nueva.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          {ACCESOS_RAPIDOS.map((h) => <TarjetaAcceso key={h.nombre} h={h} />)}
        </div>

        <h3 className="text-sm font-bold mb-1">🔗 Recursos institucionales</h3>
        <p className="text-textMuted text-xs mb-4">Accesos a la plataforma y a los materiales de referencia del instituto.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {RECURSOS_INSTITUCIONALES.map((r) => (
            r.url ? (
              <TarjetaAcceso key={r.nombre} h={{ ...r, color: '#22d3ee' }} />
            ) : (
              <div key={r.nombre}
                className="bg-surface border border-border rounded-2xl px-5 py-4 flex items-center gap-3 opacity-50 cursor-not-allowed">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-surface2">
                  <r.icono size={20} className="text-textMuted" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-textMuted">{r.nombre}</p>
                  <p className="text-[10px] text-textMuted">🔒 Próximamente</p>
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
