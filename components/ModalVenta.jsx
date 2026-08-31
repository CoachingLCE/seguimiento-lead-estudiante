'use client';
import { useState, useEffect } from 'react';
import { MEDIOS_PAGO, EQUIPO_VENTAS } from '../lib/constants';

// Si alguien escribe "40.400" (como se escribe en Argentina, con punto de miles), un <input
// type="number"> lo interpreta SIEMPRE con el punto como separador DECIMAL (es un estándar de
// HTML, no cambia por idioma) — "40.400" pasa a ser matemáticamente 40,4. Por eso estos campos
// son de texto, y esta función sacar los puntos antes de guardar el valor como número.
function limpiarMonto(texto) {
  return texto.replace(/\./g, '');
}

export default function ModalVenta({ lead, onClose, onConfirm, usuarioActual }) {
  const opcionesCurso = lead
    ? [lead.Curso, ...(lead.CursosAdicionales || '').split(',').map((c) => c.trim())].filter(Boolean)
    : [];
  const [cursoVenta, setCursoVenta] = useState(lead?.Curso || '');
  const [medioPago, setMedioPago] = useState(MEDIOS_PAGO[0]);
  const [modalidad, setModalidad] = useState('cuotas');
  const [cantCuotas, setCantCuotas] = useState('');
  const [valorCuota, setValorCuota] = useState('');
  const [montoTotal, setMontoTotal] = useState('');
  const [becado, setBecado] = useState(false);
  const [cuotasVariables, setCuotasVariables] = useState(['', '']);
  const [emailEstudiante, setEmailEstudiante] = useState('');
  const [edicion, setEdicion] = useState('');
  const [vendidoPor, setVendidoPor] = useState(usuarioActual?.nombre || '');
  const [vendidoPorOtro, setVendidoPorOtro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [rangoDesde, setRangoDesde] = useState(1);
  const [rangoHasta, setRangoHasta] = useState(1);
  const [rangoValor, setRangoValor] = useState('');

  // Cada vez que se abre el modal para un lead distinto, resetea el formulario
  // (si no, quedarían pegados los valores del lead anterior).
  useEffect(() => {
    if (!lead) return;
    setCursoVenta(lead.Curso || '');
    setMedioPago(MEDIOS_PAGO[0]);
    setModalidad('cuotas');
    setCantCuotas('');
    setValorCuota('');
    setMontoTotal('');
    setBecado(false);
    setCuotasVariables(['', '']);
    setEmailEstudiante(lead.EmailEstudiante || '');
    setEdicion('');
    setVendidoPor(usuarioActual?.nombre || '');
    setVendidoPorOtro('');
    setError('');
  }, [lead?.ID]);

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
  // Completa de una todas las cuotas de un rango (ej: cuota 1 a 4 = $42.000 cada una) — así no
  // hace falta tipear cada cuota una por una cuando varias comparten el mismo valor.
  function agregarRangoCuotas() {
    if (!rangoValor || Number(rangoValor) <= 0 || rangoDesde > rangoHasta) return;
    setCuotasVariables((prev) => {
      const nuevo = [...prev];
      while (nuevo.length < rangoHasta) nuevo.push('');
      for (let i = rangoDesde - 1; i < rangoHasta; i++) nuevo[i] = rangoValor;
      return nuevo;
    });
    setRangoValor('');
    // Sigue proponiendo el próximo tramo, para cargar rápido varios rangos seguidos.
    const siguiente = rangoHasta < 12 ? rangoHasta + 1 : 12;
    setRangoDesde(siguiente);
    setRangoHasta(siguiente);
  }

  async function handleConfirm() {
    setError('');
    const esVariable = modalidad === 'cuotas-variables';
    const listaCuotas = esVariable ? cuotasVariables.filter((v) => v !== '' && Number(v) > 0) : [];

    // Venta 100% becada: no se cobra nada, así que se saltan todas las validaciones de monto
    // y se manda todo en cero, sin importar qué modalidad haya quedado seleccionada.
    if (!becado) {
      if (modalidad === 'totalidad' && (!montoTotal || Number(montoTotal) <= 0)) {
        setError('El Monto total es obligatorio.');
        return;
      }
      if (modalidad === 'cuotas' && (!cantCuotas || Number(cantCuotas) <= 0 || !valorCuota || Number(valorCuota) <= 0)) {
        setError('La Cantidad de cuotas y el Valor de cada cuota son obligatorios.');
        return;
      }
      if (esVariable && listaCuotas.length === 0) {
        setError('Ingresá al menos el valor de una cuota.');
        return;
      }
    }

    setEnviando(true);
    try {
      const montoTotalFinal = becado ? '0' : (esVariable
        ? listaCuotas.reduce((acc, v) => acc + Number(v), 0)
        : montoTotal);

      await onConfirm({
        leadId: lead.ID,
        cursoVenta,
        medioPago,
        modalidad: becado ? 'totalidad' : (esVariable ? 'cuotas' : modalidad),
        cantCuotas: becado ? '' : (esVariable ? listaCuotas.length : cantCuotas),
        valorCuota: becado ? '' : (esVariable ? '' : valorCuota),
        detalleCuotas: becado ? '' : (esVariable ? listaCuotas.join(', ') : ''),
        montoTotal: montoTotalFinal,
        emailEstudiante,
        edicion,
        vendidoPor: vendidoPor === 'Otro' ? vendidoPorOtro.trim() : vendidoPor
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-sm bg-surface2 border border-border rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-semibold">Marcar como venta</h3>
        <p className="text-textSec text-sm mb-4">{lead.Nombre} {lead.Apellido} · {lead.Curso}</p>

        {opcionesCurso.length > 1 && (
          <div className="mb-3">
            <label className="text-xs text-textSec block mb-1">
              Este lead marcó interés en varios cursos — ¿cuál es el de esta venta? <span className="text-dangerText">*</span>
            </label>
            <select value={cursoVenta} onChange={(e) => setCursoVenta(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm">
              {opcionesCurso.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        <label className="text-xs text-textSec block mb-1">Medio de pago</label>
        <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3">
          {MEDIOS_PAGO.map((m) => <option key={m}>{m}</option>)}
        </select>

        <label className="flex items-center gap-2 text-xs text-textSec mb-1 cursor-pointer bg-bg border border-border rounded-lg px-3 py-2">
          <input type="checkbox" checked={becado} onChange={(e) => setBecado(e.target.checked)} />
          🎓 Venta 100% becada (sin costo)
        </label>
        <p className="text-textMuted text-[11px] mb-3">
          {becado ? 'Se va a registrar con Monto total = $0, sin cuotas.' : '\u00A0'}
        </p>

        {!becado && (
          <>
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
              <label className="text-xs text-textSec block mb-1">Cantidad de cuotas <span className="text-dangerText">*</span></label>
              <input type="number" value={cantCuotas} onChange={(e) => setCantCuotas(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-textSec block mb-1">Valor de cada cuota <span className="text-dangerText">*</span></label>
              <input type="text" inputMode="numeric" value={valorCuota} onChange={(e) => setValorCuota(limpiarMonto(e.target.value))}
                placeholder="Ej: 40400"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        ) : modalidad === 'cuotas-variables' ? (
          <div className="mb-3">
            <label className="text-xs text-textSec block mb-1">Agregar cuotas por rango</label>
            <p className="text-textMuted text-[10.5px] mb-2">Para cuotas que se repiten en tramos (ej: cuota 1 a 4 = $42.000 cada una).</p>
            <div className="flex items-end gap-2 mb-3">
              <div>
                <span className="text-[10.5px] text-textMuted block mb-1">Cuota desde</span>
                <select value={rangoDesde} onChange={(e) => setRangoDesde(Number(e.target.value))}
                  className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm w-16">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <span className="text-[10.5px] text-textMuted block mb-1">Hasta</span>
                <select value={rangoHasta} onChange={(e) => setRangoHasta(Number(e.target.value))}
                  className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm w-16">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <span className="text-[10.5px] text-textMuted block mb-1">Valor de cada una</span>
                <input type="text" inputMode="numeric" value={rangoValor} onChange={(e) => setRangoValor(limpiarMonto(e.target.value))}
                  placeholder="Ej: 42000"
                  className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <button type="button" onClick={agregarRangoCuotas}
                className="text-xs px-3 py-1.5 rounded-lg bg-accentTeal/20 text-accentTeal font-semibold whitespace-nowrap">
                + Agregar rango
              </button>
            </div>

            <label className="text-xs text-textSec block mb-1">Valor de cada cuota, en orden <span className="text-dangerText">*</span></label>
            <div className="space-y-2">
              {cuotasVariables.map((valor, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-textMuted w-14">Cuota {i + 1}</span>
                  <input type="text" inputMode="numeric" value={valor} onChange={(e) => actualizarCuotaVariable(i, limpiarMonto(e.target.value))}
                    className="flex-1 bg-bg border border-border rounded-lg px-3 py-1.5 text-sm" />
                  {cuotasVariables.length > 1 && (
                    <button type="button" onClick={() => quitarCuotaVariable(i)} className="text-warningText text-xs">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={agregarCuotaVariable}
              className="text-accentTeal text-xs font-semibold mt-2">+ Agregar cuota individual</button>
            <p className="text-textMuted text-[11px] mt-2">
              Total: ${cuotasVariables.filter((v) => v !== '').reduce((acc, v) => acc + Number(v), 0).toLocaleString('es-AR')}
            </p>
          </div>
        ) : (
          <div className="mb-3">
            <label className="text-xs text-textSec block mb-1">Monto total <span className="text-dangerText">*</span></label>
            <input type="text" inputMode="numeric" value={montoTotal} onChange={(e) => setMontoTotal(limpiarMonto(e.target.value))}
              placeholder="Ej: 350000"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
        )}
          </>
        )}

        <label className="text-xs text-textSec block mb-1">Email del estudiante (para la bienvenida)</label>
        <input type="email" value={emailEstudiante} onChange={(e) => setEmailEstudiante(e.target.value)}
          placeholder="estudiante@mail.com"
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />

        <label className="text-xs text-textSec block mb-1">Edición (opcional, se puede completar después)</label>
        <input value={edicion} onChange={(e) => setEdicion(e.target.value)}
          placeholder="Ej: Edición 12"
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

        {error && (
          <p className="text-dangerText text-xs mb-2 bg-dangerBg rounded-lg px-3 py-2">⚠️ {error}</p>
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
