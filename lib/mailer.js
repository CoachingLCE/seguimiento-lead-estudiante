import nodemailer from 'nodemailer';
import { APP_URL } from './constants';

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_SENDER_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
}

// Botón "Confirmar recepción" con los colores de ILCE — el link no necesita login, lo abre
// directamente el estudiante desde el mail. Marca el check en Estudiantes y avisa a estudiantes@.
function botonConfirmarRecepcion(inscritoId, tipo) {
  if (!inscritoId) return '';
  const url = `${APP_URL}/confirmar-recepcion?id=${encodeURIComponent(inscritoId)}&tipo=${tipo}`;
  return `
      <div style="text-align:center; margin: 24px 0 8px;">
        <a href="${url}" style="display:inline-block; background: linear-gradient(135deg, #7c3aed, #c026d3); color:#fff; text-decoration:none; font-size:14px; font-weight:700; padding: 12px 28px; border-radius: 999px;">
          Confirmar recepción
        </a>
      </div>`;
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

export async function enviarMailBienvenidaEstudiante(destinatarioEmail, nombreEstudiante, inscritoId) {
  const transporter = getTransporter();
  const html = `
  <div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 560px; margin: 0 auto; background:#ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: linear-gradient(135deg, #0f1f3d, #7c3aed); padding: 24px 28px;">
      <p style="color:#fff; font-size: 11px; letter-spacing: .08em; margin: 0 0 2px; opacity:.85;">INSTITUTO<br/><span style="font-size:18px; font-weight:700; letter-spacing:normal;">ILCE</span></p>
    </div>
    <div style="padding: 28px;">
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 16px;">
        ¡Hola${nombreEstudiante ? `, ${nombreEstudiante}` : ''}! ¿Cómo estás? Somos Lourdes y Victoria del Departamento de Estudiantes de ILCE.
        Queremos darte la bienvenida al instituto, vamos a estar disponibles para acompañarte a lo largo de toda la formación.
      </p>
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 16px;">
        Queremos comentarte que más cerca de la fecha de inicio de la formación, vas a estar recibiendo los accesos a la plataforma
        y tendrás a disposición el grupo de WhatsApp.
      </p>
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 10px;">
        Además, como ya perteneces a nuestra comunidad, te quiero invitar a los otros espacios de ILCE:
      </p>
      <ul style="font-size: 14px; color:#374151; line-height:1.7; margin: 0 0 16px; padding-left: 20px;">
        <li><a href="https://whatsapp.com/channel/0029VaBfdccGOj9tAv5s1A0G" style="color:#0369a1;">Comunidad de WhatsApp</a></li>
        <li><a href="https://www.instagram.com/institutoilce/" style="color:#0369a1;">Instagram</a></li>
        <li><a href="https://ig.me/j/AbZL9qwGkmtAvLmy/" style="color:#0369a1;">Comunidad de Instagram</a></li>
      </ul>
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 16px;">
        Por último, te dejamos a disposición una serie de videos introductorios que te van a ser de ayuda para la previa del inicio:
        <a href="https://www.coachingeducativolider.com/preguntas-frecuentes-estudiantes" style="color:#0369a1;">coachingeducativolider.com/preguntas-frecuentes-estudiantes</a>
      </p>
      <p style="font-size: 14px; color:#374151; margin: 0 0 16px;">Cualquier duda o consulta estamos a disposición.</p>
      ${botonConfirmarRecepcion(inscritoId, 'bienvenida')}
      <p style="font-size: 14px; color:#374151; margin: 20px 0 20px;">PD: podrás confirmarnos respuesta de este correo a <a href="mailto:estudiantes@institutoilce.com" style="color:#0369a1;">estudiantes@institutoilce.com</a></p>
      <p style="font-size: 14px; color:#374151; margin: 0;">¡Que tengas un lindo día!</p>
    </div>
    <div style="background:#f9fafb; padding: 14px 28px; text-align:center;">
      <p style="font-size: 11px; color:#9ca3af; margin:0;">Departamento de Estudiantes — Instituto ILCE</p>
    </div>
  </div>`;

  await transporter.sendMail({
    from: `Instituto ILCE <${process.env.GMAIL_SENDER_EMAIL}>`,
    to: destinatarioEmail,
    cc: 'Departamento De Estudiantes <estudiantes@institutoilce.com>',
    subject: '¡Bienvenido/a a ILCE!',
    html
  });
}

export async function enviarMailAltaPlataforma(destinatarioEmail, nombreEstudiante, curso, edicion, inscritoId) {
  const transporter = getTransporter();
  const formacion = edicion ? `${curso || ''} — Edición ${edicion}` : (curso || '');
  const html = `
  <div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 560px; margin: 0 auto; background:#ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: linear-gradient(135deg, #0f1f3d, #7c3aed); padding: 24px 28px;">
      <p style="color:#fff; font-size: 11px; letter-spacing: .08em; margin: 0 0 2px; opacity:.85;">INSTITUTO<br/><span style="font-size:18px; font-weight:700; letter-spacing:normal;">ILCE</span></p>
    </div>
    <div style="padding: 28px;">
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 16px;">
        🙋🏻 ¡Hola${nombreEstudiante ? `, ${nombreEstudiante}` : ''}! ¿Cómo estás? Somos Lou y Vicky, formamos parte del Departamento de Estudiantes de ILCE. 🤩
      </p>
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 16px;">
        Queríamos darte la bienvenida al instituto y contarte que ya enviamos por mail el acceso a la plataforma para que
        ya puedas ir ingresando y viendo el contenido previo de la Formación ${formacion}!
      </p>
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 16px;">
        ✔️ Te compartimos los <a href="https://www.coachingeducativolider.com/preguntas-frecuentes-estudiantes" style="color:#0369a1;">Tutoriales ILCE</a> para que puedan
        acompañarte a lo largo de la formación por alguna consulta, para complementar nuestro acompañamiento.
      </p>
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 16px;">
        Pronto estaremos agregándote al grupo de estudio de WhatsApp y por ese medio recibirán toda la información que necesitan
        para el inicio de la cursada✨
      </p>
      <p style="font-size: 14px; color:#374151; margin: 0 0 16px;">Cualquier consulta estamos a disposición! 👍🏼📚</p>
      ${botonConfirmarRecepcion(inscritoId, 'alta')}
      <p style="font-size: 14px; color:#374151; margin: 20px 0 0;">PD: podrás confirmarnos respuesta de este correo a <a href="mailto:estudiantes@institutoilce.com" style="color:#0369a1;">estudiantes@institutoilce.com</a></p>
    </div>
    <div style="background:#f9fafb; padding: 14px 28px; text-align:center;">
      <p style="font-size: 11px; color:#9ca3af; margin:0;">Departamento de Estudiantes — Instituto ILCE</p>
    </div>
  </div>`;

  await transporter.sendMail({
    from: `Instituto ILCE <${process.env.GMAIL_SENDER_EMAIL}>`,
    to: destinatarioEmail,
    cc: 'Departamento De Estudiantes <estudiantes@institutoilce.com>',
    subject: `Ya tenés acceso a la plataforma — ${curso || 'ILCE'}`,
    html
  });
}
