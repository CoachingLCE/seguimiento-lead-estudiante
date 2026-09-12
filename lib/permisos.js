// Funciones de permisos puras (reciben { roles: [...] }) — sin dependencias de servidor,
// para poder importarse tanto desde componentes cliente (Nav, páginas) como desde las API routes.
import { EMAILS_INFORMES_RRSS } from './constants';

// Nuevo lead, Dashboard, Seguimiento: Admin, Coordinador o Inscripciones.
export function tienePermisoOperativo(usuario) {
  return !!usuario && usuario.roles?.some((r) => ['Admin', 'Coordinador', 'Inscripciones'].includes(r));
}

// Mensajes frecuentes: lo pueden VER y copiar todos los que tienen acceso al circuito comercial
// (mismo permiso que Seguimiento). Escribir/editar/borrar mensajes queda para Admin y Coordinador
// (ej: Macarena) — Inscripciones los usa pero no los administra.
export function tienePermisoMensajesVer(usuario) {
  return tienePermisoOperativo(usuario);
}
export function tienePermisoMensajesEscribir(usuario) {
  return !!usuario && usuario.roles?.some((r) => ['Admin', 'Coordinador'].includes(r));
}

// Crear leads: los mismos roles operativos, MÁS el rol Estudiantes (Lourdes, Victoria) — pueden
// sumar leads propios aunque no vean Dashboard/Seguimiento/Reportes.
export function tienePermisoCrearLeads(usuario) {
  return !!usuario && usuario.roles?.some((r) =>
    ['Admin', 'Coordinador', 'Inscripciones', 'Estudiantes'].includes(r)
  );
}

// Reportes: solo Admin y Coordinador (Inscripciones ya NO lo ve).
export function tienePermisoReportes(usuario) {
  return !!usuario && usuario.roles?.some((r) => ['Admin', 'Coordinador'].includes(r));
}

// Área de Estudiantes (tabla de inscritos, altas, bienvenidas): Admin, Coordinador,
// CoordinadorEstudiantes o Estudiantes.
export function tienePermisoEstudiantes(usuario) {
  return !!usuario && usuario.roles?.some((r) =>
    ['Admin', 'Coordinador', 'CoordinadorEstudiantes', 'Estudiantes'].includes(r)
  );
}

// Resumen del área de Estudiantes (altas/bienvenidas por usuario): Admin y CoordinadorEstudiantes.
export function tienePermisoResumenEstudiantes(usuario) {
  return !!usuario && usuario.roles?.some((r) => ['Admin', 'CoordinadorEstudiantes'].includes(r));
}

// Resumen diario comercial: Admin o Coordinador.
export function tienePermisoResumenDiario(usuario) {
  return !!usuario && usuario.roles?.some((r) => ['Admin', 'Coordinador'].includes(r));
}

// Diplomas (marcar "abonó la totalidad"): solo Admin.
export function tienePermisoDiplomas(usuario) {
  return !!usuario && usuario.roles?.includes('Admin');
}

// Historial de acciones (auditoría): solo Admin.
export function tienePermisoAuditoria(usuario) {
  return !!usuario && usuario.roles?.some((r) => ['Admin', 'Coordinador'].includes(r));
}

// Buscador global de alumnos: cualquier rol operativo, de estudiantes, o admin.
export function tienePermisoBuscador(usuario) {
  return !!usuario && usuario.roles?.some((r) =>
    ['Admin', 'Coordinador', 'Inscripciones', 'Estudiantes', 'CoordinadorEstudiantes'].includes(r)
  );
}

// Accesos (gestión de usuarios): solo Admin.
export function tienePermisoAccesos(usuario) {
  return !!usuario && usuario.roles?.includes('Admin');
}

// Bajas: quien puede registrar/gestionar bajas de la cursada — Admin y Coordinador
// (Diego, Jennifer, Macarena).
export function tienePermisoBajas(usuario) {
  return !!usuario && usuario.roles?.some((r) => ['Admin', 'Coordinador'].includes(r));
}

// Académico: listado de estudiantes con situación académica (certificado/baja/etc) y reportes
// por edición. Empieza como prototipo con un solo curso, se carga a mano — acceso para
// Diego (Admin), Lourdes y Victoria (Estudiantes), Sofía (CoordinadorEstudiantes).
export function tienePermisoAcademico(usuario) {
  return !!usuario && usuario.roles?.some((r) => ['Admin', 'Estudiantes', 'CoordinadorEstudiantes', 'Academico'].includes(r));
}

// Ver el listado de Académico queda abierto a cualquiera que esté logueado — solo cargar/editar
// (tienePermisoAcademico de arriba) sigue restringido a los roles de siempre.
export function tienePermisoAcademicoVer(usuario) {
  return !!usuario;
}

// Informes RRSS: rol propio (se suma a los que ya tenga la persona — ej: Jennifer sigue con
// Coordinador + Inscripciones, y además ComunicacionMKT para este módulo puntual).
// Solo estas 2 personas puntuales — no "todo Admin" (ver EMAILS_INFORMES_RRSS en constants.js).
export function tienePermisoInformesRRSS(usuario) {
  return !!usuario && EMAILS_INFORMES_RRSS.includes((usuario.email || '').trim().toLowerCase());
}

// Registro de mails automáticos: visible para quien coordina o administra — no es información
// operativa del día a día, así que no se le da a todos los roles.
export function tienePermisoEmails(usuario) {
  return !!usuario && usuario.roles?.some((r) => ['Admin', 'Coordinador', 'CoordinadorEstudiantes'].includes(r));
}

// Editar la ficha completa de un lead: Admin/Coordinador/Inscripciones siempre pueden.
// El rol Estudiantes (Lourdes, Victoria) solo puede editar un lead que ELLAS crearon
// y que todavía no fue reasignado a otra persona (asignadoAEmail vacío o es ella misma).
export function tienePermisoEditarLead(usuario, lead, asignadoAEmailActual) {
  if (!usuario || !lead) return false;
  if (usuario.roles?.some((r) => ['Admin', 'Coordinador', 'Inscripciones'].includes(r))) return true;
  if (usuario.roles?.includes('Estudiantes')) {
    const esCreadora = lead.CargadoPorEmail === usuario.email;
    const sinReasignar = !asignadoAEmailActual || asignadoAEmailActual === usuario.email;
    return esCreadora && sinReasignar;
  }
  return false;
}

// Permiso acotado: el rol Estudiantes (Lourdes, Victoria) puede corregir Nombre/Email/WhatsApp
// de alumnos ya inscriptos (Estado === "Comprado"), aunque no tenga el permiso general de editar
// la ficha completa — es parte de su trabajo diario de acompañamiento, no un dato comercial.
export function tienePermisoEditarContactoEstudiante(usuario, lead) {
  if (!usuario || !lead) return false;
  if (!usuario.roles?.includes('Estudiantes')) return false;
  return lead.Estado === 'Comprado';
}

// Editar los datos de una venta ya confirmada (monto, medio de pago, etc.): más restrictivo
// que editar la ficha en general, porque son datos financieros — solo Admin/Coordinador.
export function tienePermisoEditarVenta(usuario) {
  return !!usuario && usuario.roles?.some((r) => ['Admin', 'Coordinador'].includes(r));
}
