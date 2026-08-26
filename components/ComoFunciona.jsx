'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from '../lib/useSession';
import { APP_VERSION, APP_UPDATED_AT } from '../lib/version';

// Ayuda específica por pantalla — solo se muestra el bloque de la ruta actual.
const AYUDA_POR_RUTA = {
  '/nuevo-lead': {
    titulo: 'Nuevo lead',
    contenido: (
      <>
        <p>El curso es opcional — se puede dejar "sin definir" y completarlo después desde Seguimiento. También se puede marcar interés en varios cursos a la vez.</p>
        <p className="mt-2">Podés cargar varios contactos de una tanda con "+ Agregar otro contacto" — todos comparten el mismo curso y origen.</p>
        <p className="mt-2">💡 Si el primer mensaje dice algo como <span className="font-mono text-xs bg-bg px-1.5 py-0.5 rounded">🚀 Hola, quiero más información sobre...</span>, es el mensaje automático de un anuncio de Instagram — marcá el Origen como <b>Instagram</b>.</p>
      </>
    )
  },
  '/seguimiento': {
    titulo: 'Seguimiento — Lotes 0 a 5',
    contenido: (
      <ul className="list-disc list-inside space-y-0.5">
        <li><b>Lote 0</b>: lista simple de todos los leads recién ingresados.</li>
        <li><b>Lote 1</b>: se habilita a las 48hs.</li>
        <li><b>Lote 2</b>: solo si el Lote 1 no tuvo respuesta definitiva; vence a los 10 días de ese contacto.</li>
        <li><b>Lotes 3, 4 y 5</b>: al mes, 2 meses y 3 meses, "Sin asignación" hasta que un Coordinador/Admin lo asigne.</li>
        <li>Si marcás <b>"No le interesa"</b> o confirmás la venta, el lead desaparece de todos los lotes siguientes.</li>
      </ul>
    )
  },
  '/dashboard': {
    titulo: 'Dashboard',
    contenido: (
      <p>El panel "Necesita tu atención ahora" junta todo lo urgente (leads sin contactar, altas demoradas, bienvenidas pendientes) para resolverlo ahí mismo, sin tener que ir a cada pantalla por separado.</p>
    )
  },
  '/inscritos': {
    titulo: 'Estudiantes',
    contenido: (
      <p>Ya no se carga a mano: el estudiante aparece solo, 24hs después de la venta. La tarea acá es tildar "Alta en plataforma" y "Enviar bienvenida" — ambas quedan registradas con quién y cuándo se hicieron. Usá los filtros de Formación/Edición/Docente para encontrar rápido lo que buscás.</p>
    )
  },
  '/resumen-estudiantes': {
    titulo: 'Resumen de Estudiantes',
    contenido: <p>Altas y bienvenidas pendientes/de hoy, y actividad por usuario (Lourdes, Victoria, Sofía).</p>
  },
  '/resumen-diario': {
    titulo: 'Resumen diario',
    contenido: <p>Junta leads, contactos e inscritos de un día puntual, con botón de impresión para archivar o compartir.</p>
  },
  '/diplomas': {
    titulo: 'Diplomas',
    contenido: <p>Marcá acá qué estudiantes ya abonaron la totalidad de la cursada — eso es lo que habilita el diploma.</p>
  },
  '/reportes': {
    titulo: 'Reportes',
    contenido: <p>Filtrá por mes, Formación, Edición o Docente. Desde "Ver ficha" en cualquier fila accedés al historial completo de ese lead sin perder el filtro aplicado.</p>
  },
  '/buscador': {
    titulo: 'Buscador global',
    contenido: <p>Buscá por nombre, apellido, WhatsApp o email y abrí la ficha completa del alumno (venta, seguimiento, alta, bienvenida, historial). No incluye datos de campus/pagos externos — esa integración todavía no existe.</p>
  },
  '/auditoria': {
    titulo: 'Historial de acciones',
    contenido: <p>Registro permanente (nunca se borra) de cada acción importante: crear lead, vender, contactar, reasignar, alta, bienvenida, restablecer contraseña. Filtrá por usuario, fecha o palabra, exportá a Excel o imprimí.</p>
  },
  '/accesos': {
    titulo: 'Accesos',
    contenido: <p>La tabla de arriba te muestra qué ve cada rol. Desde acá das de alta usuarios nuevos y restablecés contraseñas — el nuevo usuario recibe su contraseña por mail.</p>
  }
};

export default function ComoFunciona() {
  const [abierto, setAbierto] = useState(false);
  const [verRoles, setVerRoles] = useState(false);
  const pathname = usePathname();
  const { usuario } = useSession();
  const esAdmin = usuario?.roles?.includes('Admin');

  const ayuda = AYUDA_POR_RUTA[pathname];
  if (!ayuda) return null; // pantalla sin ayuda específica cargada todavía

  return (
    <div className="max-w-5xl mx-auto px-6 pb-10 no-print">
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setAbierto(!abierto)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-textSec hover:text-text"
        >
          <span>❓ Ayuda: {ayuda.titulo}</span>
          <span className="text-textMuted">{abierto ? '▲ cerrar' : '▼ ver'}</span>
        </button>

        {abierto && (
          <div className="px-5 pb-5 text-sm text-textSec border-t border-border pt-4">
            {ayuda.contenido}

            <button onClick={() => setVerRoles(!verRoles)}
              className="text-accentTeal text-xs font-semibold mt-3">
              {verRoles ? '▲ Ocultar roles y permisos' : '▼ Ver quién puede ver qué (roles y permisos)'}
            </button>
            {verRoles && (
              <ul className="list-disc list-inside space-y-0.5 mt-2 text-xs">
                <li><b>Admin</b> (Diego): ve todo, maneja accesos, auditoría y diplomas.</li>
                <li><b>Coordinador</b> (Macarena, Jennifer): Nuevo lead, Dashboard, Seguimiento, Reportes, Estudiantes, Resumen diario.</li>
                <li><b>Inscripciones</b> (Jesabel, Alexander, Jennifer): Nuevo lead, Dashboard, Seguimiento. No ve Reportes.</li>
                <li><b>Estudiantes</b> (Lourdes, Victoria): solo la pantalla Estudiantes.</li>
                <li><b>CoordinadorEstudiantes</b> (Sofía): Estudiantes + Resumen de Estudiantes.</li>
              </ul>
            )}

            {esAdmin && (
              <div className="border-t border-border pt-3 mt-3">
                <p className="text-text font-semibold mb-1 text-xs">🔧 Info técnica (solo Admin)</p>
                <p className="text-xs text-textMuted">
                  v{APP_VERSION} · Actualizado {new Date(APP_UPDATED_AT + 'T00:00:00').toLocaleDateString('es-AR')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
