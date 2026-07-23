import { appendRow } from './sheets';

// Tab "Auditoria": Fecha, UsuarioEmail, UsuarioNombre, Accion, Detalle, LeadIdRelacionado
// Nunca se borra (a diferencia del modo prueba).
export async function registrarAccion(usuarioEmail, usuarioNombre, accion, detalle, leadIdRelacionado = '') {
  try {
    await appendRow('Auditoria', [
      new Date().toISOString(),
      usuarioEmail || '',
      usuarioNombre || '',
      accion,
      detalle || '',
      leadIdRelacionado || ''
    ]);
  } catch (err) {
    // Si falla el registro de auditoría, no debe romper la acción principal.
    console.error('Error registrando auditoría:', err);
  }
}
