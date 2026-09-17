import nodemailer from 'nodemailer';
import { appendRow } from './sheets';
import {
  textoCredenciales, htmlBienvenidaEstudiante, htmlAltaPlataforma, htmlReactivacionBaja, htmlResumenAlertas
} from './plantillasEmail';

// Registra cada envío en la hoja "Emails" (Fecha, Tipo, Para, Asunto, Estado, Detalle) — para
// tener trazabilidad de todos los mails automáticos del sistema. Si el registro en sí falla,
// nunca debe romper el envío del mail (por eso el try/catch silencioso).
async function logEmail(tipo, para, asunto, estado, detalle = '') {
  try {
    await appendRow('Emails', [new Date().toISOString(), tipo, para || '', asunto || '', estado, detalle]);
  } catch (err) {
    console.error('Error registrando el envío en la hoja Emails:', err);
  }
}

// Envuelve transporter.sendMail(...): manda el mail y registra "Enviado" o "Falló" — se usa en
// cada función de abajo en vez de llamar a sendMail directo.
async function enviarYRegistrar(transporter, tipo, options) {
  try {
    await transporter.sendMail(options);
    await logEmail(tipo, options.to, options.subject, 'Enviado');
  } catch (err) {
    await logEmail(tipo, options.to, options.subject, 'Falló', err?.message || '');
    throw err;
  }
}

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_SENDER_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
}

// Casilla separada para el mail de reactivación de bajas — se manda como "Info ILCE", distinto
// del remitente institucional habitual.
function getTransporterInfo() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.INFO_SENDER_EMAIL,
      pass: process.env.INFO_APP_PASSWORD
    }
  });
}

export async function enviarMailContraseña(destinatarioEmail, nombre, password) {
  const transporter = getTransporter();
  await enviarYRegistrar(transporter, 'Credenciales de acceso', {
    from: `Instituto ILCE <${process.env.GMAIL_SENDER_EMAIL}>`,
    to: destinatarioEmail,
    subject: 'Acceso a la app de gestión de leads — ILCE',
    text: textoCredenciales(nombre, destinatarioEmail, password)
  });
}

export async function enviarMailBienvenidaEstudiante(destinatarioEmail, nombreEstudiante, inscritoId, curso) {
  const transporter = getTransporter();
  await enviarYRegistrar(transporter, 'Confirmación inscripción (Bienvenida)', {
    from: `Instituto ILCE <${process.env.GMAIL_SENDER_EMAIL}>`,
    to: destinatarioEmail,
    cc: 'Departamento De Estudiantes <estudiantes@institutoilce.com>',
    subject: '¡Bienvenido/a a ILCE!',
    html: htmlBienvenidaEstudiante(nombreEstudiante, curso, inscritoId)
  });
}

export async function enviarMailAltaPlataforma(destinatarioEmail, nombreEstudiante, curso, edicion, inscritoId) {
  const transporter = getTransporter();
  await enviarYRegistrar(transporter, 'Alta en plataforma', {
    from: `Instituto ILCE <${process.env.GMAIL_SENDER_EMAIL}>`,
    to: destinatarioEmail,
    cc: 'Departamento De Estudiantes <estudiantes@institutoilce.com>',
    subject: `Ya tenés acceso a la plataforma — ${curso || 'ILCE'}`,
    html: htmlAltaPlataforma(nombreEstudiante, curso, edicion, inscritoId)
  });
}

// Mail de reactivación para gente que se dio de baja de un curso hace 85+ días. El botón
// "Información" no va directo a WhatsApp: pasa primero por nuestro propio link (marca que
// confirmó recepción) y desde ahí redirige a WhatsApp con el mensaje ya precargado.
export async function enviarMailReactivacionBaja(destinatarioEmail, nombreEstudiante, curso, leadId) {
  const transporter = getTransporterInfo();
  await enviarYRegistrar(transporter, 'Reactivación de baja', {
    from: `Info ILCE <${process.env.INFO_SENDER_EMAIL}>`,
    to: destinatarioEmail,
    subject: '¿Retomamos tu formación?',
    html: htmlReactivacionBaja(nombreEstudiante, curso, leadId)
  });
}

// Mail semanal (viernes) con el resumen de "Sin confirmar recepción" — estudiantes a los que se
// les mandó Bienvenida o Alta en plataforma hace 48hs hábiles o más, sin confirmar todavía.
export async function enviarMailResumenAlertas(destinatarios, alertas) {
  const transporter = getTransporter();
  await enviarYRegistrar(transporter, 'Resumen semanal (viernes)', {
    from: `Instituto ILCE <${process.env.GMAIL_SENDER_EMAIL}>`,
    to: destinatarios.join(', '),
    subject: `📩 Resumen semanal de alertas — ${alertas.length} sin confirmar`,
    html: htmlResumenAlertas(alertas)
  });
}
