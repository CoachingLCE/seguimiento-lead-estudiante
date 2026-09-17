import { NextResponse } from 'next/server';
import { findUsuario, tienePermisoOperativo } from '../../../lib/auth';
import { obtenerFichasEnviadas } from '../../../lib/fichasEnviadas';

// GET /api/fichas-enviadas?solicitanteEmail=...
// Junta, de todos los lotes de Seguimiento, cada lead al que se le marcó "Ficha enviada" como
// resultado — con la fecha y quién la mandó. Si un mismo lead tiene más de una fila con ese
// resultado (ej: se le volvió a mandar en otro lote), se listan todas, más reciente primero.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const solicitante = await findUsuario(searchParams.get('solicitanteEmail'));
  if (!tienePermisoOperativo(solicitante)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const fichas = await obtenerFichasEnviadas();
    return NextResponse.json({ fichas });
  } catch (err) {
    console.error('Error cargando fichas enviadas:', err);
    return NextResponse.json({ error: 'Ocurrió un error cargando los datos.' }, { status: 500 });
  }
}
