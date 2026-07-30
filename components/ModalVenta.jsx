'use client';
import { useState } from 'react';
import { MEDIOS_PAGO, EQUIPO_VENTAS } from '../lib/constants';

export default function ModalVenta({ lead, onClose, onConfirm, usuarioActual }) {
  const [medioPago, setMedioPago] = useState(MEDIOS_PAGO[0]);
  const [modalidad, setModalidad] = useState('cuotas');
  const [cantCuotas, setCantCuotas] = useState('');
  const [valorCuota, setValorCuota] = useState('');
  const [montoTotal, setMontoTotal] = useState('');
  const [cuotasVariables, setCuotasVariables] = useState(['', '']);
  const [emailEstudiante, setEmailEstudiante] = useState('');
  const [edicion, setEdicion] = useState('');
  const [docentes, setDocentes] = useState('');
  const [vendidoPor, setVendidoPor] = useState(usuarioActual?.nombre || '');
  const [vendidoPorOtro, setVendidoPorOtro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!lead) return null;

  function actualizarCuotaVariable(i, valor) {
    setCuotasVariables((prev) => prev.map((v, idx) => (idx === i ? valor : v)));
  }
  function agregarCuotaVariable() {
    setCuotasVariables((prev) => [...prev, '']);
  }
  function quitarCuotaVariable(i) {
    setCuotasVariables((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleConfirm() {
    setEnviando(true);
    try {
      const esVariable = modalidad === 'cuotas-variables';
      const listaCuotas = esVariable ? cuotasVariables.filter((v) => v !== '') : [];
      const montoTotalFinal = esVariable
        ? listaCuotas.reduce((acc, v) => acc + Number(v), 0)
        : montoTotal;

      await onConfirm({
        leadId: lead.ID,
        medioPago,
        modalidad: esVariable ? 'cuotas' : modalidad,
        cantCuotas: esVariable ? listaCuotas.length : cantCuotas,
        valorCuota: esVariable ? '' : valorCuota,
        detalleCuotas: esVariable ? listaCuotas.join(', ') : '',
        montoTotal: esVariable ? montoTotalFinal : montoTotal,
        emailEstudiante,
        edicion,
        docentes,
        vendidoPor: vendidoPor === 'Otro' ? vendidoPorOtro.trim() : vendidoPor
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
            className={`flex-1 text-xs py-2 rounded-lg border ${modalidad === 'totalidad' ? 'border-accentTeal bg-infoBg' : 'border-border bg-bg text-textSec'}`}>
            Paga totalidad
          </button>
          <button type="button" onClick={() => setModalidad('cuotas')}
            className={`flex-1 text-xs py-2 rounded-lg border ${modalidad === 'cuotas' ? 'border-accentTeal bg-infoBg' : 'border-border bg-bg text-textSec'}`}>
            Cuotas iguales
          </button>
          <button type="button" onClick={() => setModalidad('cuotas-variables')}
            className={`flex-1 text-xs py-2 rounded-lg border ${modalidad === 'cuotas-variables' ? 'border-accentTeal bg-infoBg' : 'border-border bg-bg text-textSec'}`}>
            Cuotas variables
          </button>
        </div>

        {modalidad === 'cuotas-variables' && (
          <p className="text-textMuted text-[11px] mb-2">
            Para cuotas que aumentan progresivamente (ej: Coaching Ontológico Profesional) o con un valor especial en alguna cuota puntual.
          </p>
        )}

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
        ) : modalidad === 'cuotas-variables' ? (
          <div className="mb-3">
            <label className="text-xs text-textSec block mb-1">Valor de cada cuota, en orden</label>
            <div className="space-y-2">
              {cuotasVariables.map((valor, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-textMuted w-14">Cuota {i + 1}</span>
                  <input type="number" value={valor} onChange={(e) => actualizarCuotaVariable(i, e.target.value)}
                    className="flex-1 bg-bg border border-border rounded-lg px-3 py-1.5 text-sm" />
                  {cuotasVariables.length > 1 && (
                    <button type="button" onClick={() => quitarCuotaVariable(i)} className="text-warningText text-xs">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={agregarCuotaVariable}
              className="text-accentTeal text-xs font-semibold mt-2">+ Agregar cuota</button>
            <p className="text-textMuted text-[11px] mt-2">
              Total: ${cuotasVariables.filter((v) => v !== '').reduce((acc, v) => acc + Number(v), 0).toLocaleString('es-AR')}
            </p>
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

        <label className="text-xs text-textSec block mb-1">Quién cerró la venta</label>
        <select value={vendidoPor} onChange={(e) => setVendidoPor(e.target.value)}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-2">
          <option value="">Seleccioná…</option>
          {EQUIPO_VENTAS.map((p) => <option key={p} value={p}>{p}</option>)}
          <option value="Otro">Otro (escribir nombre)</option>
        </select>
        {vendidoPor === 'Otro' && (
          <input value={vendidoPorOtro} onChange={(e) => setVendidoPorOtro(e.target.value)}
            placeholder="Nombre de quién cerró la venta"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />
        )}

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
