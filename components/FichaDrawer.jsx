'use client';
import { useEffect, useState } from 'react';

// Mapea el texto de la acción de auditoría a un ícono representativo para el timeline.
function iconoPara(accion) {
  const a = (accion || '').toLowerCase();
  if (a.includes('creó un lead')) return '📩';
  if (a.includes('venta')) return '💰';
  if (a.includes('alumno creado')) return '🤖';
  if (a.includes('alta en plataforma') || a.includes('alta')) return '🎓';
  if (a.includes('bienvenida')) return '👋';
  if (a.includes('diploma') || a.includes('abon')) return '📄';
  if (a.includes('contraseñ')) return '🔑';
  if (a.includes('curso') || a.includes('reasign') || a.includes('asignó')) return '✏️';
  if (a.includes('resultado') || a.includes('contact')) return '📞';
  return '•';
}

export default function FichaDrawer({ leadId, usuario, onClose }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!leadId) return;
    setCargando(true);
    setDatos(null);
    fetch(`/api/buscador?leadId=${encodeURIComponent(leadId)}&solicitanteEmail=${encodeURIComponent(usuario.email)}`)
      .then((r) => r.json())
      .then((d) => { setDatos(d); setCargando(false); });
  }, [leadId]);

  if (!leadId) return null;

  const lead = datos?.lead;
  const eventos = (datos?.historial || []).map((h) => ({
    fecha: h.Fecha,
    accion: h.Accion,
    detalle: h.Detalle,
    automatico: h.UsuarioNombre === 'Sistema (automático)'
  }));

  return (
    <div className="fixed inset-0 z-[70]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute top-0 right-0 h-full w-full max-w-[420px] bg-surface2 border-l border-border overflow-y-auto p-5">
        <button onClick={onClose} className="absolute top-4 right-4 text-textMuted hover:text-text text-lg">✕</button>

        {cargando ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : !lead ? (
          <p className="text-textSec text-sm">No se encontró información para este lead.</p>
        ) : (
          <>
            <h3 className="text-base font-bold pr-6">{lead.Nombre} {lead.Apellido}</h3>
            <p className="text-textSec text-xs mb-4">
              {lead.Curso || 'Sin curso definido'} · {lead.WhatsApp} · Ingresó {new Date(lead.FechaIngreso).toLocaleDateString('es-AR')}
            </p>

            <div className="flex items-center gap-2 mb-4">
              {lead.WhatsApp && (
                <a href={`https://wa.me/${lead.WhatsApp.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-md bg-surface border border-border">💬 WhatsApp</a>
              )}
              {lead.EmailEstudiante && (
                <a href={`mailto:${lead.EmailEstudiante}`}
                  className="text-xs px-3 py-1.5 rounded-md bg-surface border border-border">✉ Email</a>
              )}
              <span className={`ml-auto text-[10.5px] px-2.5 py-1 rounded-full font-semibold ${
                lead.Estado === 'Comprado' ? 'bg-successBg text-successText' : 'bg-warningBg text-warningText'
              }`}>
                {lead.Estado}
              </span>
            </div>

            {lead.Estado === 'Comprado' && (
              <div className="bg-surface border border-border rounded-xl p-3 mb-4 text-xs">
                <p className="font-bold mb-1.5">Detalle de la venta</p>
                <p className="text-textSec">{lead.MedioPago} · {lead.Modalidad} · ${Number(lead.MontoTotal || 0).toLocaleString('es-AR')}</p>
                {lead.DetalleCuotas && <p className="text-textMuted">Cuotas: ${lead.DetalleCuotas}</p>}
                {lead.VendidoPorNombre && <p className="text-textSec">Cerrada por: {lead.VendidoPorNombre}</p>}
              </div>
            )}

            <p className="text-xs font-bold mb-3">Historial académico completo</p>
            {eventos.length === 0 ? (
              <p className="text-textMuted text-xs mb-4">Todavía no hay eventos registrados para este lead.</p>
            ) : (
              <div className="relative pl-6 mb-4">
                <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border" />
                {eventos.map((ev, i) => (
                  <div key={i} className="relative pb-3.5 last:pb-0">
                    <div className={`absolute -left-6 top-0 w-6 h-6 rounded-full bg-surface border-2 flex items-center justify-center text-xs ${
                      ev.automatico ? 'border-infoText' : 'border-accentTeal'
                    }`}>
                      {iconoPara(ev.accion)}
                    </div>
                    <p className="text-textMuted text-[10.5px]">{new Date(ev.fecha).toLocaleString('es-AR')}</p>
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      {ev.accion}
                      {ev.automatico && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-infoBg text-infoText uppercase tracking-wide">
                          Automático
                        </span>
                      )}
                    </p>
                    {ev.detalle && <p className="text-textSec text-[11px]">{ev.detalle}</p>}
                  </div>
                ))}
              </div>
            )}

            {datos.inscrito && (
              <div className="bg-surface border border-border rounded-xl p-3 mb-4 text-xs">
                <p className="font-bold mb-1.5">Estado como estudiante</p>
                <p className="text-textSec">Alta en plataforma: {datos.inscrito.AltaPlataforma === 'TRUE' ? '✅ Hecha' : '⬜ Pendiente'}</p>
                <p className="text-textSec">Bienvenida: {datos.inscrito.BienvenidaEnviada === 'TRUE' ? '✓ Enviada' : '⬜ Pendiente'}</p>
                {datos.inscrito.Docentes && <p className="text-textSec">Docente(s): {datos.inscrito.Docentes}</p>}
                <p className="text-textSec">Diploma habilitado: {datos.inscrito.AbonoTotalidad === 'TRUE' ? '✅ Sí' : '⬜ No, falta abonar la totalidad'}</p>
              </div>
            )}

            {lead.NotasInternas && (
              <div className="bg-surface border border-border rounded-xl p-3 text-xs">
                <p className="font-bold mb-1">Notas internas</p>
                <p className="text-textSec">{lead.NotasInternas}</p>
              </div>
            )}

            <a href={`/buscador?leadId=${lead.ID}`}
              className="block text-center text-accentTeal text-xs font-semibold mt-4">
              Ver ficha completa (venta, notas, editar) →
            </a>
          </>
        )}
      </div>
    </div>
  );
}
