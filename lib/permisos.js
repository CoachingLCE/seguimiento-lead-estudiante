// Funciones de permisos puras (reciben { roles: [...] }) — sin dependencias de servidor,
// para poder importarse tanto desde componentes cliente (Nav, páginas) como desde las API routes.

// Nuevo lead, Dashboard, Seguimiento: Admin, Coordinador o Inscripciones.
export function tienePermisoOperativo(usuario) {
  return !!usuario && usuario.roles?.some((r) => ['Admin', 'Coordinador', 'Inscripciones'].includes(r));
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
  return !!usuario && usuario.roles?.includes('Admin');
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
  return !!usuario && usuario.roles?.some((r) => ['Admin', 'Estudiantes', 'CoordinadorEstudiantes'].includes(r));
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
