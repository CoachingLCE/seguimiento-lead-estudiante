'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { useSession } from '../../lib/useSession';
import { tienePermisoBajas } from '../../lib/permisos';

// Cada persona es un bloque separado por una línea en blanco, con campos "Etiqueta: valor"
// en cualquier orden — todos opcionales, con al menos uno para poder identificarla.
// Ej:
//   Nombre: María Agustina Roldán
//   Curso: Coaching de Equipos
//   Email: ag.roldan.est@gmail.com
//   WhatsApp: +54 9 11 1234-5678
//   Fecha: 12/08/2026
// Busca "Etiqueta: valor" en cualquier parte del texto, sin depender de que cada campo esté
// en su propia línea (por si se pega todo junto sin saltos). Cuando un campo que YA estaba
// completado en la persona actual vuelve a aparecer, se entiende que arrancó una persona nueva.
function heuristicaSinEtiquetas(bloque) {
  const entrada = { nombre: '', curso: '', email: '', whatsapp: '', fecha: '', motivo: '' };
  const lineas = bloque.split('\n').map((l) => l.trim()).filter(Boolean);
  const restantes = [];
  lineas.forEach((linea) => {
    const mFecha = linea.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
    const mEmail = linea.match(/[^\s]+@[^\s]+\.[^\s]+/);
    const mWpp = linea.match(/^[+]?[\d\s\-()]{8,}$/);
    if (mFecha && !entrada.fecha) {
      entrada.fecha = new Date(Number(mFecha[3]), Number(mFecha[2]) - 1, Number(mFecha[1])).toISOString();
    } else if (mEmail && !entrada.email) {
      entrada.email = mEmail[0];
    } else if (mWpp && !entrada.whatsapp) {
      entrada.whatsapp = linea;
    } else if (!entrada.nombre) {
      entrada.nombre = linea.replace(/^[(\-•]+|[)\-]+$/g, '').trim();
    } else {
      restantes.push(linea.replace(/^[(\-•]+|[)\-]+$/g, '').trim());
    }
  });
  if (restantes.length > 0) entrada.curso = restantes.join(' ');
  return entrada;
}

function parsearBloquesBajas(texto) {
  const patron = /(nombre|curso|e[-\s]?mail|whatsapp|wpp|tel[eé]?fono?|fecha|motivo)\s*:\s*([\s\S]*?)(?=(?:nombre|curso|e[-\s]?mail|whatsapp|wpp|tel[eé]?fono?|fecha|motivo)\s*:|$)/gi;
  const entradas = [];
  let actual = null;
  let match;
  while ((match = patron.exec(texto)) !== null) {
    const etiqueta = match[1].toLowerCase().replace(/[\s-]/g, '');
    const valor = match[2].replace(/\n+/g, ' ').trim();
    if (!valor) continue;
    let campo = null;
    if (etiqueta.startsWith('nombre')) campo = 'nombre';
    else if (etiqueta.startsWith('curso')) campo = 'curso';
    else if (etiqueta.startsWith('email') || etiqueta.startsWith('mail')) campo = 'email';
    else if (etiqueta.startsWith('whatsapp') || etiqueta.startsWith('wpp') || etiqueta.startsWith('tel')) campo = 'whatsapp';
    else if (etiqueta.startsWith('fecha')) campo = 'fecha';
    else if (etiqueta.startsWith('motivo')) campo = 'motivo';
    if (!campo) continue;

    if (!actual || actual[campo]) {
      if (actual) entradas.push(actual);
      actual = { nombre: '', curso: '', email: '', whatsapp: '', fecha: '', motivo: '' };
    }
    if (campo === 'fecha') {
      const [d, m, y] = valor.split(/[/\-]/);
      actual.fecha = d && m && y ? new Date(Number(y), Number(m) - 1, Number(d)).toISOString() : '';
    } else {
      actual[campo] = valor;
    }
  }
  if (actual) entradas.push(actual);

  // Si no se detectó NINGUNA etiqueta en todo el texto, se cae a la heurística por bloque
  // (separado por línea en blanco), igual que si no hubiera escrito "Nombre:", "Fecha:", etc.
  if (entradas.length === 0) {
    const bloques = texto.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    bloques.forEach((bloque) => entradas.push(heuristicaSinEtiquetas(bloque)));
  }

  entradas.forEach((e) => { if (!e.fecha) e.fecha = new Date().toISOString(); });
  return entradas;
}

export default function BajasPage() {
  const { usuario, logout } = useSession();
  const router = useRouter();

  const [textoBajasMasivas, setTextoBajasMasivas] = useState('');
  const previewBajas = useMemo(
    () => (textoBajasMasivas.trim() ? parsearBloquesBajas(textoBajasMasivas) : []),
    [textoBajasMasivas]
  );
  const [cargandoBajasMasivas, setCargandoBajasMasivas] = useState(false);
  const [resultadoBajasMasivas, setResultadoBajasMasivas] = useState(null);
  const [mostrarListaBajas, setMostrarListaBajas] = useState(false);
  const [listaBajas, setListaBajas] = useState([]);
  const [enviandoMensajeId, setEnviandoMensajeId] = useState(null);
  const [seleccionadas, setSeleccionadas] = useState(new Set());
  const [eliminando, setEliminando] = useState(false);

  async function eliminarBajas(leadIds) {
    setEliminando(true);
    await fetch('/api/seguimiento/baja-masiva', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadIds, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setEliminando(false);
    setSeleccionadas(new Set());
    cargarListaBajas(true);
  }

  if (usuario && !tienePermisoBajas(usuario)) {
    router.push('/dashboard');
    return null;
  }

  async function cargarBajasMasivas() {
    setCargandoBajasMasivas(true);
    const entradas = parsearBloquesBajas(textoBajasMasivas);
    try {
      const res = await fetch('/api/seguimiento/baja-masiva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entradas, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
      });
      const r = await res.json();
      if (!res.ok) {
        setResultadoBajasMasivas({ procesados: [], creados: [], noEncontrados: [], yaExistentes: [], ambiguos: [], errores: [r.error || 'Error desconocido del servidor'] });
      } else {
        setResultadoBajasMasivas(r);
        setTextoBajasMasivas('');
        if (mostrarListaBajas) cargarListaBajas(true);
      }
    } catch (err) {
      setResultadoBajasMasivas({ procesados: [], creados: [], noEncontrados: [], yaExistentes: [], ambiguos: [], errores: ['No se pudo conectar con el servidor. Probá de nuevo.'] });
    }
    setCargandoBajasMasivas(false);
  }

  useEffect(() => {
    if (usuario) cargarDatosBajas();
  }, [usuario]);

  async function cargarDatosBajas() {
    const r = await fetch(`/api/seguimiento/baja-masiva?solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((res) => res.json());
    setListaBajas(r.bajas || []);
  }

  async function cargarListaBajas(forzarAbrir) {
    if (!forzarAbrir && mostrarListaBajas) { setMostrarListaBajas(false); return; }
    await cargarDatosBajas();
    setMostrarListaBajas(true);
  }

  async function enviarMensaje1(baja) {
    setEnviandoMensajeId(baja.leadId);
    const res = await fetch('/api/bajas/enviar-mensaje', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: baja.leadId, solicitanteEmail: usuario.email, solicitanteNombre: usuario.nombre })
    });
    setEnviandoMensajeId(null);
    if (res.ok) { cargarDatosBajas(); }
    else { const r = await res.json(); alert(r.error || 'No se pudo enviar el mensaje'); }
  }

  if (!usuario) return null;

  return (
    <div>
      <Nav usuario={usuario} onLogout={() => { logout(); router.push('/'); }} />
      <div className="max-w-[900px] mx-auto px-6 pb-16">
        <h3 className="text-lg font-bold mb-1">🔴 Bajas</h3>
        <p className="text-textMuted text-xs mb-5">
          Registrá cuando un estudiante se da de baja de la cursada. A los 90 días, reaparece en el
          "LOTE BAJAS" de Seguimiento para ofrecerle volver a información y ver si se reincorpora.
        </p>

        {/* LISTAS PARA RECONTACTAR: a los 85 días de la baja, se habilita mandar un mail de
            reactivación con un botón que lleva a WhatsApp — antes de que a los 90 días aparezca
            en el Lote Bajas de Seguimiento para contacto directo. */}
        <SeccionRecontactar listaBajas={listaBajas} enviandoMensajeId={enviandoMensajeId} onEnviar={enviarMensaje1} />

        <div className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-sm font-semibold mb-1">Cargar bajas</p>
          <p className="text-textMuted text-xs mb-3">
            Un bloque por persona, separados por una línea en blanco. Poné lo que tengas (todo opcional, con al
            menos un dato para identificarla): Nombre, Curso, Email, WhatsApp, Fecha, Motivo.
            Se busca primero por Email, si no hay por WhatsApp, si no hay por Nombre (+Curso si hay más de una
            persona con ese nombre). Si no existe todavía en el sistema, se crea un registro mínimo (con lo que
            hayas puesto) y se le registra la baja igual.
          </p>
          <textarea rows={8} value={textoBajasMasivas} onChange={(e) => setTextoBajasMasivas(e.target.value)}
            placeholder={'Nombre: María Agustina Roldán\nCurso: Coaching de Equipos\nEmail: ag.roldan.est@gmail.com\nWhatsApp: +54 9 11 1234-5678\nFecha: 12/08/2026\n\nNombre: Otra Persona\nEmail: otra@mail.com'}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono mb-2" />

          {textoBajasMasivas.trim() && (
            <div className="mb-3 space-y-2">
              <p className="text-textMuted text-[11px]">👀 Se van a cargar {previewBajas.length} persona{previewBajas.length !== 1 ? 's' : ''}:</p>
              {previewBajas.map((p, i) => (
                <div key={i} className="bg-bg border border-border rounded-lg p-2.5 text-[12px] flex flex-wrap gap-x-4 gap-y-1">
                  <span className={p.nombre ? 'text-successText' : 'text-dangerText'}>{p.nombre ? '✓' : '✗'} Nombre{p.nombre ? `: ${p.nombre}` : ' (falta)'}</span>
                  <span className={p.curso ? 'text-successText' : 'text-textMuted'}>{p.curso ? '✓' : '○'} Curso{p.curso ? `: ${p.curso}` : ''}</span>
                  <span className={p.email ? 'text-successText' : 'text-textMuted'}>{p.email ? '✓' : '○'} Email{p.email ? `: ${p.email}` : ''}</span>
                  <span className={p.whatsapp ? 'text-successText' : 'text-textMuted'}>{p.whatsapp ? '✓' : '○'} WhatsApp{p.whatsapp ? `: ${p.whatsapp}` : ''}</span>
                  <span className="text-infoText">📅 {new Date(p.fecha).toLocaleDateString('es-AR')}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={cargarBajasMasivas} disabled={cargandoBajasMasivas || !textoBajasMasivas.trim()}
            className="text-sm px-4 py-2 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-50 mb-3">
            {cargandoBajasMasivas ? 'Cargando…' : 'Cargar bajas'}
          </button>

          {resultadoBajasMasivas && (
            <div className="bg-bg border border-border rounded-lg p-3 mb-3 text-sm space-y-1">
              {resultadoBajasMasivas.procesados.length > 0 && (
                <p className="text-successText">✓ Registradas: {resultadoBajasMasivas.procesados.join(', ')}</p>
              )}
              {resultadoBajasMasivas.creados?.length > 0 && (
                <p className="text-infoText">🆕 No existían en el sistema, se crearon y se les registró la baja: {resultadoBajasMasivas.creados.join(', ')}</p>
              )}
              {resultadoBajasMasivas.yaExistentes.length > 0 && (
                <p className="text-warningText">⚠️ Ya tenían una baja registrada: {resultadoBajasMasivas.yaExistentes.join(', ')}</p>
              )}
              {resultadoBajasMasivas.ambiguos?.length > 0 && (
                <p className="text-warningText">⚠️ Ambiguos, precisá más datos: {resultadoBajasMasivas.ambiguos.join(' · ')}</p>
              )}
              {resultadoBajasMasivas.errores?.length > 0 && (
                <p className="text-dangerText">🛑 Error al procesar: {resultadoBajasMasivas.errores.join(' · ')}</p>
              )}
              {resultadoBajasMasivas.noEncontrados.length > 0 && (
                <p className="text-dangerText">✗ No encontrados (o no son estudiantes con venta confirmada): {resultadoBajasMasivas.noEncontrados.join(', ')}</p>
              )}
            </div>
          )}

          <button onClick={() => cargarListaBajas()} className="text-xs text-accentTeal font-semibold mb-2">
            {mostrarListaBajas ? '▲ Ocultar' : '▼ Ver'} todas las bajas registradas (incluye las que todavía están esperando)
          </button>
          {mostrarListaBajas && (
            <>
            {seleccionadas.size > 0 && (
              <div className="flex items-center justify-between bg-warningBg border border-warningText/30 rounded-lg px-3 py-2 mb-2">
                <p className="text-warningText text-xs font-semibold">{seleccionadas.size} seleccionada{seleccionadas.size !== 1 ? 's' : ''}</p>
                <button onClick={() => eliminarBajas([...seleccionadas])} disabled={eliminando}
                  className="text-xs px-3 py-1 rounded bg-dangerText text-white font-semibold disabled:opacity-60">
                  {eliminando ? 'Eliminando…' : '🗑 Eliminar seleccionadas'}
                </button>
              </div>
            )}
            <div className="bg-bg border border-border rounded-lg p-3 max-h-72 overflow-y-auto">
              {listaBajas.length === 0 ? (
                <p className="text-textMuted text-xs">Sin bajas registradas todavía.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-textSec text-left border-b border-border">
                      <th className="py-1.5 w-6">
                        <input type="checkbox"
                          checked={listaBajas.length > 0 && seleccionadas.size === listaBajas.length}
                          onChange={(e) => setSeleccionadas(e.target.checked ? new Set(listaBajas.map((b) => b.leadId)) : new Set())} />
                      </th>
                      <th>Nombre</th><th>Curso</th><th>Fecha baja</th>
                      <th>Acción 1 — Día 85: envío de mail</th>
                      <th>Acción 2 — Día 90: WhatsApp por lote</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaBajas.map((b) => (
                      <tr key={b.leadId} className="border-b border-border">
                        <td className="py-1.5">
                          <input type="checkbox" checked={seleccionadas.has(b.leadId)}
                            onChange={() => setSeleccionadas((prev) => {
                              const nuevo = new Set(prev);
                              nuevo.has(b.leadId) ? nuevo.delete(b.leadId) : nuevo.add(b.leadId);
                              return nuevo;
                            })} />
                        </td>
                        <td>{b.nombre}</td>
                        <td>{b.curso}</td>
                        <td>{new Date(b.fechaBaja).toLocaleDateString('es-AR')}</td>
                        <td>
                          {b.confirmoRecepcionBaja ? (
                            <span className="text-successText">✅ Confirmó recepción</span>
                          ) : b.mensajeEnviado ? (
                            <span className="text-textMuted">Enviado el {new Date(b.fechaMensajeEnviado).toLocaleDateString('es-AR')}</span>
                          ) : b.listaParaReactivacion ? (
                            <span className="text-warningText">Listo para enviar</span>
                          ) : (
                            <span className="text-textMuted">Faltan {85 - Math.floor((new Date() - new Date(b.fechaBaja)) / 86400000)} días</span>
                          )}
                        </td>
                        <td>
                          {b.contactado ? <span className="text-successText">Contactado</span>
                            : b.disponibleAhora ? <span className="text-warningText">En Lote Bajas</span>
                            : <span className="text-textMuted">Faltan {b.diasFaltantes} días</span>}
                        </td>
                        <td>
                          <button onClick={() => eliminarBajas([b.leadId])} disabled={eliminando}
                            className="text-dangerText text-xs disabled:opacity-60">🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SeccionRecontactar({ listaBajas, enviandoMensajeId, onEnviar }) {
  const paraRecontactar = listaBajas.filter((b) => b.listaParaReactivacion);
  if (paraRecontactar.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
      <p className="text-sm font-semibold mb-1">📬 Listas para recontactar ({paraRecontactar.length})</p>
      <p className="text-textMuted text-xs mb-3">
        Ya pasaron 85 días desde la baja — se puede mandar un mail de reactivación con un botón que lleva a WhatsApp.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-textSec text-left border-b border-border">
              <th className="py-2 pr-3">Fecha de baja</th>
              <th className="pr-3">Estudiante</th>
              <th className="pr-3">Curso</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {paraRecontactar.map((b) => (
              <tr key={b.leadId} className="border-b border-border">
                <td className="py-2 pr-3 whitespace-nowrap">{new Date(b.fechaBaja).toLocaleDateString('es-AR')}</td>
                <td className="pr-3">{b.nombre}</td>
                <td className="pr-3 text-textSec">{b.curso}</td>
                <td>
                  {b.confirmoRecepcionBaja ? (
                    <span className="text-successText text-xs font-semibold">✅ Confirmó recepción y solicitó info</span>
                  ) : b.mensajeEnviado ? (
                    <span className="text-textMuted text-xs">
                      Mensaje enviado el {new Date(b.fechaMensajeEnviado).toLocaleDateString('es-AR')} — esperando respuesta
                    </span>
                  ) : !b.email ? (
                    <span className="text-warningText text-xs">Sin email cargado</span>
                  ) : (
                    <button onClick={() => onEnviar(b)} disabled={enviandoMensajeId === b.leadId}
                      className="text-xs px-3 py-1.5 rounded-lg bg-accentPurple text-white font-semibold disabled:opacity-60">
                      {enviandoMensajeId === b.leadId ? 'Enviando…' : 'Enviar mensaje 1'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
