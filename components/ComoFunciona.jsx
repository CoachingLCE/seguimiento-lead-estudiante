'use client';
import { useState } from 'react';
import { useSession } from '../lib/useSession';
import { APP_VERSION, APP_UPDATED_AT } from '../lib/version';

export default function ComoFunciona() {
  const [abierto, setAbierto] = useState(false);
  const { usuario } = useSession();
  const esAdmin = usuario?.roles?.includes('Admin');

  return (
    <div className="max-w-5xl mx-auto px-6 pb-10 no-print">
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setAbierto(!abierto)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-textSec hover:text-text"
        >
          <span>📖 Cómo funciona esta app</span>
          <span className="text-textMuted">{abierto ? '▲ cerrar' : '▼ ver'}</span>
        </button>

        {abierto && (
          <div className="px-5 pb-5 text-sm text-textSec space-y-4 border-t border-border pt-4">
            <div>
              <p className="text-text font-semibold mb-1">Roles</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><b>Admin</b> (Diego): ve todo, maneja accesos, auditoría y diplomas.</li>
                <li><b>Coordinador</b> (Macarena, Jennifer): Nuevo lead, Dashboard, Seguimiento, Reportes, Estudiantes, Resumen diario.</li>
                <li><b>Inscripciones</b> (Jesabel, Alexander, Jennifer): Nuevo lead, Dashboard, Seguimiento. No ve Reportes.</li>
                <li><b>Estudiantes</b> (Lourdes, Victoria): solo la pantalla Estudiantes.</li>
                <li><b>CoordinadorEstudiantes</b> (Sofía): Estudiantes + Resumen de Estudiantes.</li>
              </ul>
            </div>

            <div>
              <p className="text-text font-semibold mb-1">Nuevo lead</p>
              <p>El curso es opcional — se puede dejar "sin definir" y completarlo después. También se puede marcar interés en varios cursos a la vez.</p>
            </div>

            <div>
              <p className="text-text font-semibold mb-1">Seguimiento — Lotes 0 a 3</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><b>Lote 0</b>: lista simple de todos los leads recién ingresados.</li>
                <li><b>Lote 1</b>: se habilita a las 48hs. Se registra resultado, observaciones y próxima acción.</li>
                <li><b>Lote 2</b>: aparece solo si el Lote 1 no tuvo una respuesta definitiva; vence a los 10 días de ese contacto.</li>
                <li><b>Lote 3</b>: al mes, aparece "Sin asignación" hasta que un Coordinador/Admin lo asigna.</li>
              </ul>
            </div>

            <div>
              <p className="text-text font-semibold mb-1">Marcar como venta</p>
              <p>Además de medio de pago y modalidad, ahora pide el email del estudiante y la edición — esos datos viajan al estudiante que se genera solo 24hs después.</p>
            </div>

            <div>
              <p className="text-text font-semibold mb-1">Estudiantes</p>
              <p>Ya no se carga a mano: el estudiante aparece solo, 24hs después de la venta. La tarea acá es solo tildar "Alta en plataforma" y "Enviar bienvenida" — ambas quedan con quién y cuándo se hicieron.</p>
            </div>

            <div>
              <p className="text-text font-semibold mb-1">Resumen de Estudiantes</p>
              <p>Solo Sofía y Admin. Altas y bienvenidas pendientes/de hoy, y actividad por usuario (Lourdes, Victoria, Sofía).</p>
            </div>

            <div>
              <p className="text-text font-semibold mb-1">Resumen diario</p>
              <p>Solo Coordinador y Admin. Junta leads, contactos e inscritos de un día, con botón de impresión.</p>
            </div>

            <div>
              <p className="text-text font-semibold mb-1">Diplomas</p>
              <p>Solo Admin. Marca qué estudiantes ya abonaron la totalidad de la cursada.</p>
            </div>

            <div>
              <p className="text-text font-semibold mb-1">Buscador global 🔍</p>
              <p>Arriba a la derecha. Busca por nombre, apellido, WhatsApp o email y abre la ficha completa del alumno (venta, seguimiento, alta, bienvenida, historial). No incluye datos de campus/pagos externos — esa integración todavía no existe.</p>
            </div>

            <div>
              <p className="text-text font-semibold mb-1">Historial de acciones (Auditoría)</p>
              <p>Solo Admin. Registro permanente (no se borra nunca) de cada acción importante: crear lead, vender, contactar, reasignar, alta, bienvenida, restablecer contraseña. Filtra por usuario y fecha, exporta a Excel, se puede imprimir.</p>
            </div>

            <div>
              <p className="text-text font-semibold mb-1">Login</p>
              <p>Con email y contraseña. Los usuarios nuevos reciben su contraseña por mail (por defecto "Hola123"). Diego puede ver la contraseña actual de cualquiera en "Accesos" y restablecerla si hace falta.</p>
            </div>

            {esAdmin && (
              <div className="border-t border-border pt-4 mt-2">
                <p className="text-text font-semibold mb-2">🔧 Información técnica (solo Admin)</p>
                <p className="text-xs text-textMuted mb-1">Versión</p>
                <p className="mb-3">
                  v{APP_VERSION} · Actualizado {new Date(APP_UPDATED_AT + 'T00:00:00').toLocaleDateString('es-AR')}
                </p>
                <p className="text-xs text-textMuted mb-1">Notas de deploy</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Código en GitHub, deploy en Vercel, embebido en Wix.</li>
                  <li>Base de datos: Google Sheets (tabs Usuarios, Leads, Seguimiento, Inscritos, Auditoria).</li>
                  <li>2 crons diarios: limpiar-pruebas y generar-estudiantes.</li>
                  <li>⚠️ Pendiente: nombre nuevo de la app, link real de <code>PLATAFORMA_URL</code>, integración con campus/pagos para la ficha del buscador.</li>
                  <li>Detalle completo en el README del repo.</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
