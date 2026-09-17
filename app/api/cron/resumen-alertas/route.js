import { NextResponse } from 'next/server';
import { readSheet } from '../../../../lib/sheets';
import { horasHabilesTranscurridas } from '../../../../lib/constants';
import { enviarMailResumenAlertas } from '../../../../lib/mailer';

const DESTINATARIOS = [
  'lourdes.barrantes@institutoilce.com',
  'Victoria.Defilippe@institutoilce.com',
  'sofia.salgueiro@institutoilce.com',
  'Macarena.Juncos@institutoilce.com'
];

// GET /api/cron/resumen-alertas
// Corre los viernes a las 8 AM (hora Argentina) — ver vercel.json ("0 11 * * 5", UTC).
// Misma lógica que la alerta "📩 Sin confirmar recepción" de /inscritos: Bienvenida o Alta en
// plataforma enviada hace 48hs hábiles o más, sin que el estudiante haya confirmado todavía.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const inscritos = await readSheet('Inscritos');

  const alertas = [];
  inscritos.forEach((i) => {
    const bienvenidaPendiente = i.BienvenidaEnviada === 'TRUE' && i.ConfirmoRecepcion !== 'TRUE' && i.FechaBienvenida
      && horasHabilesTranscurridas(i.FechaBienvenida) >= 48;
    const altaPendiente = i.AltaPlataforma === 'TRUE' && i.ConfirmoAlta !== 'TRUE' && i.FechaAlta
      && horasHabilesTranscurridas(i.FechaAlta) >= 48;

    if (bienvenidaPendiente) {
      alertas.push({ nombre: i.NombreEstudiante, curso: i.Curso, tipo: 'Bienvenida', horasHabiles: horasHabilesTranscurridas(i.FechaBienvenida) });
    } else if (altaPendiente) {
      alertas.push({ nombre: i.NombreEstudiante, curso: i.Curso, tipo: 'Alta en plataforma', horasHabiles: horasHabilesTranscurridas(i.FechaAlta) });
    }
  });

  try {
    await enviarMailResumenAlertas(DESTINATARIOS, alertas);
  } catch (err) {
    console.error('Error enviando resumen semanal de alertas:', err);
    return NextResponse.json({ error: 'No se pudo enviar el resumen' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, cantidadAlertas: alertas.length });
}
