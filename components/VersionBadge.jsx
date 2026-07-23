import { APP_VERSION, APP_UPDATED_AT } from '../lib/version';

export default function VersionBadge() {
  const fecha = new Date(APP_UPDATED_AT + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  return (
    <div className="fixed bottom-3 right-4 text-[11px] text-textMuted bg-surface2/80 border border-border rounded-full px-3 py-1 z-40 no-print">
      v{APP_VERSION} · Actualizado {fecha}
    </div>
  );
}
