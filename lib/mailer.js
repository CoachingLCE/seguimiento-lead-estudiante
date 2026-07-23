import nodemailer from 'nodemailer';

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_SENDER_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
}

export async function enviarMailContraseña(destinatarioEmail, nombre, password) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `Instituto ILCE <${process.env.GMAIL_SENDER_EMAIL}>`,
    to: destinatarioEmail,
    subject: 'Acceso a la app de gestión de leads — ILCE',
    text:
      `Hola ${nombre},\n\n` +
      `Ya tenés acceso a la app de gestión de leads del Instituto ILCE.\n\n` +
      `Usuario: ${destinatarioEmail}\n` +
      `Contraseña: ${password}\n\n` +
      `Por seguridad, te recomendamos no compartir esta contraseña.\n\n` +
      `Saludos,\nInstituto ILCE`
  });
}

export async function enviarMailBienvenidaEstudiante(destinatarioEmail, nombreEstudiante, curso) {
  const {
    PLATAFORMA_URL,
    PREGUNTAS_FRECUENTES_URL,
    CONTACTO_ESTUDIANTES_EMAIL,
    CONTACTO_ESTUDIANTES_TEL
  } = await import('./constants');

  const transporter = getTransporter();
  const html = `
  <div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 560px; margin: 0 auto; background:#ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: linear-gradient(135deg, #0f1f3d, #7c3aed); padding: 24px 28px;">
      <p style="color:#fff; font-size: 11px; letter-spacing: .08em; margin: 0 0 2px; opacity:.85;">INSTITUTO<br/><span style="font-size:18px; font-weight:700; letter-spacing:normal;">ILCE</span></p>
      <p style="color:#fff; font-size: 12px; margin: 4px 0 0; opacity:.85;">Instituto de Liderazgo, Coaching y Educación</p>
    </div>
    <div style="padding: 28px;">
      <p style="font-size: 17px; font-weight: 700; color:#111827; margin: 0 0 12px;">👋 Hola, ${nombreEstudiante}</p>
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 18px;">
        Desde el equipo académico de ILCE queremos darte la bienvenida a tu curso. Estamos muy contentos de acompañarte en este nuevo proceso de aprendizaje.
      </p>
      <p style="display:inline-block; font-size: 13px; font-weight:600; color:#0369a1; background:#eff6ff; border:1px solid #bfdbfe; border-radius: 999px; padding: 6px 16px; margin: 0 0 22px;">
        📘 ${curso}
      </p>
      <div style="margin-bottom: 24px;">
        <a href="${PLATAFORMA_URL}" style="display:block; text-align:center; background:#111827; color:#fff; text-decoration:none; font-size:14px; font-weight:600; padding: 12px; border-radius: 8px;">
          Ingresá a la plataforma →
        </a>
      </div>
      <p style="font-size: 12px; font-weight:700; letter-spacing:.04em; color:#111827; margin: 0 0 12px;">¿QUÉ ENCONTRARÁS EN LA PLATAFORMA?</p>
      <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 8px 0; font-size:13px; color:#374151; border-bottom:1px solid #f3f4f6;">🎬 Clases grabadas para ver a tu ritmo</td></tr>
        <tr><td style="padding: 8px 0; font-size:13px; color:#374151; border-bottom:1px solid #f3f4f6;">📄 Material complementario descargable</td></tr>
        <tr><td style="padding: 8px 0; font-size:13px; color:#374151;">✅ Actividades para aplicar lo aprendido</td></tr>
      </table>
      <p style="font-size: 13px; color:#374151; margin: 0 0 20px;">
        ¿Tenés dudas para empezar? Mirá los tutoriales que preparamos para vos → <a href="${PREGUNTAS_FRECUENTES_URL}" style="color:#0369a1;">Preguntas frecuentes</a>
      </p>
      <p style="font-size: 12px; font-weight:700; color:#111827; margin: 0 0 6px;">CONTACTO DEL EQUIPO</p>
      <p style="font-size: 13px; color:#374151; margin: 0 0 20px;">
        ✉️ ${CONTACTO_ESTUDIANTES_EMAIL} &nbsp;·&nbsp; 📱 ${CONTACTO_ESTUDIANTES_TEL}
      </p>
      <p style="font-size: 13px; color:#374151; margin: 0;">Un saludo cordial,<br/><b>Equipo Académico – Instituto ILCE</b></p>
    </div>
    <div style="background:#f9fafb; padding: 14px 28px; text-align:center;">
      <p style="font-size: 11px; color:#9ca3af; margin:0;">
        Recibís este email porque te inscribiste en ILCE. En los próximos días recibirás novedades e información del curso.
      </p>
    </div>
  </div>`;

  await transporter.sendMail({
    from: `Instituto ILCE <${process.env.GMAIL_SENDER_EMAIL}>`,
    to: destinatarioEmail,
    subject: `¡Bienvenido/a a ${curso}! — Instituto ILCE`,
    html
  });
}
