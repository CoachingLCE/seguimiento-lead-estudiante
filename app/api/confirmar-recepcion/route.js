import { NextResponse } from 'next/server';
import { readSheet, updateRow } from '../../../lib/sheets';
import { registrarAccion } from '../../../lib/auditoria';
import nodemailer from 'nodemailer';

const NOMBRE_TIPO = { bienvenida: 'Bienvenida', alta: 'Alta en plataforma' };

// POST /api/confirmar-recepcion -> { id, tipo } — sin login, lo llama el estudiante desde el mail.
export async function POST(request) {
  const body = await request.json();
  const inscritos = await readSheet('Inscritos');
  const fila = inscritos.find((i) => i.ID === body.id);
  if (!fila) {
    return NextResponse.json({ error: 'No encontramos ese registro' }, { status: 404 });
  }

  if (fila.ConfirmoRecepcion !== 'TRUE') {
    await updateRow('Inscritos', fila._rowIndex, [
      fila.ID, fila.LeadId, fila.NombreEstudiante, fila.EmailEstudiante, fila.Curso, fila.Edicion,
      fila.FechaInscripcion, fila.AltaPlataforma, fila.AltaPorEmail, fila.AltaPorNombre, fila.FechaAlta,
      fila.BienvenidaEnviada, fila.BienvenidaPorEmail, fila.BienvenidaPorNombre, fila.FechaBienvenida,
      fila.AbonoTotalidad, fila.Docentes, 'TRUE', fila.GrupoWhatsApp
    ]);

    await registrarAccion(
      'estudiante', fila.NombreEstudiante,
      `Confirmó recepción del mail de ${NOMBRE_TIPO[body.tipo] || body.tipo || 'bienvenida'}`, '', fila.LeadId
    );

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_SENDER_EMAIL, pass: process.env.GMAIL_APP_PASSWORD }
      });
      await transporter.sendMail({
        from: `Instituto ILCE <${process.env.GMAIL_SENDER_EMAIL}>`,
        to: 'estudiantes@institutoilce.com',
        subject: `✅ ${fila.NombreEstudiante} confirmó recepción del mail`,
        html: `<p>${fila.NombreEstudiante} (${fila.Curso || 'sin curso'}) confirmó haber recibido el mail de ${NOMBRE_TIPO[body.tipo] || body.tipo}.</p>`
      });
    } catch (err) {
      // Si falla el aviso por mail, no importa — el check ya quedó guardado, que es lo esencial.
      console.error('Error avisando por mail la confirmación de recepción:', err);
    }
  }

  return NextResponse.json({ ok: true, nombre: fila.NombreEstudiante });
}
