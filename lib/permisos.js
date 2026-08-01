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
