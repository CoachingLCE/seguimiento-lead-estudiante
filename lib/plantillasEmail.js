// Plantillas de los mails automáticos — separadas de lib/mailer.js a propósito: este archivo
// NO importa nada de servidor (nodemailer, sheets, variables de entorno con credenciales), así
// que también se puede usar del lado del cliente para mostrar una vista previa real del mail en
// /emails ("Ver mail"), sin arriesgarse a exponer nada sensible ni a romper el build.
import { APP_URL } from './constants';

// Botón "Confirmar recepción" con los colores de ILCE — el link no necesita login, lo abre
// directamente el estudiante desde el mail. Marca el check en Estudiantes y avisa a estudiantes@.
export function botonConfirmarRecepcion(inscritoId, tipo) {
  if (!inscritoId) return '';
  const url = `${APP_URL}/confirmar-recepcion?id=${encodeURIComponent(inscritoId)}&tipo=${tipo}`;
  return `
      <div style="text-align:center; margin: 24px 0 8px;">
        <a href="${url}" style="display:inline-block; background: linear-gradient(135deg, #7c3aed, #c026d3); color:#fff; text-decoration:none; font-size:14px; font-weight:700; padding: 12px 28px; border-radius: 999px;">
          Confirmar recepción
        </a>
      </div>`;
}

export function textoCredenciales(nombre, destinatarioEmail, password) {
  return (
    `Hola ${nombre},\n\n` +
    `Ya tenés acceso a la app de gestión de leads del Instituto ILCE.\n\n` +
    `Usuario: ${destinatarioEmail}\n` +
    `Contraseña: ${password}\n\n` +
    `Por seguridad, te recomendamos no compartir esta contraseña.\n\n` +
    `Saludos,\nInstituto ILCE`
  );
}

export function htmlBienvenidaEstudiante(nombreEstudiante, curso, inscritoId) {
  const primerNombre = (nombreEstudiante || '').trim().split(' ')[0] || '';
  return `
  <div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 560px; margin: 0 auto; background:#ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: linear-gradient(135deg, #0f1f3d, #7c3aed); padding: 24px 28px;">
      <p style="color:#fff; font-size: 11px; letter-spacing: .08em; margin: 0 0 2px; opacity:.85;">INSTITUTO<br/><span style="font-size:18px; font-weight:700; letter-spacing:normal;">ILCE</span></p>
    </div>
    <div style="padding: 28px;">
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 16px;">
        ¡Hola${primerNombre ? `, ${primerNombre}` : ''}! ¿Cómo estás?
      </p>
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 16px;">
        Somos Lourdes y Victoria, del Departamento de Estudiantes de ILCE. Queremos darte la bienvenida y contarte que vamos a estar disponibles para acompañarte durante toda tu formación.
      </p>
      ${curso ? `
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 16px;">
        ¡Te damos la bienvenida a la formación de <strong style="color:#7c3aed;">${curso}</strong>! 🎉
      </p>` : ''}
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 20px;">
        Durante toda tu formación, vas a contar con el acompañamiento del Departamento de Estudiantes de ILCE.
      </p>
      <div style="background:#f5f3ff; border-radius:10px; padding: 18px 20px; margin: 0 0 20px;">
        <p style="font-size: 14px; color:#374151; font-weight:700; margin: 0 0 10px;">¿Qué sigue?</p>
        <ol style="font-size: 14px; color:#374151; line-height:1.7; margin: 0; padding-left: 20px;">
          <li>Recibirás tus accesos a la plataforma.</li>
          <li>Te incorporaremos al grupo de WhatsApp de tu formación.</li>
          <li>Podrás acceder a los materiales introductorios.</li>
          <li>El Departamento de Estudiantes estará disponible para acompañarte durante tu formación.</li>
        </ol>
      </div>
      ${botonConfirmarRecepcion(inscritoId, 'bienvenida')}
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 20px 0 10px;">
        Además, como ya sos parte de la comunidad ILCE, te invitamos a conocer nuestros espacios de encuentro:
      </p>
      <ul style="font-size: 14px; color:#374151; line-height:1.7; margin: 0 0 16px; padding-left: 20px;">
        <li><a href="https://whatsapp.com/channel/0029VaBfdccGOj9tAv5s1A0G" style="color:#0369a1;">Comunidad de WhatsApp</a></li>
        <li><a href="https://www.instagram.com/institutoilce/" style="color:#0369a1;">Instagram</a></li>
        <li><a href="https://ig.me/j/AbZL9qwGkmtAvLmy/" style="color:#0369a1;">Comunidad de Instagram</a></li>
      </ul>
      <div style="background:#f9fafb; border-radius:10px; padding: 18px 20px; margin: 0 0 20px;">
        <p style="font-size: 14px; color:#374151; font-weight:700; margin: 0 0 6px;">🎥 ¿Querés prepararte para el inicio?</p>
        <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 12px;">
          Te dejamos una serie de videos introductorios con información útil para comenzar tu formación.
        </p>
        <a href="https://www.coachingeducativolider.com/preguntas-frecuentes-estudiantes" style="display:inline-block; color:#7c3aed; text-decoration:none; font-weight:600; font-size:14px;">Ver videos introductorios →</a>
      </div>
      <div style="background:#f9fafb; border-radius:10px; padding: 18px 20px; margin: 0 0 20px;">
        <p style="font-size: 14px; color:#374151; font-weight:700; margin: 0 0 6px;">📖 Para ir metiéndote en tema</p>
        <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 12px;">
          Si querés empezar a familiarizarte con los temas de tu formación, en nuestro blog vas a encontrar contenidos sobre coaching, liderazgo, comunicación y desarrollo personal.
        </p>
        <a href="https://www.coachingeducativolider.com/blog" style="display:inline-block; color:#7c3aed; text-decoration:none; font-weight:600; font-size:14px;">Visitar el blog →</a>
      </div>
      <p style="font-size: 14px; color:#374151; margin: 0 0 24px;">Cualquier duda o consulta estamos a disposición.</p>
      <p style="font-size: 14px; color:#374151; margin: 28px 0 0;">¡Que tengas un lindo día!</p>
    </div>
    <div style="background:#f9fafb; padding: 14px 28px; text-align:center;">
      <p style="font-size: 11px; color:#9ca3af; margin:0;">Departamento de Estudiantes — Instituto ILCE</p>
    </div>
  </div>`;
}

export function htmlAltaPlataforma(nombreEstudiante, curso, edicion, inscritoId) {
  const formacion = edicion ? `${curso || ''} — Edición ${edicion}` : (curso || '');
  return `
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
}

// Mail de reactivación para gente que se dio de baja de un curso hace 85+ días. El botón
// "Información" no va directo a WhatsApp: pasa primero por nuestro propio link (marca que
// confirmó recepción) y desde ahí redirige a WhatsApp con el mensaje ya precargado.
export function htmlReactivacionBaja(nombreEstudiante, curso, leadId) {
  const primerNombre = (nombreEstudiante || '').trim().split(' ')[0] || '';
  const urlInformacion = `${APP_URL}/api/reactivacion-baja?id=${encodeURIComponent(leadId)}`;
  return `
  <div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 560px; margin: 0 auto; background:#ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: linear-gradient(135deg, #0f1f3d, #7c3aed); padding: 24px 28px;">
      <p style="color:#fff; font-size: 11px; letter-spacing: .08em; margin: 0 0 2px; opacity:.85;">INSTITUTO<br/><span style="font-size:18px; font-weight:700; letter-spacing:normal;">ILCE</span></p>
    </div>
    <div style="padding: 28px;">
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 16px;">
        Buenas${primerNombre ? `, ${primerNombre}` : ''}, ¿cómo estás?
      </p>
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 16px;">
        Te escribe Macarena, de ILCE. Sabemos que hace un tiempo te diste de baja de <strong style="color:#7c3aed;">${curso || 'nuestra formación'}</strong> y queríamos consultarte si actualmente tenés interés en retomar la cursada.
      </p>
      <p style="font-size: 14px; color:#374151; line-height:1.6; margin: 0 0 24px;">
        En caso de que así sea, te pedimos que nos confirmes y te enviaremos la información actualizada sobre valores, fechas y condiciones de inscripción.
      </p>
      <div style="text-align:center; margin: 0 0 8px;">
        <a href="${urlInformacion}" style="display:inline-block; background: linear-gradient(135deg, #7c3aed, #c026d3); color:#fff; text-decoration:none; font-size:15px; font-weight:700; padding: 14px 32px; border-radius: 999px;">
          Información
        </a>
      </div>
    </div>
    <div style="background:#f9fafb; padding: 14px 28px; text-align:center;">
      <p style="font-size: 11px; color:#9ca3af; margin:0;">Instituto ILCE</p>
    </div>
  </div>`;
}

// Mail semanal (viernes) con el resumen de "Sin confirmar recepción" — estudiantes a los que se
// les mandó Bienvenida o Alta en plataforma hace 48hs hábiles o más, sin confirmar todavía.
export function htmlResumenAlertas(alertas) {
  const filas = alertas.map((a) => `
    <tr>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px; color:#374151;">${a.nombre}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px; color:#374151;">${a.curso || '—'}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px; color:#374151;">${a.tipo}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px; color:#b45309;">${Math.floor(a.horasHabiles)}hs</td>
    </tr>`).join('');

  return `
  <div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; background:#ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: linear-gradient(135deg, #0f1f3d, #7c3aed); padding: 24px 28px;">
      <p style="color:#fff; font-size: 11px; letter-spacing: .08em; margin: 0 0 2px; opacity:.85;">INSTITUTO<br/><span style="font-size:18px; font-weight:700; letter-spacing:normal;">ILCE</span></p>
    </div>
    <div style="padding: 24px 28px;">
      <p style="font-size: 15px; font-weight:700; color:#111827; margin: 0 0 4px;">📩 Resumen semanal — Sin confirmar recepción</p>
      <p style="font-size: 13px; color:#6b7280; margin: 0 0 16px;">
        Estudiantes a los que se les envió Bienvenida o Alta en plataforma hace 48hs hábiles o más, sin confirmar todavía.
      </p>
      ${alertas.length === 0 ? `
        <p style="font-size: 14px; color:#059669; margin: 0;">✅ Sin alertas esta semana — todos confirmaron o todavía no pasaron las 48hs hábiles.</p>
      ` : `
        <table style="width:100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align:left;">
              <th style="padding:8px 12px; border-bottom:2px solid #e5e7eb; font-size:12px; color:#6b7280;">Estudiante</th>
              <th style="padding:8px 12px; border-bottom:2px solid #e5e7eb; font-size:12px; color:#6b7280;">Curso</th>
              <th style="padding:8px 12px; border-bottom:2px solid #e5e7eb; font-size:12px; color:#6b7280;">Sin confirmar</th>
              <th style="padding:8px 12px; border-bottom:2px solid #e5e7eb; font-size:12px; color:#6b7280;">Hace</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      `}
      <div style="text-align:center; margin: 24px 0 4px;">
        <a href="${APP_URL}/inscritos" style="display:inline-block; background: linear-gradient(135deg, #7c3aed, #c026d3); color:#fff; text-decoration:none; font-size:13px; font-weight:700; padding: 10px 24px; border-radius: 999px;">
          Ver en la app
        </a>
      </div>
    </div>
    <div style="background:#f9fafb; padding: 14px 28px; text-align:center;">
      <p style="font-size: 11px; color:#9ca3af; margin:0;">Instituto ILCE — resumen automático de los viernes</p>
    </div>
  </div>`;
}

// Mail semanal con el resumen de "Fichas enviadas" (misma lista que /fichas-enviadas): leads a
// los que se les mandó la ficha de inscripción y todavía no compraron, con hace cuánto.
export function htmlResumenFichasEnviadas(fichas) {
  const ahora = new Date();
  function dias(fecha) { return Math.floor((ahora - new Date(fecha)) / 86400000); }
  function colorDias(d) {
    if (d >= 7) return '#b91c1c';
    if (d >= 3) return '#b45309';
    return '#6b7280';
  }

  const filas = fichas.map((f) => {
    const d = dias(f.fecha);
    return `
    <tr>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px; color:#374151;">${f.nombre}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px; color:#374151;">${f.curso || '—'}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px; color:#374151;">${f.pais || '—'}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px; color:${colorDias(d)}; font-weight:600;">${d <= 0 ? 'Hoy' : `${d} día${d !== 1 ? 's' : ''}`}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px; color:#374151;">${f.enviadaPor || '—'}</td>
    </tr>`;
  }).join('');

  return `
  <div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 640px; margin: 0 auto; background:#ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: linear-gradient(135deg, #0f1f3d, #7c3aed); padding: 24px 28px;">
      <p style="color:#fff; font-size: 11px; letter-spacing: .08em; margin: 0 0 2px; opacity:.85;">INSTITUTO<br/><span style="font-size:18px; font-weight:700; letter-spacing:normal;">ILCE</span></p>
    </div>
    <div style="padding: 24px 28px;">
      <p style="font-size: 15px; font-weight:700; color:#111827; margin: 0 0 4px;">📄 Resumen semanal — Fichas enviadas</p>
      <p style="font-size: 13px; color:#6b7280; margin: 0 0 16px;">
        Estas son las fichas enviadas a estas personas en este tiempo y que aún no compraron.
      </p>
      ${fichas.length === 0 ? `
        <p style="font-size: 14px; color:#059669; margin: 0;">✅ No hay fichas enviadas pendientes de compra esta semana.</p>
      ` : `
        <table style="width:100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align:left;">
              <th style="padding:8px 12px; border-bottom:2px solid #e5e7eb; font-size:12px; color:#6b7280;">Lead</th>
              <th style="padding:8px 12px; border-bottom:2px solid #e5e7eb; font-size:12px; color:#6b7280;">Curso</th>
              <th style="padding:8px 12px; border-bottom:2px solid #e5e7eb; font-size:12px; color:#6b7280;">País</th>
              <th style="padding:8px 12px; border-bottom:2px solid #e5e7eb; font-size:12px; color:#6b7280;">Sin inscribirse</th>
              <th style="padding:8px 12px; border-bottom:2px solid #e5e7eb; font-size:12px; color:#6b7280;">Enviada por</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      `}
      <div style="text-align:center; margin: 24px 0 4px;">
        <a href="${APP_URL}/fichas-enviadas" style="display:inline-block; background: linear-gradient(135deg, #7c3aed, #c026d3); color:#fff; text-decoration:none; font-size:13px; font-weight:700; padding: 10px 24px; border-radius: 999px;">
          Ver en la app
        </a>
      </div>
    </div>
    <div style="background:#f9fafb; padding: 14px 28px; text-align:center;">
      <p style="font-size: 11px; color:#9ca3af; margin:0;">Instituto ILCE — resumen automático semanal</p>
    </div>
  </div>`;
}
