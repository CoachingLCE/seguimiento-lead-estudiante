'use client';
import { useState } from 'react';
import { MEDIOS_PAGO } from '../lib/constants';

export default function ModalVenta({ lead, onClose, onConfirm }) {
  const [medioPago, setMedioPago] = useState(MEDIOS_PAGO[0]);
  const [modalidad, setModalidad] = useState('cuotas');
  const [cantCuotas, setCantCuotas] = useState('');
  const [valorCuota, setValorCuota] = useState('');
  const [montoTotal, setMontoTotal] = useState('');
  const [emailEstudiante, setEmailEstudiante] = useState('');
  const [edicion, setEdicion] = useState('');
  const [docentes, setDocentes] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!lead) return null;

  async function handleConfirm() {
    setEnviando(true);
    try {
      await onConfirm({
        leadId: lead.ID,
        medioPago,
        modalidad,
        cantCuotas,
        valorCuota,
        montoTotal,
        emailEstudiante,
        edicion,
        docentes
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-sm bg-surface2 border border-border rounded-2xl p-6">
        <h3 className="text-base font-semibold">Marcar como venta</h3>
        <p className="text-textSec text-sm mb-4">{lead.Nombre} {lead.Apellido} · {lead.Curso}</p>

        <label className="text-xs text-textSec block mb-1">Medio de pago</label>
        <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3">
          {MEDIOS_PAGO.map((m) => <option key={m}>{m}</option>)}
        </select>

        <label className="text-xs text-textSec block mb-1">Modalidad</label>
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => setModalidad('totalidad')}
            className={`flex-1 text-sm py-2 rounded-lg border ${modalidad === 'totalidad' ? 'border-accentTeal bg-infoBg' : 'border-border bg-bg text-textSec'}`}>
            Paga totalidad
          </button>
          <button type="button" onClick={() => setModalidad('cuotas')}
            className={`flex-1 text-sm py-2 rounded-lg border ${modalidad === 'cuotas' ? 'border-accentTeal bg-infoBg' : 'border-border bg-bg text-textSec'}`}>
            Paga en cuotas
          </button>
        </div>

        {modalidad === 'cuotas' ? (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-textSec block mb-1">Cantidad de cuotas</label>
              <input type="number" value={cantCuotas} onChange={(e) => setCantCuotas(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-textSec block mb-1">Valor de cada cuota</label>
              <input type="number" value={valorCuota} onChange={(e) => setValorCuota(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <label className="text-xs text-textSec block mb-1">Monto total</label>
            <input type="number" value={montoTotal} onChange={(e) => setMontoTotal(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
        )}

        <label className="text-xs text-textSec block mb-1">Email del estudiante (para la bienvenida)</label>
        <input type="email" value={emailEstudiante} onChange={(e) => setEmailEstudiante(e.target.value)}
          placeholder="estudiante@mail.com"
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />

        <label className="text-xs text-textSec block mb-1">Edición (opcional, se puede completar después)</label>
        <input value={edicion} onChange={(e) => setEdicion(e.target.value)}
          placeholder="Ej: Edición 12"
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />

        <label className="text-xs text-textSec block mb-1">Docente(s) de la edición (opcional, se puede completar después)</label>
        <input value={docentes} onChange={(e) => setDocentes(e.target.value)}
          placeholder="Ej: Anita Vuono, Gisela Reyes"
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />

        <div className="flex gap-2 mt-2">
          <button onClick={onClose} className="flex-1 bg-surface2 border border-border rounded-lg py-2 text-sm">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={enviando}
            className="flex-1 bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-60">
            {enviando ? 'Guardando…' : 'Confirmar venta'}
          </button>
        </div>
      </div>
    </div>
  );
}
