import { readSheet } from './sheets';

export {
  tienePermisoOperativo,
  tienePermisoCrearLeads,
  tienePermisoReportes,
  tienePermisoEstudiantes,
  tienePermisoResumenEstudiantes,
  tienePermisoResumenDiario,
  tienePermisoDiplomas,
  tienePermisoAuditoria,
  tienePermisoBuscador,
  tienePermisoAccesos,
  tienePermisoBajas,
  tienePermisoAcademico,
  tienePermisoEditarLead,
  tienePermisoEditarVenta,
  tienePermisoEditarContactoEstudiante
} from './permisos';

// Busca el usuario en la hoja "Usuarios" (columnas: Email, Nombre, Roles, PasswordHash)
export async function findUsuario(email) {
  const usuarios = await readSheet('Usuarios');
  const match = usuarios.find(
    (u) => (u.Email || '').trim().toLowerCase() === (email || '').trim().toLowerCase()
  );
  if (!match) return null;
  return {
    email: match.Email,
    nombre: match.Nombre,
    roles: (match.Roles || '').split(',').map((r) => r.trim()).filter(Boolean),
    passwordHash: match.PasswordHash || '',
    activo: match.Activo !== 'FALSE', // si la columna no existe todavía, se considera activo
    _rowIndex: match._rowIndex
  };
}

export function tieneRol(usuario, rol) {
  return !!usuario && usuario.roles.includes(rol);
}
