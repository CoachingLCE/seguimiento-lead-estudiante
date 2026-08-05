'use client';
import { useTheme } from '../lib/ThemeContext';

const OPCIONES = [
  { valor: 'claro', icono: '☀️', titulo: 'Modo claro' },
  { valor: 'oscuro', icono: '🌙', titulo: 'Modo oscuro' },
  { valor: 'auto', icono: '🕒', titulo: 'Automático (según la hora)' }
];

export default function ThemeSelector() {
  const { preferencia, cambiarPreferencia } = useTheme();

  return (
    <div className="flex items-center gap-1 bg-surface2 border border-border rounded-lg p-0.5">
      {OPCIONES.map((o) => (
        <button
          key={o.valor}
          type="button"
          title={o.titulo}
          onClick={() => cambiarPreferencia(o.valor)}
          className={`w-7 h-7 flex items-center justify-center rounded-md text-xs transition-colors ${
            preferencia === o.valor ? 'bg-accentPurple text-white' : 'text-textMuted hover:text-text'
          }`}
        >
          {o.icono}
        </button>
      ))}
    </div>
  );
}
