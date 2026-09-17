import { NextResponse } from 'next/server';
import { obtenerFichasEnviadas } from '../../../../lib/fichasEnviadas';
import { enviarMailResumenFichasEnviadas } from '../../../../lib/mailer';

const DESTINATARIOS = [
  'Macarena.Juncos@institutoilce.com'
];

// GET /api/cron/resumen-fichas-enviadas
// Corre los viernes a las 8 AM (hora Argentina) — ver vercel.json ("0 11 * * 5", UTC).
// Mismos datos que /fichas-enviadas: leads a los que se les marcó "Ficha enviada" como
// resultado y todavía no compraron.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const fichas = await obtenerFichasEnviadas();
    await enviarMailResumenFichasEnviadas(DESTINATARIOS, fichas);
    return NextResponse.json({ ok: true, cantidadFichas: fichas.length });
  } catch (err) {
    console.error('Error enviando resumen semanal de fichas enviadas:', err);
    return NextResponse.json({ error: 'No se pudo enviar el resumen' }, { status: 500 });
  }
}
