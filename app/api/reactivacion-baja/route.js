import { NextResponse } from 'next/server';
import { readSheet, updateRow } from '../../../lib/sheets';

const TELEFONO_WHATSAPP = '5491163245246';
const MENSAJE_WHATSAPP = 'Hola, me di de baja hace un tiempo y quería recibir información para retomar la cursada.';

// GET /api/reactivacion-baja?id=<leadId> -> pensado para que lo abra el estudiante desde el mail,
// sin login. Marca "Confirmó recepción y solicitó info" en la baja de ese lead, y redirige a
// WhatsApp con el mensaje ya precargado — el link de WhatsApp nunca cambia, pero antes de llegar
// ahí queda registrado que la persona lo tocó.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('id');
  const urlWhatsapp = `https://api.whatsapp.com/send?phone=${TELEFONO_WHATSAPP}&text=${encodeURIComponent(MENSAJE_WHATSAPP)}`;

  if (!leadId) return NextResponse.redirect(urlWhatsapp);

  try {
    const seguimiento = await readSheet('Seguimiento');
    const fila = seguimiento.find((s) => s.LeadID === leadId && s.Lote === 'baja');
    if (fila && fila.ConfirmoRecepcionBaja !== 'TRUE') {
      await updateRow('Seguimiento', fila._rowIndex, [
        fila.LeadID, fila.Lote, fila.FechaVence, fila.AsignadoAEmail, fila.AsignadoANombre,
        fila.Contactado, fila.Resultado, fila.FechaContacto, fila.Observaciones, fila.ProximaAccion,
        fila.FechaProgramada, fila.ContactadoPorNombre, fila.MensajeReactivacionEnviado || '', 'TRUE'
      ]);
    }
  } catch (err) {
    console.error('Error marcando confirmación de reactivación de baja:', err);
    // Aunque falle el registro, no le rompemos la experiencia al estudiante — lo mandamos a
    // WhatsApp igual.
  }

  return NextResponse.redirect(urlWhatsapp);
}
